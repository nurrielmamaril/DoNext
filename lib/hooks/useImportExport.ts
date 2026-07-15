"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ExportTaskRow, ImportRowResult } from "@/lib/utils/csv";
import type { BackupV1 } from "@/lib/utils/backup";
import type { Database } from "@/lib/types/database.types";

type SubtaskRow = Database["public"]["Tables"]["subtasks"]["Row"];

export function useExportTasksCSV() {
  const supabase = createClient();
  return useMutation({
    mutationFn: async (listId?: string): Promise<ExportTaskRow[]> => {
      let query = supabase.from("tasks").select("*, lists(name)").is("deleted_at", null);
      if (listId) query = query.eq("list_id", listId);
      const { data, error } = await query.order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((t) => ({
        title: t.title,
        description: t.description,
        listName: (t as unknown as { lists: { name: string } | null }).lists?.name ?? null,
        priority: t.priority,
        status: t.status,
        due_date: t.due_date,
        due_time: t.due_time,
        is_recurring: t.is_recurring,
        recurrence_rule: t.recurrence_rule,
        created_at: t.created_at,
        completed_at: t.completed_at,
      }));
    },
  });
}

export function useExportBackup() {
  const supabase = createClient();
  return useMutation({
    mutationFn: async (): Promise<BackupV1> => {
      const { data: lists, error: listsError } = await supabase
        .from("lists")
        .select("*")
        .order("position", { ascending: true });
      if (listsError) throw listsError;

      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*, lists(name)")
        .is("deleted_at", null)
        .order("position", { ascending: true });
      if (tasksError) throw tasksError;

      const taskIds = (tasks ?? []).map((t) => t.id);
      const { data: subtasks, error: subtasksError } = taskIds.length
        ? await supabase
            .from("subtasks")
            .select("*")
            .in("task_id", taskIds)
            .order("position", { ascending: true })
        : { data: [] as SubtaskRow[], error: null };
      if (subtasksError) throw subtasksError;

      const { data: notes, error: notesError } = await supabase
        .from("notes")
        .select("*, lists(name)")
        .order("position", { ascending: true });
      if (notesError) throw notesError;

      const subtasksByTask = new Map<string, SubtaskRow[]>();
      for (const s of subtasks ?? []) {
        const arr = subtasksByTask.get(s.task_id) ?? [];
        arr.push(s);
        subtasksByTask.set(s.task_id, arr);
      }

      return {
        version: 1,
        app: "donext",
        exportedAt: new Date().toISOString(),
        lists: (lists ?? []).map((l) => ({ name: l.name, color: l.color, position: l.position })),
        tasks: (tasks ?? []).map((t) => ({
          title: t.title,
          description: t.description,
          list: (t as unknown as { lists: { name: string } | null }).lists?.name ?? null,
          priority: t.priority,
          status: t.status,
          due_date: t.due_date,
          due_time: t.due_time,
          is_recurring: t.is_recurring,
          recurrence_rule: t.recurrence_rule,
          created_at: t.created_at,
          completed_at: t.completed_at,
          subtasks: (subtasksByTask.get(t.id) ?? []).map((s) => ({
            title: s.title,
            is_complete: s.is_complete,
            position: s.position,
          })),
        })),
        notes: (notes ?? []).map((n) => ({
          list: (n as unknown as { lists: { name: string } | null }).lists?.name ?? null,
          title: n.title,
          content: n.content,
          color: n.color,
          position: n.position,
        })),
      };
    },
  });
}

export function useImportTasks() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rows,
      targetListId,
    }: {
      rows: ImportRowResult[];
      /** When set, every row is imported into this list, ignoring the CSV's own "list" column. */
      targetListId?: string;
    }) => {
      const validRows = rows.filter((r) => r.rowStatus !== "error");
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const userId = userData.user.id;

      const nameToId = new Map<string, string>();
      let newListCount = 0;

      if (!targetListId) {
        const { data: existingLists, error: listsError } = await supabase
          .from("lists")
          .select("id, name, position");
        if (listsError) throw listsError;
        for (const l of existingLists ?? []) nameToId.set(l.name.toLowerCase(), l.id);

        const newListNames = Array.from(
          new Set(validRows.filter((r) => r.willCreateList && r.listName).map((r) => r.listName as string))
        );

        if (newListNames.length > 0) {
          const nextPosition = existingLists?.length ?? 0;
          const { data: createdLists, error: createListsError } = await supabase
            .from("lists")
            .insert(newListNames.map((name, i) => ({ user_id: userId, name, position: nextPosition + i })))
            .select("id, name");
          if (createListsError) throw createListsError;
          for (const l of createdLists ?? []) nameToId.set(l.name.toLowerCase(), l.id);
          newListCount = newListNames.length;
        }
      }

      const taskRows = validRows.map((r) => ({
        user_id: userId,
        list_id: targetListId ?? (r.listName ? (nameToId.get(r.listName.toLowerCase()) ?? null) : null),
        title: r.title,
        description: r.description,
        priority: r.priority,
        status: r.status,
        due_date: r.due_date,
        due_time: r.due_time,
        is_recurring: r.is_recurring,
        recurrence_rule: r.recurrence_rule,
      }));

      const { data: insertedTasks, error: insertError } = await supabase
        .from("tasks")
        .insert(taskRows)
        .select("id");
      if (insertError) throw insertError;

      return { createdLists: newListCount, createdTasks: insertedTasks?.length ?? 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}

export function useRestoreBackup() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (backup: BackupV1) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const userId = userData.user.id;

      const { data: existingLists, error: listsError } = await supabase
        .from("lists")
        .select("id, name, position");
      if (listsError) throw listsError;

      const nameToId = new Map<string, string>();
      for (const l of existingLists ?? []) nameToId.set(l.name.toLowerCase(), l.id);

      const allListNames = new Set<string>();
      for (const l of backup.lists) allListNames.add(l.name);
      for (const t of backup.tasks) if (t.list) allListNames.add(t.list);
      for (const n of backup.notes) if (n.list) allListNames.add(n.list);

      const toCreate = Array.from(allListNames).filter((name) => !nameToId.has(name.toLowerCase()));

      if (toCreate.length > 0) {
        const nextPosition = existingLists?.length ?? 0;
        const backupListMeta = new Map(backup.lists.map((l) => [l.name, l]));
        const { data: createdLists, error: createListsError } = await supabase
          .from("lists")
          .insert(
            toCreate.map((name, i) => ({
              user_id: userId,
              name,
              color: backupListMeta.get(name)?.color ?? null,
              position: nextPosition + i,
            }))
          )
          .select("id, name");
        if (createListsError) throw createListsError;
        for (const l of createdLists ?? []) nameToId.set(l.name.toLowerCase(), l.id);
      }

      let createdSubtasks = 0;
      if (backup.tasks.length > 0) {
        const taskRows = backup.tasks.map((t) => ({
          user_id: userId,
          list_id: t.list ? (nameToId.get(t.list.toLowerCase()) ?? null) : null,
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: t.status,
          due_date: t.due_date,
          due_time: t.due_time,
          is_recurring: t.is_recurring,
          recurrence_rule: t.recurrence_rule,
          created_at: t.created_at,
          completed_at: t.completed_at,
        }));
        const { data: insertedTasks, error: taskError } = await supabase
          .from("tasks")
          .insert(taskRows)
          .select("id");
        if (taskError) throw taskError;

        const subtaskRows = (insertedTasks ?? []).flatMap((row, i) =>
          backup.tasks[i].subtasks.map((s) => ({
            user_id: userId,
            task_id: row.id,
            title: s.title,
            is_complete: s.is_complete,
            position: s.position,
          }))
        );
        if (subtaskRows.length > 0) {
          const { error: subtaskError } = await supabase.from("subtasks").insert(subtaskRows);
          if (subtaskError) throw subtaskError;
          createdSubtasks = subtaskRows.length;
        }
      }

      if (backup.notes.length > 0) {
        const noteRows = backup.notes.map((n) => ({
          user_id: userId,
          list_id: n.list ? (nameToId.get(n.list.toLowerCase()) ?? null) : null,
          title: n.title,
          content: n.content,
          color: n.color,
          position: n.position,
        }));
        const { error: noteError } = await supabase.from("notes").insert(noteRows);
        if (noteError) throw noteError;
      }

      return {
        createdLists: toCreate.length,
        createdTasks: backup.tasks.length,
        createdSubtasks,
        createdNotes: backup.notes.length,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

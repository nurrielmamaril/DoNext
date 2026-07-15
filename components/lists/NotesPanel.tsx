"use client";

import { useMemo, useState } from "react";
import { NotebookPen, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NoteCard } from "@/components/lists/NoteCard";
import {
  useCreateNote,
  useNotesQuery,
  useReorderNotes,
  useBulkDeleteNotes,
} from "@/lib/hooks/useNotes";

interface NotesPanelProps {
  listId: string | null;
  title?: string;
  emptyMessage?: string;
}

export function NotesPanel({
  listId,
  title = "Notes",
  emptyMessage = "No notes yet. Add one to jot down anything about this client.",
}: NotesPanelProps) {
  const { data: notes, isLoading } = useNotesQuery(listId);
  const createNote = useCreateNote(listId);
  const reorderNotes = useReorderNotes(listId);
  const bulkDeleteNotes = useBulkDeleteNotes(listId);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const selectedCount = useMemo(
    () => (notes ?? []).filter((n) => selectedIds.has(n.id)).length,
    [notes, selectedIds]
  );

  async function handleNewNote() {
    try {
      await createNote.mutateAsync(notes?.length ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create note");
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !notes) return;
    const oldIndex = notes.findIndex((n) => n.id === active.id);
    const newIndex = notes.findIndex((n) => n.id === over.id);
    const reordered = arrayMove(notes, oldIndex, newIndex);
    reorderNotes.mutate(reordered.map((n, i) => ({ id: n.id, position: i })));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set((notes ?? []).map((n) => n.id)));
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    const ids = (notes ?? []).filter((n) => selectedIds.has(n.id)).map((n) => n.id);
    await bulkDeleteNotes.mutateAsync(ids);
    setBulkDeleteConfirmOpen(false);
    setSelectedIds(new Set());
    toast.success(`${ids.length} note${ids.length === 1 ? "" : "s"} deleted`);
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        {selectionMode ? (
          <>
            <span className="text-sm font-medium">{selectedCount} selected</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={selectAll}>
                Select all
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={selectedCount === 0}
                onClick={() => setBulkDeleteConfirmOpen(true)}
              >
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={exitSelectionMode}>
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-heading text-xl">{title}</h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectionMode(true)}>
                Select
              </Button>
              <Button size="sm" variant="outline" onClick={handleNewNote}>
                <Plus className="size-3.5" /> New note
              </Button>
            </div>
          </>
        )}
      </div>

      {isLoading && <p className="px-4 text-sm text-muted-foreground">Loading notes...</p>}

      {!isLoading && notes?.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border px-4 py-10 text-center">
          <NotebookPen className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={notes?.map((n) => n.id) ?? []} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {notes?.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                listId={listId}
                selectionMode={selectionMode}
                selected={selectedIds.has(note.id)}
                onToggleSelect={() => toggleSelect(note.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
        title={`Delete ${selectedCount} note${selectedCount === 1 ? "" : "s"}?`}
        description="This can't be undone."
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}

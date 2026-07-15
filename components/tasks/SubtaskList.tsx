"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useSubtasksQuery,
  useCreateSubtask,
  useToggleSubtask,
  useUpdateSubtaskTitle,
  useDeleteSubtask,
} from "@/lib/hooks/useSubtasks";

export function SubtaskList({ taskId }: { taskId: string }) {
  const { data: subtasks } = useSubtasksQuery(taskId);
  const createSubtask = useCreateSubtask(taskId);
  const toggleSubtask = useToggleSubtask(taskId);
  const updateTitle = useUpdateSubtaskTitle(taskId);
  const deleteSubtask = useDeleteSubtask(taskId);
  const [newTitle, setNewTitle] = useState("");

  const doneCount = subtasks?.filter((s) => s.is_complete).length ?? 0;

  async function handleAdd() {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setNewTitle("");
    try {
      await createSubtask.mutateAsync({ title: trimmed, position: subtasks?.length ?? 0 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add subtask");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSubtask.mutateAsync(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete subtask");
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Subtasks</span>
        {subtasks && subtasks.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {doneCount}/{subtasks.length}
          </span>
        )}
      </div>

      {subtasks && subtasks.length > 0 && (
        <ul className="space-y-1">
          {subtasks.map((subtask) => (
            <li key={subtask.id} className="group flex items-center gap-2">
              <Checkbox
                checked={subtask.is_complete}
                onCheckedChange={(checked) =>
                  toggleSubtask.mutate({ id: subtask.id, is_complete: Boolean(checked) })
                }
                aria-label={subtask.is_complete ? "Mark as not done" : "Mark as done"}
              />
              <Input
                defaultValue={subtask.title}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && value !== subtask.title) {
                    updateTitle.mutate({ id: subtask.id, title: value });
                  }
                }}
                className="h-auto flex-1 border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="shrink-0 opacity-0 group-hover:opacity-100"
                aria-label="Delete subtask"
                onClick={() => handleDelete(subtask.id)}
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Plus className="size-3.5 shrink-0 text-muted-foreground" />
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add a subtask..."
          className="h-auto flex-1 border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}

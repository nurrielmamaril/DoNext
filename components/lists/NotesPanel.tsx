"use client";

import { useMemo, useState } from "react";
import { ListChecks, NotebookPen, Plus } from "lucide-react";
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
import { NoteComposerDialog } from "@/components/lists/NoteComposerDialog";
import { useNotesQuery, useReorderNotes, useBulkDeleteNotes } from "@/lib/hooks/useNotes";

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
  const reorderNotes = useReorderNotes(listId);
  const bulkDeleteNotes = useBulkDeleteNotes(listId);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  // Remounts the composer on every opening so a new note always starts from a
  // blank editor rather than the last draft.
  const [composerKey, setComposerKey] = useState(0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const selectedCount = useMemo(
    () => (notes ?? []).filter((n) => selectedIds.has(n.id)).length,
    [notes, selectedIds]
  );

  function handleNewNote() {
    setComposerKey((k) => k + 1);
    setComposerOpen(true);
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
      {/* Same shape as the task list header: stacked on a phone with the
          controls sharing the width, the original row from md up. */}
      <div className="flex flex-col gap-2 px-4 pt-6 pb-3 md:flex-row md:items-center md:justify-between">
        {selectionMode ? (
          <>
            <span className="text-sm font-medium">{selectedCount} selected</span>
            <div className="flex flex-wrap items-center gap-2 *:flex-1 md:*:flex-none">
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
            {/* Same hierarchy as the task lists above: the filters and Select
                stay quiet, the one that adds something is the solid button. */}
            <div className="flex items-center gap-2 *:flex-1 md:*:flex-none">
              <Button
                size="sm"
                variant="outline"
                className="h-9 md:h-7"
                onClick={() => setSelectionMode(true)}
              >
                <ListChecks className="size-3.5" /> Select
              </Button>
              <Button size="sm" className="h-9 md:h-7" onClick={handleNewNote}>
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

      <NoteComposerDialog
        key={composerKey}
        open={composerOpen}
        onOpenChange={setComposerOpen}
        listId={listId}
        position={notes?.length ?? 0}
      />

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

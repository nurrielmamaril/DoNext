"use client";

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
import { NoteCard } from "@/components/lists/NoteCard";
import { useCreateNote, useNotesQuery, useReorderNotes } from "@/lib/hooks/useNotes";

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

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

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <h2 className="font-heading text-xl">{title}</h2>
        <Button size="sm" variant="outline" onClick={handleNewNote}>
          <Plus className="size-3.5" /> New note
        </Button>
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
            {notes?.map((note) => <NoteCard key={note.id} note={note} listId={listId} />)}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

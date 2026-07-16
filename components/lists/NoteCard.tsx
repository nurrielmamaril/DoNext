"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, Mail, Palette, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AttachmentList } from "@/components/attachments/AttachmentList";
import { SendEmailDialog } from "@/components/tasks/SendEmailDialog";
import { NoteEditor } from "@/components/lists/NoteEditor";
import { useUpdateNote, useDeleteNote } from "@/lib/hooks/useNotes";
import { useUploadAttachment } from "@/lib/hooks/useAttachments";
import { extractImageFromClipboard } from "@/lib/utils/clipboard";
import { noteColors, noteCardClass } from "@/lib/note-colors";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database.types";

const SAVE_DELAY_MS = 800;

type NoteRow = Database["public"]["Tables"]["notes"]["Row"];

interface NoteCardProps {
  note: NoteRow;
  listId: string | null;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function NoteCard({
  note,
  listId,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: NoteCardProps) {
  const [title, setTitle] = useState(note.title ?? "");
  const [content, setContent] = useState(note.content);
  const [expanded, setExpanded] = useState(!note.title && !note.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const updateNote = useUpdateNote(listId);
  const deleteNote = useDeleteNote(listId);
  const uploadAttachment = useUploadAttachment({ noteId: note.id });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    disabled: selectionMode,
  });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleImageFile(file: File) {
    if (!expanded) setExpanded(true);
    try {
      await uploadAttachment.mutateAsync(file);
      toast.success("Image pasted as attachment");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't paste image");
    }
  }

  async function handlePaste(e: React.ClipboardEvent) {
    const file = extractImageFromClipboard(e);
    if (!file) return;
    e.preventDefault();
    await handleImageFile(file);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function scheduleSave(nextTitle: string, nextContent: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updateNote.mutate({ id: note.id, title: nextTitle || null, content: nextContent });
    }, SAVE_DELAY_MS);
  }

  function handleColorChange(color: string) {
    updateNote.mutate({ id: note.id, color: color === "none" ? null : color });
  }

  async function handleDelete() {
    try {
      await deleteNote.mutateAsync(note.id);
      toast.success("Note deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete note");
    } finally {
      setConfirmDelete(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={cn("group rounded-lg border", noteCardClass(note.color))}
      onPaste={handlePaste}
    >
      <div className="flex items-center gap-1 px-2 py-1.5">
        {selectionMode ? (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect?.()}
            aria-label={selected ? "Deselect note" : "Select note"}
          />
        ) : (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-muted-foreground opacity-0 group-hover:opacity-100"
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-3.5" />
          </button>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          className="shrink-0 text-muted-foreground"
          aria-label={expanded ? "Collapse note" : "Expand note"}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </Button>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave(e.target.value, content);
          }}
          placeholder="Untitled"
          className="h-auto flex-1 border-none bg-transparent px-0 font-medium shadow-none focus-visible:ring-0"
        />
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100"
                aria-label="Note color"
              />
            }
          >
            <Palette className="size-3.5" />
          </PopoverTrigger>
          <PopoverContent className="w-auto flex-row gap-1.5 p-2">
            {Object.entries(noteColors).map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleColorChange(key)}
                aria-label={value.label}
                className={cn(
                  "size-6 rounded-full border-2",
                  value.swatch,
                  (note.color ?? "none") === key ? "border-foreground" : "border-transparent"
                )}
              />
            ))}
          </PopoverContent>
        </Popover>
        {!selectionMode && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100"
            aria-label="Send note via email"
            onClick={() => setSendEmailOpen(true)}
          >
            <Mail className="size-3.5" />
          </Button>
        )}
        {!selectionMode && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100"
            aria-label="Delete note"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
      {expanded && (
        <div className="space-y-2 border-t px-2 py-2">
          <NoteEditor
            content={content}
            onChange={(html) => {
              setContent(html);
              scheduleSave(title, html);
            }}
            onImagePaste={handleImageFile}
            placeholder="Write a note..."
          />
          <AttachmentList noteId={note.id} />
          <p className="px-1 text-xs text-muted-foreground">
            Tip: paste an image (Ctrl/Cmd+V) anywhere in this note to attach it.
          </p>
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this note?"
        description="This can't be undone."
        onConfirm={handleDelete}
      />
      <SendEmailDialog open={sendEmailOpen} onOpenChange={setSendEmailOpen} type="note" id={note.id} />
    </div>
  );
}

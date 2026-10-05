"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Palette } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { useCreateNote } from "@/lib/hooks/useNotes";
import { noteColors } from "@/lib/note-colors";
import { cn } from "@/lib/utils";

interface NoteComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string | null;
  position: number;
}

// An empty editor still returns "<p></p>", so markup alone doesn't mean there
// is anything to save.
function isBlank(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length === 0;
}

export function NoteComposerDialog({
  open,
  onOpenChange,
  listId,
  position,
}: NoteComposerDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("none");
  const createNote = useCreateNote(listId);

  const empty = title.trim().length === 0 && isBlank(content);

  async function handleSave() {
    if (empty) return;
    try {
      await createNote.mutateAsync({
        position,
        title: title.trim() || null,
        content,
        color: color === "none" ? null : color,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create note");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New note</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              autoFocus
              className="flex-1 font-medium"
            />
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 text-muted-foreground"
                    aria-label="Note color"
                  />
                }
              >
                <Palette className="size-4" />
              </PopoverTrigger>
              <PopoverContent className="w-auto flex-row gap-1.5 p-2">
                {Object.entries(noteColors).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setColor(key)}
                    aria-label={value.label}
                    className={cn(
                      "size-6 rounded-full border-2",
                      value.swatch,
                      color === key ? "border-foreground" : "border-transparent"
                    )}
                  />
                ))}
              </PopoverContent>
            </Popover>
          </div>
          <RichTextEditor content="" onChange={setContent} placeholder="Write a note..." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={empty || createNote.isPending}>
            {createNote.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

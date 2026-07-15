"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Paperclip,
  X,
  FileVideo,
  FileText,
  Download,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useAttachmentsQuery,
  useUploadAttachment,
  useDeleteAttachment,
} from "@/lib/hooks/useAttachments";
import type { Database } from "@/lib/types/database.types";

type AttachmentRow = Database["public"]["Tables"]["attachments"]["Row"];

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type AttachmentListProps = { taskId: string } | { noteId: string };

export function AttachmentList(props: AttachmentListProps) {
  const { data: attachments } = useAttachmentsQuery(props);
  const uploadAttachment = useUploadAttachment(props);
  const deleteAttachment = useDeleteAttachment(props);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState<AttachmentRow | null>(null);
  const [zoom, setZoom] = useState(1);

  function openPreview(attachment: AttachmentRow) {
    setPreviewing(attachment);
    setZoom(1);
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        await uploadAttachment.mutateAsync(file);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload file");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAttachment.mutateAsync(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete file");
    }
  }

  const isImage = previewing?.file_type?.startsWith("image/");
  const isVideo = previewing?.file_type?.startsWith("video/");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Attachments</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Paperclip className="size-3.5" /> {uploading ? "Uploading..." : "Attach file"}
        </Button>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handleFiles} />
      </div>

      {attachments && attachments.length > 0 && (
        <ul className="space-y-1.5">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
            >
              <button
                type="button"
                onClick={() => openPreview(a)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                {a.file_type?.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.file_url}
                    alt={a.file_name}
                    className="size-8 shrink-0 rounded object-cover"
                  />
                ) : (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded bg-muted">
                    {a.file_type?.startsWith("video/") ? (
                      <FileVideo className="size-4 text-muted-foreground" />
                    ) : (
                      <FileText className="size-4 text-muted-foreground" />
                    )}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate hover:underline">{a.file_name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatSize(a.file_size)}
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="shrink-0"
                onClick={() => handleDelete(a.id)}
                aria-label="Remove attachment"
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(previewing)} onOpenChange={(open) => !open && setPreviewing(null)}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{previewing?.file_name}</DialogTitle>
          </DialogHeader>

          {isImage && previewing && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM))}
                  disabled={zoom <= MIN_ZOOM}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="size-4" />
                </Button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="w-12 text-center text-xs text-muted-foreground hover:underline"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM))}
                  disabled={zoom >= MAX_ZOOM}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="size-4" />
                </Button>
              </div>
              <div className="max-h-[70vh] w-full overflow-auto rounded border bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewing.file_url}
                  alt={previewing.file_name}
                  style={{ transform: `scale(${zoom})` }}
                  className="mx-auto block max-h-[70vh] w-auto max-w-full origin-center object-contain transition-transform"
                />
              </div>
            </div>
          )}

          {isVideo && (
            <video
              src={previewing?.file_url}
              controls
              className="mx-auto max-h-[75vh] w-auto max-w-full rounded"
            />
          )}

          {previewing && !isImage && !isVideo && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <FileText className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No preview available for this file type.</p>
              <Button
                render={<a href={previewing.file_url} target="_blank" rel="noreferrer" />}
                nativeButton={false}
                size="sm"
                variant="outline"
              >
                <Download className="size-3.5" /> Open file
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

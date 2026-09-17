"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** The circular preview is the crop: what you see inside it is what is saved. */
const STAGE = 288;
/** Saved at this size, so the avatar stays sharp on a high-density screen. */
const OUTPUT = 512;
const MAX_ZOOM = 4;

interface LogoCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The image to start on — the current logo, or one just picked from disk. */
  initialSrc: string | null;
  saving?: boolean;
  onSave: (blob: Blob) => void | Promise<void>;
}

export function LogoCropDialog({ open, onOpenChange, initialSrc, saving, onSave }: LogoCropDialogProps) {
  const [src, setSrc] = useState<string | null>(initialSrc);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loadFailed, setLoadFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  // Object URLs made here, to release when they are replaced or the dialog closes.
  const ownedUrl = useRef<string | null>(null);

  // Reopening starts fresh. Adjusted during render rather than in an effect,
  // which would render once with the previous image still on screen.
  const [openedWith, setOpenedWith] = useState<{ open: boolean; src: string | null }>({
    open,
    src: initialSrc,
  });
  if (open !== openedWith.open || initialSrc !== openedWith.src) {
    setOpenedWith({ open, src: initialSrc });
    if (open) {
      setSrc(initialSrc);
      setNatural(null);
      setLoadFailed(false);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }

  useEffect(() => {
    return () => {
      if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current);
    };
  }, []);

  /** Scale at which the image exactly covers the circle; zoom multiplies it. */
  const baseScale = natural ? Math.max(STAGE / natural.w, STAGE / natural.h) : 1;
  const drawnW = natural ? natural.w * baseScale * zoom : 0;
  const drawnH = natural ? natural.h * baseScale * zoom : 0;

  /**
   * Never lets an edge come inside the circle — there is no such thing as a
   * half-filled avatar, so the image always covers it. Takes the drawn size
   * because zooming changes it in the same update that re-clamps.
   */
  const clamp = useCallback(
    (next: { x: number; y: number }, w = drawnW, h = drawnH) => ({
      x: Math.min(0, Math.max(STAGE - w, next.x)),
      y: Math.min(0, Math.max(STAGE - h, next.y)),
    }),
    [drawnW, drawnH]
  );

  function handleZoom(next: number) {
    setZoom(next);
    if (!natural) return;
    // Zoom about the centre of the circle, so the middle of what you are
    // looking at stays put instead of drifting towards a corner.
    const scale = next / zoom;
    setOffset((current) =>
      clamp(
        {
          x: STAGE / 2 - (STAGE / 2 - current.x) * scale,
          y: STAGE / 2 - (STAGE / 2 - current.y) * scale,
        },
        natural.w * baseScale * next,
        natural.h * baseScale * next
      )
    );
  }

  function handleLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNatural({ w, h });
    const scale = Math.max(STAGE / w, STAGE / h);
    // Start centred.
    setOffset({ x: (STAGE - w * scale) / 2, y: (STAGE - h * scale) / 2 });
    setLoadFailed(false);
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current);
    const url = URL.createObjectURL(file);
    ownedUrl.current = url;
    setNatural(null);
    setLoadFailed(false);
    setZoom(1);
    setSrc(url);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!natural) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const d = drag.current;
    setOffset(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }));
  }

  function onPointerUp(e: React.PointerEvent) {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  async function save() {
    const img = imgRef.current;
    if (!img || !natural) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // The stage is a window onto the scaled image; the canvas is that same
    // window, just OUTPUT/STAGE times bigger.
    const k = OUTPUT / STAGE;
    ctx.drawImage(img, offset.x * k, offset.y * k, drawnW * k, drawnH * k);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob) await onSave(blob);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Position the logo</DialogTitle>
          <DialogDescription>
            Drag the image to move it, and use the slider to zoom. Whatever fills the circle is what
            gets saved.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            className="relative touch-none overflow-hidden rounded-full border bg-muted"
            style={{ width: STAGE, height: STAGE, cursor: natural ? "grab" : "default" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {src && !loadFailed && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                ref={imgRef}
                src={src}
                alt=""
                // Needed to read the pixels back out of the canvas for an image
                // already stored on Supabase, which is a different origin.
                crossOrigin="anonymous"
                draggable={false}
                onLoad={handleLoad}
                onError={() => setLoadFailed(true)}
                className="max-w-none origin-top-left select-none"
                style={{
                  width: drawnW || undefined,
                  height: drawnH || undefined,
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                  visibility: natural ? "visible" : "hidden",
                }}
              />
            )}
            {(!src || loadFailed) && (
              <div className="flex size-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                {loadFailed ? "That image couldn't be loaded." : "Choose an image to get started."}
              </div>
            )}
          </div>

          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!natural}
            onChange={(e) => handleZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="w-full max-w-72 accent-primary disabled:opacity-50"
          />

          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="size-4" />
            {src ? "Choose a different image" : "Choose image"}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={!natural || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

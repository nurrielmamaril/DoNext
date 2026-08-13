"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, Locate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGardenData } from "@/lib/hooks/useGarden";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { VineGarden } from "@/components/garden/VineGarden";

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export function VineGardenCanvas() {
  const { plots, isLoading } = useGardenData();
  const isMobile = useIsMobile();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // The frame layout draws in real pixels, so it needs the box's actual size —
  // otherwise the canvas is letterboxed inside the container and the "edge"
  // vines float in the middle instead of touching the sides.
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 375, h: 420 });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      // setState lives in the observer callback, not the effect body, so this
      // is a subscription rather than a cascading render.
      setBox({ w: Math.max(1, Math.round(rect.width)), h: Math.max(1, Math.round(rect.height)) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [offset.x, offset.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset({ x: d.originX + (e.clientX - d.startX), y: d.originY + (e.clientY - d.startY) });
  }, []);

  const endDrag = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    setDragging(false);
    if ((e.currentTarget as HTMLElement).hasPointerCapture?.(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, []);

  const zoomBy = useCallback((delta: number) => {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((z + delta).toFixed(2)))));
  }, []);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  if (isLoading || plots.length === 0) return null;

  return (
    <>
      <div
        ref={boxRef}
        className={dragging ? "absolute inset-0 cursor-grabbing" : "absolute inset-0 cursor-grab"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Fills the whole area; pan/zoom ride on top via the transform. */}
        <div
          className="garden-fit absolute inset-0"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(calc(var(--garden-fit, 1) * ${zoom}))`,
            transformOrigin: "bottom center",
          }}
        >
          <VineGarden
            plots={plots}
            layout={isMobile ? "frame" : "row"}
            containerWidth={box.w}
            containerHeight={box.h}
          />
        </div>
      </div>

      <div className="safe-offset-bottom pointer-events-auto absolute right-4 z-20 flex flex-col gap-1">
        <Button
          variant="outline"
          size="icon-xs"
          aria-label="Zoom in"
          onClick={() => zoomBy(ZOOM_STEP)}
          className="bg-background/90 shadow backdrop-blur-sm"
        >
          <Plus className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          aria-label="Zoom out"
          onClick={() => zoomBy(-ZOOM_STEP)}
          className="bg-background/90 shadow backdrop-blur-sm"
        >
          <Minus className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          aria-label="Reset view"
          onClick={reset}
          className="bg-background/90 shadow backdrop-blur-sm"
        >
          <Locate className="size-3.5" />
        </Button>
      </div>
    </>
  );
}

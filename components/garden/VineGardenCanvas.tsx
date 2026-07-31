"use client";

import { useCallback, useRef, useState } from "react";
import { Minus, Plus, Locate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGardenData } from "@/lib/hooks/useGarden";
import { VineGarden } from "@/components/garden/VineGarden";
import { vineHeight } from "@/lib/utils/vine";

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

// Geometry units -> pixels at zoom 1. Combined with the minimum below, small
// gardens still read big and bold instead of a few tiny scratches.
const PX_PER_UNIT = 3.4;
const MIN_HEIGHT_VH = 0.62;

export function VineGardenCanvas() {
  const { plots, isLoading } = useGardenData();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const tallestUnits = plots.length ? Math.max(...plots.map((p) => vineHeight(p.completedCount))) : 0;
  const viewportH = typeof window === "undefined" ? 800 : window.innerHeight;
  const drawHeight = Math.max(viewportH * MIN_HEIGHT_VH, tallestUnits * PX_PER_UNIT);

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
        className={dragging ? "absolute inset-0 cursor-grabbing" : "absolute inset-0 cursor-grab"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Anchored to the bottom edge; the stems are drawn past it and get
            clipped, so there's no empty strip under the vines. */}
        <div
          className="absolute bottom-0 left-1/2 origin-bottom"
          style={{
            height: drawHeight,
            transform: `translateX(-50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "bottom center",
          }}
        >
          <VineGarden plots={plots} />
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-4 right-4 z-20 flex flex-col gap-1">
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

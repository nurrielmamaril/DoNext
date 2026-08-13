"use client";

import { useMemo } from "react";
import type { VinePlot } from "@/lib/hooks/useGarden";
import {
  buildVine,
  girthFactor,
  podHatch,
  seedFromId,
  vineHeight,
  COLUMN_WIDTH,
  TOP_PADDING,
} from "@/lib/utils/vine";

// How far the stems continue *below* the bottom of the viewBox. The stems get
// clipped there, so the vines read as rooted somewhere off-screen rather than
// sitting on a visible floor with empty space beneath them.
const BOTTOM_OVERSHOOT = 40;

export type GardenLayout = "row" | "frame";

interface VineGardenProps {
  plots: VinePlot[];
  /**
   * "row" lines the vines up along the bottom (wide screens). "frame" roots
   * them on the left, right and bottom edges growing inward, which fits every
   * category into a single portrait phone screen.
   */
  layout?: GardenLayout;
  /**
   * Frame layout only: the pixel size of the box this SVG fills. The viewBox
   * is set to match it exactly (1 unit = 1px) so the drawing's edges *are* the
   * container's edges — otherwise preserveAspectRatio letterboxes the canvas
   * and the "edge" vines end up floating in the middle.
   */
  containerWidth?: number;
  containerHeight?: number;
}

type Edge = "bottom" | "left" | "right";
const EDGE_ORDER: Edge[] = ["left", "right", "bottom"];

// Rotating a vine about its own base is what lets the same "grows upward"
// geometry sprout from a side edge instead. SVG rotation is clockwise, so
// +90 turns "up" into "right" (left edge) and -90 into "left" (right edge).
const EDGE_ANGLE: Record<Edge, number> = { bottom: 0, left: 90, right: -90 };

export function VineGarden({
  plots,
  layout = "row",
  containerWidth = 375,
  containerHeight = 420,
}: VineGardenProps) {
  const scene = useMemo(() => {
    const tallest = plots.length
      ? Math.max(...plots.map((p) => vineHeight(p.completedCount)))
      : vineHeight(0);

    if (layout === "frame") {
      // 1 unit = 1 px, matching the container exactly, so the vines really do
      // root on the container's own left, right and bottom edges.
      const width = containerWidth;
      const height = containerHeight;

      // Spread categories around the three edges, cycling so they alternate.
      const byEdge: Record<Edge, number[]> = { bottom: [], left: [], right: [] };
      plots.forEach((_, i) => byEdge[EDGE_ORDER[i % EDGE_ORDER.length]].push(i));

      const vines = plots.map((plot) => ({ plot }) as never) as Array<{
        plot: VinePlot;
        cx: number;
        baseY: number;
        angle: number;
        vineScale: number;
        geometry: ReturnType<typeof buildVine>;
        labelX: number;
        labelY: number;
        labelAnchor: "start" | "middle" | "end";
      }>;

      (Object.keys(byEdge) as Edge[]).forEach((edge) => {
        const indices = byEdge[edge];
        indices.forEach((plotIndex, k) => {
          // Even slots along the edge, inset from the corners so neighbours
          // (and the labels beside them) each get their own band of space.
          const t = (k + 1) / (indices.length + 1);
          const angle = EDGE_ANGLE[edge];
          let cx: number;
          let baseY: number;
          if (edge === "bottom") {
            cx = width * (0.18 + 0.64 * t);
            baseY = height + BOTTOM_OVERSHOOT;
          } else if (edge === "left") {
            cx = -BOTTOM_OVERSHOOT;
            baseY = height * (0.16 + 0.68 * t);
          } else {
            cx = width + BOTTOM_OVERSHOOT;
            baseY = height * (0.16 + 0.68 * t);
          }

          const plot = plots[plotIndex];
          const geometry = buildVine(plot.completedCount, cx, baseY, seedFromId(plot.listId));

          // Vines grow without limit, so on a small screen a long one would
          // eventually reach across and tangle with the vine opposite. Cap how
          // far into the frame any single vine may reach.
          const maxReach = edge === "bottom" ? height * 0.55 : width * 0.46;
          const vineScale = Math.min(1, maxReach / Math.max(1, geometry.height));

          // Labels are pinned relative to the vine's *root* on its edge, not
          // its tip — the tip moves as the vine grows, which made the labels
          // wander. This keeps them in predictable places.
          let labelX: number;
          let labelY: number;
          let labelAnchor: "start" | "middle" | "end";
          if (edge === "bottom") {
            labelX = cx;
            labelY = height - 16;
            labelAnchor = "middle";
          } else if (edge === "left") {
            labelX = 12;
            labelY = baseY;
            labelAnchor = "start";
          } else {
            labelX = width - 12;
            labelY = baseY;
            labelAnchor = "end";
          }

          vines[plotIndex] = { plot, cx, baseY, angle, vineScale, geometry, labelX, labelY, labelAnchor };
        });
      });

      return { width, height, vines, layout };
    }

    // Columns widen with the heftiest vine so neighbours never grow into
    // each other as they fill out.
    const maxGirth = plots.length ? Math.max(...plots.map((p) => girthFactor(p.completedCount))) : 1;
    const columnWidth = COLUMN_WIDTH * maxGirth;
    const width = Math.max(1, plots.length) * columnWidth;
    const height = Math.round(tallest + TOP_PADDING - BOTTOM_OVERSHOOT);
    const baseY = height + BOTTOM_OVERSHOOT; // below the visible edge

    const vines = plots.map((plot, i) => {
      const cx = i * columnWidth + columnWidth / 2;
      const geometry = buildVine(plot.completedCount, cx, baseY, seedFromId(plot.listId));
      return {
        plot,
        cx,
        baseY,
        angle: 0,
        vineScale: 1,
        geometry,
        labelX: cx + 12 * geometry.girth,
        labelY: baseY - geometry.height,
        labelAnchor: "start" as const,
      };
    });

    return { width, height, vines, layout };
  }, [plots, layout, containerWidth, containerHeight]);

  return (
    <svg
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Ink drawing: one climbing vine per category. ${plots
        .map((p) => `${p.name}, ${p.completedCount} completed`)
        .join("; ")}`}
      // "meet" fits the whole drawing inside the view, never cropped. Row
      // layout anchors to the bottom (vines line the bottom edge, cards sit in
      // the space above); frame layout centres, since vines come in from all
      // three edges.
      preserveAspectRatio={scene.layout === "frame" ? "xMidYMid meet" : "xMidYMax meet"}
      className="absolute inset-0 block h-full w-full"
    >
      {scene.vines.map(({ plot, cx, baseY, angle, vineScale, geometry, labelX, labelY, labelAnchor }, i) => {
        // Deliberately non-harmonic periods per vine, so the garden never
        // falls into a synchronised rhythm.
        const swayDuration = 4.3 + i * 1.1;
        const flutterDuration = 1.9 + i * 0.31;
        const amplitude = 5.2 + (i % 3) * 1.1;
        const drift = 4 + (i % 2) * 2;
        const flutterAmplitude = 1.5 + (i % 2) * 0.6;
        const isFrame = scene.layout === "frame";
        // Frame labels are one fixed size for every vine, so the set reads as
        // a tidy legend rather than text that grows with each plant.
        const nameSize = isFrame ? 11 : 9 * geometry.girth;
        const countSize = isFrame ? 9.5 : 8 * geometry.girth;

        // Edge placement, then an optional shrink about the same root point so
        // a long vine can't reach across the frame into its neighbour.
        const placement = [
          angle ? `rotate(${angle} ${cx} ${baseY})` : "",
          vineScale < 1
            ? `translate(${cx} ${baseY}) scale(${vineScale.toFixed(3)}) translate(${-cx} ${-baseY})`
            : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <g key={plot.listId}>
          {/* This inner group carries the edge placement as an SVG attribute
              transform; the sway/flutter animations use CSS transforms on the
              groups below, which would otherwise overwrite it. Labels are
              siblings of this group so they never rotate with the vine. */}
          <g transform={placement || undefined}>
          <g
            className="vine-sway"
            style={
              {
                transformOrigin: `${cx}px ${baseY}px`,
                "--vine-duration": `${swayDuration}s`,
                "--vine-delay": `${-i * 1.7}s`,
                "--vine-amplitude": `${amplitude}deg`,
                "--vine-drift": `${drift}px`,
              } as React.CSSProperties
            }
          >
            <g
              className="vine-flutter"
              style={
                {
                  transformOrigin: `${cx}px ${baseY}px`,
                  "--vine-flutter-duration": `${flutterDuration}s`,
                  "--vine-flutter-delay": `${-i * 0.8}s`,
                  "--vine-flutter-amplitude": `${flutterAmplitude}deg`,
                } as React.CSSProperties
              }
            >
            {/* Strokes thicken with the vine, so a mature one reads as a
                heavier pen line rather than the same hairline stretched. */}
            <g fill="none" className="stroke-foreground" strokeLinecap="round" strokeLinejoin="round">
              <path d={geometry.stem} strokeWidth={2.6 * geometry.girth} />
              <path d={geometry.stemHighlight} strokeWidth={0.8 * geometry.girth} opacity="0.4" />
              {geometry.branches.map((d, bi) => (
                <path key={`b${bi}`} d={d} strokeWidth={1.6 * geometry.girth} />
              ))}
              {geometry.leaves.map((d, li) => (
                <path key={`l${li}`} d={d} strokeWidth={1.4 * geometry.girth} />
              ))}
              {geometry.pods.map((pod, pi) => (
                <g key={`p${pi}`}>
                  <circle cx={pod.x} cy={pod.y} r={pod.r} strokeWidth={1.5 * geometry.girth} />
                  <path
                    d={podHatch(pod.x, pod.y, pod.r)}
                    strokeWidth={0.5 * geometry.girth}
                    opacity="0.65"
                  />
                </g>
              ))}
              <path d={geometry.bud} strokeWidth={1.6 * geometry.girth} />
            </g>
            </g>
          </g>
          </g>

            {/* Labels sit outside the rotated group, so a vine growing in from
                a side edge still gets horizontal, readable text. In frame
                layout they're pinned to the vine's edge at a fixed size, so
                every label lines up instead of drifting with the tip. */}
            <text
              x={isFrame ? labelX : labelX + (labelAnchor === "end" ? -6 : 6) * geometry.girth}
              y={isFrame ? labelY - 5 : labelY - 4 * geometry.girth}
              textAnchor={labelAnchor}
              fontSize={nameSize}
              fontWeight="600"
              className="fill-foreground"
            >
              {plot.name}
            </text>
            <text
              x={isFrame ? labelX : labelX + (labelAnchor === "end" ? -6 : 6) * geometry.girth}
              y={isFrame ? labelY + 8 : labelY + 7 * geometry.girth}
              textAnchor={labelAnchor}
              fontSize={countSize}
              className="fill-muted-foreground"
            >
              {plot.completedCount} done
            </text>
          </g>
        );
      })}
    </svg>
  );
}

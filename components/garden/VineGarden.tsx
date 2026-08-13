"use client";

import { useMemo } from "react";
import type { VinePlot } from "@/lib/hooks/useGarden";
import {
  buildVine,
  girthFactor,
  podHatch,
  seedFromId,
  vineHalfWidth,
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
   * "row" lines the vines up along the bottom at full size, letting the SVG
   * grow as wide as it needs (wide screens). "frame" fits the same bottom row
   * into the container exactly, shrinking the vines as far as it takes so a
   * phone shows every category at once with nothing to scroll.
   */
  layout?: GardenLayout;
  /**
   * Frame layout only: the pixel size of the box this SVG fills. The viewBox
   * is set to match it exactly (1 unit = 1px) so the drawing's edges *are* the
   * container's edges — otherwise preserveAspectRatio letterboxes the canvas
   * and the row ends up floating in the middle.
   */
  containerWidth?: number;
  containerHeight?: number;
}

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
      // 1 unit = 1 px, matching the container exactly, so the row really does
      // sit on the container's own bottom edge.
      const width = containerWidth;
      const height = containerHeight;

      // Every category gets an equal column along the bottom, in sidebar
      // order — evenly spaced roots, one shared baseline, one label row.
      const count = Math.max(1, plots.length);
      const columnWidth = width / count;
      // Only a shallow overshoot here: the row is scaled down to fit a phone,
      // and a deep one would bury most of each vine below the edge.
      const rootY = height + 8;
      const labelBand = 26; // reserved at the bottom for the two label lines

      const raw = plots.map((plot, i) => {
        const cx = columnWidth * (i + 0.5);
        const geometry = buildVine(plot.completedCount, cx, rootY, seedFromId(plot.listId));
        return { plot, cx, geometry, halfWidth: vineHalfWidth(geometry, cx) };
      });

      // One scale for the whole row, set by whichever vine is tightest —
      // shrinking each vine to its own column instead would flatten the size
      // differences that show which categories you've done the most in.
      const vineScale = raw.reduce((worst, v) => {
        const fitsWidth = (columnWidth * 0.5) / v.halfWidth;
        const fitsHeight = (rootY - 4) / v.geometry.height;
        return Math.min(worst, fitsWidth, fitsHeight);
      }, 1);

      // Labels shrink until the longest name fits its column, then every
      // label uses that one size so the row reads as a tidy legend.
      const longest = plots.reduce((n, p) => Math.max(n, p.name.length), 1);
      const nameSize = Math.max(6, Math.min(11, (columnWidth - 4) / (0.58 * longest)));
      const countSize = Math.max(5.5, nameSize * 0.85);

      const vines = raw.map(({ plot, cx, geometry }) => ({
        plot,
        cx,
        baseY: rootY,
        vineScale,
        geometry,
        labelX: cx,
        labelY: height - labelBand + nameSize,
        labelAnchor: "middle" as const,
        nameSize,
        countSize,
      }));

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
        vineScale: 1,
        geometry,
        labelX: cx + 18 * geometry.girth,
        labelY: baseY - geometry.height - 4 * geometry.girth,
        labelAnchor: "start" as const,
        nameSize: 9 * geometry.girth,
        countSize: 8 * geometry.girth,
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
      // "meet" fits the whole drawing inside the view, never cropped, anchored
      // to the bottom so the vines line the bottom edge and the cards sit in
      // the space above. (In frame layout the viewBox already equals the
      // container, so this only matters for the row layout.)
      preserveAspectRatio="xMidYMax meet"
      className="absolute inset-0 block h-full w-full"
    >
      {scene.vines.map(({ plot, cx, baseY, vineScale, geometry, labelX, labelY, labelAnchor, nameSize, countSize }, i) => {
        // Deliberately non-harmonic periods per vine, so the garden never
        // falls into a synchronised rhythm.
        const swayDuration = 4.3 + i * 1.1;
        const flutterDuration = 1.9 + i * 0.31;
        const amplitude = 5.2 + (i % 3) * 1.1;
        const drift = 4 + (i % 2) * 2;
        const flutterAmplitude = 1.5 + (i % 2) * 0.6;
        // A halo in the page's own background colour, painted *under* the
        // glyphs, so a label stays readable where it crosses a vine's strokes
        // instead of tangling with them.
        const labelHalo: React.CSSProperties = {
          paintOrder: "stroke",
          stroke: "var(--background)",
          strokeWidth: 3.5,
          strokeLinejoin: "round",
        };

        // Shrink about the vine's own root, so a long vine stays inside its
        // column instead of growing into its neighbour's.
        const placement =
          vineScale < 1
            ? `translate(${cx} ${baseY}) scale(${vineScale.toFixed(3)}) translate(${-cx} ${-baseY})`
            : "";

        return (
          <g key={plot.listId}>
          {/* This inner group carries the fit-to-column scale as an SVG
              attribute transform; the sway/flutter animations use CSS
              transforms on the groups below, which would otherwise overwrite
              it. Labels are siblings, so they keep their own size. */}
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

            {/* Labels sit outside the scaled group so they stay legible at
                whatever size the vines had to be squeezed to. */}
            <text
              x={labelX}
              y={labelY}
              textAnchor={labelAnchor}
              fontSize={nameSize}
              fontWeight="600"
              style={labelHalo}
              className="fill-foreground"
            >
              {plot.name}
            </text>
            <text
              x={labelX}
              y={labelY + countSize + 3}
              textAnchor={labelAnchor}
              fontSize={countSize}
              style={labelHalo}
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

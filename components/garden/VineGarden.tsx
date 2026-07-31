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

interface VineGardenProps {
  plots: VinePlot[];
}

export function VineGarden({ plots }: VineGardenProps) {
  const scene = useMemo(() => {
    // Columns widen with the heftiest vine so neighbours never grow into
    // each other as they fill out.
    const maxGirth = plots.length ? Math.max(...plots.map((p) => girthFactor(p.completedCount))) : 1;
    const columnWidth = COLUMN_WIDTH * maxGirth;
    const width = Math.max(1, plots.length) * columnWidth;
    const tallest = plots.length
      ? Math.max(...plots.map((p) => vineHeight(p.completedCount)))
      : vineHeight(0);
    const height = Math.round(tallest + TOP_PADDING - BOTTOM_OVERSHOOT);
    const baseY = height + BOTTOM_OVERSHOOT; // below the visible edge

    const vines = plots.map((plot, i) => {
      const cx = i * columnWidth + columnWidth / 2;
      const geometry = buildVine(plot.completedCount, cx, baseY, seedFromId(plot.listId));
      return { plot, cx, geometry, tipY: baseY - geometry.height };
    });

    return { width, height, baseY, vines };
  }, [plots]);

  return (
    <svg
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Ink drawing: one climbing vine per category. ${plots
        .map((p) => `${p.name}, ${p.completedCount} completed`)
        .join("; ")}`}
      preserveAspectRatio="xMidYMax meet"
      className="block h-full w-full overflow-visible"
    >
      {scene.vines.map(({ plot, cx, geometry, tipY }, i) => {
        // Deliberately non-harmonic periods per vine, so the garden never
        // falls into a synchronised rhythm.
        const swayDuration = 4.3 + i * 1.1;
        const flutterDuration = 1.9 + i * 0.31;
        const amplitude = 5.2 + (i % 3) * 1.1;
        const drift = 4 + (i % 2) * 2;
        const flutterAmplitude = 1.5 + (i % 2) * 0.6;
        return (
          <g
            key={plot.listId}
            className="vine-sway"
            style={
              {
                transformOrigin: `${cx}px ${scene.baseY}px`,
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
                  transformOrigin: `${cx}px ${scene.baseY}px`,
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

            {/* Label rides near the growing tip, since the base is off-screen. */}
            <text
              x={cx + 12 * geometry.girth}
              y={tipY - 22 * geometry.girth}
              fontSize={9 * geometry.girth}
              fontWeight="600"
              className="fill-foreground"
            >
              {plot.name}
            </text>
            <text
              x={cx + 12 * geometry.girth}
              y={tipY - 12 * geometry.girth}
              fontSize={8 * geometry.girth}
              className="fill-muted-foreground"
            >
              {plot.completedCount} done
            </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

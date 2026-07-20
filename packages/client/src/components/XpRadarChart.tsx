import type { LearningArea, XpAreaSummary } from "@sentence-bank/types";

import { formatXp } from "@/lib/xp";

/** One radar vertex, laid out clockwise from the top. */
function vertex(index: number, count: number, radius: number, center: number) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
    angle,
  };
}

/** Anchor a label away from the chart center so it never overlaps its axis. */
function labelAnchor(angle: number): "start" | "middle" | "end" {
  const cos = Math.cos(angle);
  if (cos > 0.3) return "start";
  if (cos < -0.3) return "end";
  return "middle";
}

/**
 * A spider/radar chart of XP per learning area — one axis per area. The filled polygon is all-time
 * XP; an overlaid accent polygon is today's XP (always inside all-time, so it reads as "how much of
 * each area is from today"). Two series get a legend and distinct hue + fill so identity is never
 * color-alone. Hand-rolled SVG on the app's theme tokens (no chart library, matching `DrillStats`).
 */
export function XpRadarChart({
  areas,
  todayAreas = [],
  size = 300,
}: {
  areas: XpAreaSummary[];
  /** Per-area XP earned today (sparse; areas with none are omitted). */
  todayAreas?: { area: LearningArea;
    xp: number; }[];
  size?: number;
}) {
  const center = size / 2;
  const labelGap = 18;
  const padding = 44;
  const radius = center - padding;
  // Both series scale to the all-time max (today ≤ all-time per area), so today always sits inside.
  const max = Math.max(1, ...areas.map(a => a.xp));
  const rings = [0.25, 0.5, 0.75, 1];
  const todayByArea = new Map(todayAreas.map(a => [a.area, a.xp]));
  const todayTotal = todayAreas.reduce((sum, a) => sum + a.xp, 0);
  const hasToday = todayTotal > 0;

  const points = areas.map((area, i) => {
    const axis = vertex(i, areas.length, radius, center);
    const value = vertex(i, areas.length, (area.xp / max) * radius, center);
    const todayXp = todayByArea.get(area.area) ?? 0;
    const todayPoint = vertex(i, areas.length, (todayXp / max) * radius, center);
    const label = vertex(i, areas.length, radius + labelGap, center);
    return {
      area,
      axis,
      value,
      todayXp,
      todayPoint,
      label,
    };
  });
  const totalPolygon = points.map(p => `${p.value.x},${p.value.y}`).join(" ");
  const todayPolygon = points.map(p => `${p.todayPoint.x},${p.todayPoint.y}`).join(" ");
  const totalXp = areas.reduce((sum, a) => sum + a.xp, 0);

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto w-full max-w-sm overflow-visible"
        role="img"
        aria-label={
          `XP per learning area. All-time: ${areas.map(a => `${a.area} ${formatXp(a.xp)}`).join(", ")}. `
          + `Today: ${hasToday ? todayAreas.map(a => `${a.area} ${formatXp(a.xp)}`).join(", ") : "none"}.`
        }
      >
        {/* Recessive grid: concentric rings + one spoke per area. */}
        {rings.map(ring => (
          <polygon
            key={ring}
            points={areas
              .map((_, i) => {
                const p = vertex(i, areas.length, radius * ring, center);
                return `${p.x},${p.y}`;
              })
              .join(" ")}
            className="fill-none stroke-border"
            strokeWidth={1}
          />
        ))}
        {points.map(p => (
          <line
            key={p.area.area}
            x1={center}
            y1={center}
            x2={p.axis.x}
            y2={p.axis.y}
            className="stroke-border"
            strokeWidth={1}
          />
        ))}

        {/* All-time series: the filled base shape. */}
        <polygon
          points={totalPolygon}
          className="fill-primary/10 stroke-primary/70"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {points.map(p => (
          <circle
            key={p.area.area}
            cx={p.value.x}
            cy={p.value.y}
            r={3}
            className="fill-primary/70"
          />
        ))}

        {/* Today series: an accent overlay inside the base shape. Skipped when nothing earned today. */}
        {hasToday && (
          <>
            <polygon
              points={todayPolygon}
              className="fill-chart-1/25 stroke-chart-1"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            {points.filter(p => p.todayXp > 0).map(p => (
              <circle
                key={p.area.area}
                cx={p.todayPoint.x}
                cy={p.todayPoint.y}
                r={3.5}
                className="fill-chart-1"
              />
            ))}
          </>
        )}

        {/* Direct labels: area name + all-time XP at each vertex, in text tokens. */}
        {points.map((p) => {
          const anchor = labelAnchor(p.label.angle);
          const above = Math.sin(p.label.angle) < -0.3;
          return (
            <text
              key={p.area.area}
              x={p.label.x}
              y={p.label.y + (above ? -12 : 0)}
              textAnchor={anchor}
              className="fill-foreground text-[11px] font-medium"
            >
              <tspan>{p.area.area}</tspan>
              <tspan
                x={p.label.x}
                dy={13}
                className="fill-muted-foreground tabular-nums"
              >
                {formatXp(p.area.xp)} xp
              </tspan>
            </text>
          );
        })}
      </svg>

      {/* Legend — identity is never color-alone. */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary/70" />
          <span className="text-muted-foreground">
            All-time
            {" "}
            <span className="text-foreground tabular-nums">{formatXp(totalXp)}</span>
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-chart-1" />
          <span className="text-muted-foreground">
            Today
            {" "}
            <span className="text-foreground tabular-nums">{formatXp(todayTotal)}</span>
          </span>
        </span>
      </div>
    </div>
  );
}

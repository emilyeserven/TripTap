import type { LearningArea, XpAreaSummary } from "@sentence-bank/types";

import { dailyRadarMax, formatXp } from "@/lib/xp";

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
 * The clockwise-from-top axis order for the radar chart (index 0 = top). Deliberately separate from
 * the global `LEARNING_AREAS` enum so the chart can present the areas in its own reading order without
 * disturbing area ordering anywhere else. Any area not listed here sorts to the end, in its incoming
 * order.
 */
const RADAR_AREA_ORDER: LearningArea[] = [
  "Grammar",
  "Listening",
  "Speaking",
  "Writing",
  "Reading",
  "Vocabulary",
];

/** Reorder the incoming areas by {@link RADAR_AREA_ORDER}; unlisted areas keep their relative order at the end. */
function orderForRadar(areas: XpAreaSummary[]): XpAreaSummary[] {
  const rank = (area: LearningArea) => {
    const i = RADAR_AREA_ORDER.indexOf(area);
    return i === -1 ? RADAR_AREA_ORDER.length : i;
  };
  return [...areas].sort((a, b) => rank(a.area) - rank(b.area));
}

/**
 * A spider/radar chart of XP per learning area — one axis per area. The filled polygon is all-time XP,
 * scaled to the all-time max. Two overlaid accent polygons — today and yesterday — share a *separate*
 * daily scale (min = the learner's daily XP goal, growing in +5 steps) so day-over-day effort is
 * legible even when it's a sliver of the all-time total. Each series gets a legend + distinct hue so
 * identity is never color-alone. Hand-rolled SVG on the app's theme tokens (no chart library).
 */
export function XpRadarChart({
  areas: incomingAreas,
  todayAreas = [],
  yesterdayAreas = [],
  dailyXpGoal = null,
  size = 300,
}: {
  areas: XpAreaSummary[];
  /** Per-area XP earned today (sparse; areas with none are omitted). */
  todayAreas?: { area: LearningArea;
    xp: number; }[];
  /** Per-area XP earned yesterday (sparse; areas with none are omitted). */
  yesterdayAreas?: { area: LearningArea;
    xp: number; }[];
  /** The learner's daily XP goal, the baseline for the today/yesterday scale; null → a default of 5. */
  dailyXpGoal?: number | null;
  size?: number;
}) {
  // Present the axes in the chart's own reading order; day values follow via the per-axis lookups.
  const areas = orderForRadar(incomingAreas);
  const center = size / 2;
  const labelGap = 18;
  const padding = 44;
  const radius = center - padding;
  // All-time scales to its own max; today & yesterday share a daily scale starting at ⅔ of the goal.
  const allTimeMax = Math.max(1, ...areas.map(a => a.xp));
  const todayByArea = new Map(todayAreas.map(a => [a.area, a.xp]));
  const yesterdayByArea = new Map(yesterdayAreas.map(a => [a.area, a.xp]));
  const dailyPeak = Math.max(0, ...todayAreas.map(a => a.xp), ...yesterdayAreas.map(a => a.xp));
  const dailyMax = dailyRadarMax(dailyXpGoal, dailyPeak);
  const rings = [0.25, 0.5, 0.75, 1];
  const todayTotal = todayAreas.reduce((sum, a) => sum + a.xp, 0);
  const yesterdayTotal = yesterdayAreas.reduce((sum, a) => sum + a.xp, 0);
  const hasToday = todayTotal > 0;
  const hasYesterday = yesterdayTotal > 0;

  const points = areas.map((area, i) => {
    const axis = vertex(i, areas.length, radius, center);
    const value = vertex(i, areas.length, (area.xp / allTimeMax) * radius, center);
    const todayXp = todayByArea.get(area.area) ?? 0;
    const todayPoint = vertex(i, areas.length, (todayXp / dailyMax) * radius, center);
    const yesterdayXp = yesterdayByArea.get(area.area) ?? 0;
    const yesterdayPoint = vertex(i, areas.length, (yesterdayXp / dailyMax) * radius, center);
    const label = vertex(i, areas.length, radius + labelGap, center);
    return {
      area,
      axis,
      value,
      todayXp,
      todayPoint,
      yesterdayXp,
      yesterdayPoint,
      label,
    };
  });
  const totalPolygon = points.map(p => `${p.value.x},${p.value.y}`).join(" ");
  const todayPolygon = points.map(p => `${p.todayPoint.x},${p.todayPoint.y}`).join(" ");
  const yesterdayPolygon = points.map(p => `${p.yesterdayPoint.x},${p.yesterdayPoint.y}`).join(" ");
  const totalXp = areas.reduce((sum, a) => sum + a.xp, 0);

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto w-full max-w-sm overflow-visible"
        role="img"
        aria-label={
          `XP per learning area. All-time: ${areas.map(a => `${a.area} ${formatXp(a.xp)}`).join(", ")}. `
          + `Today: ${hasToday ? todayAreas.map(a => `${a.area} ${formatXp(a.xp)}`).join(", ") : "none"}. `
          + `Yesterday: ${hasYesterday ? yesterdayAreas.map(a => `${a.area} ${formatXp(a.xp)}`).join(", ") : "none"}. `
          + `Today and yesterday are scaled to a daily max of ${formatXp(dailyMax)} xp.`
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

        {/* Yesterday series: a second daily-scale overlay, drawn under today. Skipped when empty. */}
        {hasYesterday && (
          <>
            <polygon
              points={yesterdayPolygon}
              className="fill-chart-2/20 stroke-chart-2"
              strokeWidth={2}
              strokeDasharray="4 3"
              strokeLinejoin="round"
            />
            {points.filter(p => p.yesterdayXp > 0).map(p => (
              <circle
                key={p.area.area}
                cx={p.yesterdayPoint.x}
                cy={p.yesterdayPoint.y}
                r={3}
                className="fill-chart-2"
              />
            ))}
          </>
        )}

        {/* Today series: an accent overlay on the daily scale. Skipped when nothing earned today. */}
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
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-chart-2" />
          <span className="text-muted-foreground">
            Yesterday
            {" "}
            <span className="text-foreground tabular-nums">{formatXp(yesterdayTotal)}</span>
          </span>
        </span>
      </div>
      {/* The daily overlays use their own scale, so callers can read today/yesterday against the goal. */}
      <p className="text-center text-[11px] text-muted-foreground">
        Today & yesterday scaled to
        {" "}
        <span className="tabular-nums">{formatXp(dailyMax)}</span>
        {" "}
        xp
      </p>
    </div>
  );
}

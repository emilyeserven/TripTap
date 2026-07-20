import type { XpAreaSummary } from "@sentence-bank/types";

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
 * A spider/radar chart of XP per learning area — one axis per area, a single filled polygon scaled to
 * the highest area. Hand-rolled SVG on the app's theme tokens (no chart library, matching
 * `DrillStats`); every vertex is direct-labeled with the area name and its XP, so the numbers are
 * readable as text without a tooltip layer.
 */
export function XpRadarChart({
  areas,
  size = 300,
}: {
  areas: XpAreaSummary[];
  size?: number;
}) {
  const center = size / 2;
  const labelGap = 18;
  const padding = 44;
  const radius = center - padding;
  const max = Math.max(1, ...areas.map(a => a.xp));
  const rings = [0.25, 0.5, 0.75, 1];

  const points = areas.map((area, i) => {
    const axis = vertex(i, areas.length, radius, center);
    const value = vertex(i, areas.length, (area.xp / max) * radius, center);
    const label = vertex(i, areas.length, radius + labelGap, center);
    return {
      area,
      axis,
      value,
      label,
    };
  });
  const polygon = points.map(p => `${p.value.x},${p.value.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto w-full max-w-sm"
      role="img"
      aria-label={`XP per learning area: ${areas.map(a => `${a.area} ${formatXp(a.xp)}`).join(", ")}`}
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

      {/* The single data series. */}
      <polygon
        points={polygon}
        className="fill-primary/20 stroke-primary"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {points.map(p => (
        <circle
          key={p.area.area}
          cx={p.value.x}
          cy={p.value.y}
          r={3.5}
          className="fill-primary"
        />
      ))}

      {/* Direct labels: area name + XP at each vertex, in text tokens. */}
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
  );
}

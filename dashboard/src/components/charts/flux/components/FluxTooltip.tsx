"use client";

/**
 * FluxTooltip.tsx
 * src/components/charts/flux/components/FluxTooltip.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * SRP: Isolated, memo-wrapped Recharts custom tooltip for the FluxChart.
 *
 * PRECISION CONTRACT:
 *   Raw float values are extracted via fluxArray[point.srcIdx] — the direct
 *   pipeline index cached in ChartPoint during useChartData's build pass.
 *   This bypasses all coordinate reconstruction math and floating-point
 *   accumulation that would occur from reading Recharts' normalized payload
 *   values. The displayed F/F₀ precision is identical to the source data.
 *
 * PERFORMANCE:
 *   React.memo with a custom comparator. The tooltip only re-renders when
 *   the active data point changes (by srcIdx) or active/fluxArray identity
 *   changes. Phase marker updates at 60fps do NOT cause tooltip repaints
 *   because they update a ReferenceLine, not the Tooltip active payload.
 *
 * RECHARTS INTEGRATION:
 *   Used as the `content` prop on Recharts <Tooltip>. Recharts injects:
 *     active:   boolean
 *     payload:  Array<{ payload: ChartPoint; name: string; value: number }>
 *   We cast payload[0].payload to ChartPoint to access srcIdx.
 *
 * STYLE:
 *   Obsidian glass panel — rgba(2,4,9,0.92), backdrop-blur-xl equivalent.
 *   11px Space Mono, #cbd5e1 labels, #22d3ee values.
 *   No Tailwind classes — pure inline styles for SSR hydration safety.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { memo } from "react";
import type { ChartPoint, TransitBounds } from "../types";

// ── Recharts tooltip prop shape ────────────────────────────────────────────────
// We use a minimal typed subset rather than importing from recharts to avoid
// the deep union type that triggers TS2590 on complex payload generics.

interface RechartsPayloadEntry {
  payload:    ChartPoint;
  name:       string;
  value:      number | null | undefined;
  dataKey:    string;
  color?:     string;
}

export interface FluxTooltipProps {
  // Recharts-injected (optional because Recharts may not inject when inactive)
  active?:   boolean;
  payload?:  RechartsPayloadEntry[];
  // Application-provided (passed via curried wrapper in index.tsx)
  fluxArray:     number[];
  transitBounds: TransitBounds | null;
}

// ── Custom comparator — prevents memo from re-rendering on coord-only changes ──

function areEqual(prev: FluxTooltipProps, next: FluxTooltipProps): boolean {
  // Different active state → always re-render
  if (prev.active !== next.active) return false;
  // Both inactive → no render needed, treat as equal
  if (!next.active) return true;
  // Source data changed → re-render
  if (prev.fluxArray !== next.fluxArray) return false;
  // No payload yet → equal (both empty)
  if (!prev.payload?.length && !next.payload?.length) return true;
  // Payload length changed → re-render
  if (prev.payload?.length !== next.payload?.length) return false;
  // Active data point changed by srcIdx → re-render
  const prevIdx = prev.payload?.[0]?.payload?.srcIdx ?? -1;
  const nextIdx = next.payload?.[0]?.payload?.srcIdx ?? -1;
  return prevIdx === nextIdx;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const FluxTooltip = memo(function FluxTooltip({
  active,
  payload,
  fluxArray,
  transitBounds,
}: FluxTooltipProps) {

  if (!active || !payload?.length) return null;

  // Extract the ChartPoint from the first payload entry
  const entry = payload[0];
  const point = entry?.payload as ChartPoint | undefined;
  if (!point) return null;

  // ── PRECISION READ: direct pipeline index, no coordinate math ──────────────
  const rawFlux = (
    typeof point.srcIdx === "number" &&
    point.srcIdx >= 0 &&
    point.srcIdx < fluxArray.length
  )
    ? fluxArray[point.srcIdx]
    : point.flux; // fallback to Recharts-normalized value

  const TWO_PI   = 2 * Math.PI;
  const phaseRad = point.phase * TWO_PI;
  const inTransit = point.transitEvent !== undefined;

  // Determine if we're near a transit boundary for extra annotation
  const nearTransitEdge = transitBounds
    ? Math.abs(point.phase - transitBounds.low)  < 0.008 ||
      Math.abs(point.phase - transitBounds.high) < 0.008
    : false;

  return (
    <div
      role="tooltip"
      style={{
        background:           "rgba(2, 4, 9, 0.92)",
        backdropFilter:       "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border:               "1px solid rgba(34, 211, 238, 0.22)",
        borderRadius:         8,
        padding:              "10px 14px",
        minWidth:             148,
        boxShadow:            "0 12px 32px rgba(0,0,0,0.60), 0 0 0 0.5px rgba(34,211,238,0.08)",
        pointerEvents:        "none",
      }}
    >
      {/* ── Top accent bar ───────────────────────────────────────────────── */}
      <div style={{
        height:       1,
        marginBottom: 9,
        background:   inTransit
          ? "linear-gradient(90deg, #f59e0b 0%, transparent 100%)"
          : "linear-gradient(90deg, #22d3ee 0%, transparent 100%)",
        borderRadius: 1,
      }} />

      {/* ── Data rows ────────────────────────────────────────────────────── */}
      <TooltipRow
        label="φ"
        value={`${phaseRad.toFixed(4)} rad`}
        valueColor="#94a3b8"
      />
      <TooltipRow
        label="F/F₀"
        value={rawFlux.toFixed(6)}
        valueColor="#22d3ee"
        bold
      />
      <TooltipRow
        label="Phase"
        value={`${(point.phase * 100).toFixed(2)} %`}
        valueColor="rgba(148,163,184,0.65)"
      />

      {/* ── Transit annotation ────────────────────────────────────────────── */}
      {inTransit && (
        <div style={{
          marginTop:   8,
          paddingTop:  7,
          borderTop:   "1px solid rgba(251,191,36,0.15)",
          display:     "flex",
          alignItems:  "center",
          gap:         6,
        }}>
          <span style={{
            display:      "inline-block",
            width:        6,
            height:       6,
            borderRadius: "50%",
            background:   "#f59e0b",
            boxShadow:    "0 0 6px #f59e0b",
            flexShrink:   0,
          }} />
          <span style={{ ...MONO, fontSize: 8.5, color: "#f59e0b", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Transit Dip Active
          </span>
        </div>
      )}

      {/* ── Transit edge proximity hint ───────────────────────────────────── */}
      {nearTransitEdge && !inTransit && (
        <div style={{
          marginTop:   8,
          paddingTop:  7,
          borderTop:   "1px solid rgba(255,255,255,0.05)",
          display:     "flex",
          alignItems:  "center",
          gap:         6,
        }}>
          <span style={{ ...MONO, fontSize: 8, color: "rgba(251,191,36,0.55)", letterSpacing: "0.10em" }}>
            ◈ Transit boundary
          </span>
        </div>
      )}

      {/* ── Source index (diagnostic) ─────────────────────────────────────── */}
      <div style={{
        marginTop:  8,
        paddingTop: 6,
        borderTop:  "1px solid rgba(255,255,255,0.04)",
      }}>
        <span style={{ ...MONO, fontSize: 8, color: "rgba(71,85,105,0.60)", letterSpacing: "0.08em" }}>
          idx {point.srcIdx.toLocaleString()}
        </span>
      </div>
    </div>
  );
}, areEqual);

FluxTooltip.displayName = "FluxTooltip";
export default FluxTooltip;

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

interface TooltipRowProps {
  label:      string;
  value:      string;
  valueColor: string;
  bold?:      boolean;
}

function TooltipRow({ label, value, valueColor, bold }: TooltipRowProps) {
  return (
    <div style={{
      display:       "flex",
      alignItems:    "baseline",
      justifyContent:"space-between",
      gap:           12,
      marginBottom:  4,
    }}>
      <span style={{
        ...MONO,
        fontSize:      8.5,
        color:         "rgba(100,116,139,0.75)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        flexShrink:    0,
      }}>
        {label}
      </span>
      <span style={{
        ...MONO,
        fontSize:      10,
        fontWeight:    bold ? 700 : 400,
        color:         valueColor,
        letterSpacing: "0.04em",
        textAlign:     "right",
      }}>
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const MONO: React.CSSProperties = {
  fontFamily: "'Space Mono', 'Courier New', monospace",
  fontSize:   11,
  color:      "#cbd5e1",
};
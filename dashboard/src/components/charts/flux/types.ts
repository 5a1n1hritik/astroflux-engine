/**
 * types.ts
 * src/components/charts/flux/types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared type contracts and design tokens for the FluxChart module.
 * Imported by all three layer components — single source of truth.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Public API ─────────────────────────────────────────────────────────────────

export interface FluxChartProps {
  timeArray:         number[];
  fluxArray:         number[];
  /** Cold-start initializer. Hot-path updates come via FluxChartHandle.setPhase(). */
  currentPhaseAngle: number;
}

export interface FluxChartHandle {
  /** Called every frame from OrbitSimulator — never triggers a React re-render */
  setPhase: (radians: number) => void;
}

// ── Shared plot geometry ───────────────────────────────────────────────────────
// Computed once by FluxStaticLayer when data arrives.
// Written into a ref object owned by the orchestrator (index.tsx).
// Read by FluxMarkerLayer on every rAF tick.

export interface PlotGeometry {
  /** Total canvas pixel width (= timeArray.length × PX_PER_POINT + PAD.left + PAD.right) */
  canvasW:    number;
  /** Canvas pixel height */
  canvasH:    number;
  /** Plot area width (canvasW - PAD.left - PAD.right) */
  pw:         number;
  /** Plot area height (canvasH - PAD.top - PAD.bottom) */
  ph:         number;
  yMin:       number;
  yMax:       number;
  /** Pre-built O(1) X-pixel lookup per data index */
  xPixels:    Float32Array;
  /** Pre-built O(1) Y-pixel lookup per data index */
  yPixels:    Float32Array;
  /** Transit zone: left bound in canvas pixels */
  transitX1:  number;
  /** Transit zone: right bound in canvas pixels */
  transitX2:  number;
  /** Transit zone: center X in canvas pixels */
  transitCx:  number;
  hasTransit: boolean;
}

export const EMPTY_GEOMETRY: PlotGeometry = {
  canvasW: 0, canvasH: 0, pw: 0, ph: 0,
  yMin: 0, yMax: 1,
  xPixels: new Float32Array(0),
  yPixels: new Float32Array(0),
  transitX1: 0, transitX2: 0, transitCx: 0,
  hasTransit: false,
};

// ── Design tokens ─────────────────────────────────────────────────────────────

export const TOKEN = {
  curveColor:        "#e8f4ff",
  curveWidth:        1.0,
  curveGlowColor:    "rgba(180, 220, 255, 0.10)",
  curveGlowWidth:    3,

  gridColor:         "rgba(148, 163, 184, 0.055)",
  gridColorStrong:   "rgba(148, 163, 184, 0.13)",
  axisColor:         "rgba(148, 163, 184, 0.30)",

  labelColor:        "rgba(71, 85, 105, 0.90)",
  labelFont:         "9px 'Space Mono', 'Courier New', monospace",
  axisFont:          "8px 'Space Mono', 'Courier New', monospace",
  axisTitleFont:     "7.5px 'Space Mono', 'Courier New', monospace",

  markerColor:       "#22d3ee",
  markerLineAlpha:   0.32,
  dotRadius:         3.5,
  dotGlowRadius:     7,

  transitAmber:      "rgba(251, 191, 36,",
  transitCyan:       "rgba(34, 211, 238,",

  tooltipBg:         "rgba(2, 4, 9, 0.85)",
  tooltipBorder:     "rgba(34, 211, 238, 0.28)",
  tooltipFont:       "8px 'Space Mono', 'Courier New', monospace",
  tooltipLabelColor: "rgba(100, 116, 139, 0.90)",
  tooltipValueColor: "#22d3ee",
} as const;

// ── Canvas padding (px) ───────────────────────────────────────────────────────

export const PAD = {
  top:    26,
  right:  24,
  bottom: 38,
  left:   56,
} as const;

// ── Pixels allocated per data point on the expanded canvas ───────────────────
// 0.45px per point gives clinical breathing room while keeping memory bounded.
// At 5000 points → 2250px canvas (scrollable). At 500 points → 225px (fits viewport).

export const PX_PER_POINT = 0.45;

// ── Canvas height (fixed — only width is dynamic) ────────────────────────────

export const CANVAS_H = 170;

// ── Scroll-sync: fraction of viewport width at which the marker locks ─────────
// 0.5 = dead center. Must match the scroll calculation in index.tsx.

export const MARKER_LOCK_FRACTION = 0.5;
/**
 * types.ts
 * src/components/charts/flux/types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all shared type contracts in the FluxChart module.
 * No runtime logic — only TypeScript interfaces, type aliases, and constants.
 *
 * Import hierarchy rule:
 *   types.ts  ←  hooks/useChartData.ts
 *   types.ts  ←  hooks/useZoom.ts
 *   types.ts  ←  index.tsx
 *   (types.ts imports nothing from this module)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Public component API ───────────────────────────────────────────────────────

/** Props passed from page.tsx → FluxChart */
export interface FluxChartProps {
  timeArray:         number[];
  fluxArray:         number[];
  /**
   * Cold-start phase initializer. After mount, all 60 fps updates
   * arrive via FluxChartHandle.setPhase() — never as prop re-renders.
   */
  currentPhaseAngle: number;
}

/** Imperative handle exposed via forwardRef to the Three.js animation loop */
export interface FluxChartHandle {
  /**
   * Called 60×/sec from OrbitSimulator.onFrameUpdate.
   * Writes to a MutableRefObject only — zero React re-renders.
   */
  setPhase: (radians: number) => void;
}

// ── Visualization mode ─────────────────────────────────────────────────────────

/**
 * Controls which Recharts series are rendered.
 *
 *   "line"         → <Line type="monotone">  only
 *   "scatter"      → <Scatter>               only
 *   "line-scatter" → <Line> + <Scatter> overlaid (combined)
 *   "step"         → <Line type="stepAfter"> only
 */
export type RenderMode = "line" | "scatter" | "line-scatter" | "step";

export const RENDER_MODES: { id: RenderMode; label: string }[] = [
  { id: "line",         label: "Line"     },
  { id: "scatter",      label: "Scatter"  },
  { id: "line-scatter", label: "Combined" },
  { id: "step",         label: "Step"     },
];

// ── Y-axis scale ──────────────────────────────────────────────────────────────

export type YScaleMode = "linear" | "log";

// ── Sample density (data decimation zoom) ─────────────────────────────────────

/**
 * Controls how aggressively the viewport chunk is decimated before
 * being handed to Recharts.
 *
 *   1 → loosest stride (fewest points, fastest render)
 *   4 → tightest stride (most points, highest resolution)
 */
export type DensityLevel = 1 | 2 | 3 | 4;

export const DENSITY_LEVELS: DensityLevel[] = [1, 2, 3, 4];

// ── Viewport ──────────────────────────────────────────────────────────────────

/**
 * Defines the visible X-axis window in normalized phase space [0, 1].
 * The full-data default is { start: 0, end: 1 }.
 *
 * Both bounds are inclusive. Invariant: 0 ≤ start < end ≤ 1.
 */
export interface Viewport {
  start: number;   // normalized phase, left edge
  end:   number;   // normalized phase, right edge
}

export const FULL_VIEWPORT: Viewport = { start: 0, end: 1 };

// ── View domain (Recharts axis domain pair) ────────────────────────────────────

/**
 * Active axis domains supplied to Recharts XAxis/YAxis `domain` prop.
 * Recomputed whenever the Viewport or Y-zoom state changes.
 */
export interface ViewDomain {
  x: [number, number];
  y: [number, number];
}

// ── Chart data point ──────────────────────────────────────────────────────────

/**
 * Normalized, decimated data point ready for Recharts ingestion.
 * Built by useChartData and consumed by the Recharts series components.
 */
export interface ChartPoint {
  /** Normalized orbital phase [0, 1] → maps to XAxis */
  phase:        number;
  /** Raw F/F₀ float — direct pipeline value, never transformed */
  flux:         number;
  /**
   * Amber transit overlay value.
   * Defined (= flux) only when this point falls inside the detected
   * transit dip zone. Undefined elsewhere so Recharts renders a gap
   * (connectNulls={false} on the transit series).
   */
  transitEvent: number | undefined;
  /**
   * Source index into the original fluxArray.
   * Used by the tooltip to read `fluxArray[srcIdx]` directly,
   * bypassing any floating-point error from coordinate reconstruction.
   */
  srcIdx:       number;
}

// ── Transit bounds ────────────────────────────────────────────────────────────

/**
 * Detected transit zone in normalized phase coordinates.
 * Computed once per dataset by useChartData's transit detection pass.
 * Null when no transit dip is detectable in the data.
 */
export interface TransitBounds {
  /** Normalized phase of the transit center (typically near 0.5 = π) */
  center:       number;
  /** Left edge of the dip zone */
  low:          number;
  /** Right edge of the dip zone */
  high:         number;
  /** True if the zone was detected from the data; false if it is the default fallback */
  detected:     boolean;
}

// ── useChartData hook input/output contract ────────────────────────────────────

export interface UseChartDataInput {
  timeArray:  number[];
  fluxArray:  number[];
  viewport:   Viewport;
  density:    DensityLevel;
  /** Hard cap on Recharts data points after decimation. Default: 800 */
  maxPoints?: number;
}

export interface UseChartDataOutput {
  /** Processed array ready for Recharts `data` prop */
  chartData:     ChartPoint[];
  /**
   * Full-dataset Y extent (min/max with headroom).
   * Used as the default YAxis domain when no Y-zoom is active.
   */
  fullYDomain:   [number, number];
  /**
   * Detected transit zone — null if dataset has no points or dip is absent.
   * Stable reference (only recomputed when timeArray/fluxArray change).
   */
  transitBounds: TransitBounds | null;
  /**
   * Count of raw data points inside the active viewport before decimation.
   * Exposed so the UI can show e.g. "240 / 5000 pts in view".
   */
  pointsInView:  number;
}

// ── useZoom hook input/output contract ────────────────────────────────────────

/**
 * Normalized coordinate emitted by Recharts mouse event handlers.
 * Both values are in the same unit as the axis domain (phase for x, flux for y).
 */
export interface ChartCoord {
  x: number;
  y: number;
}

export interface UseZoomOutput {
  /** Current active viewport (updated by box-zoom and pan) */
  viewport:    Viewport;
  /** Current Y-axis zoom extent, or null for full-data Y */
  yZoom:       [number, number] | null;
  /**
   * In-progress drag selection rectangle.
   * Null when no drag is active; populated during a box-zoom drag.
   */
  dragArea:    { x1: number; y1: number; x2: number; y2: number } | null;
  isDragging:  boolean;
  /** True while a Shift+drag pan gesture is in progress */
  isPanning:   boolean;
  /** Call with the Recharts onMouseDown chart coordinate */
  onMouseDown: (coord: ChartCoord) => void;
  /** Call with the Recharts onMouseMove chart coordinate */
  onMouseMove: (coord: ChartCoord) => void;
  /** Call on Recharts onMouseUp / onMouseLeave */
  onMouseUp:   () => void;
  /** Resets viewport and yZoom to full extents */
  resetView:   () => void;
  /** Derived ViewDomain for Recharts axis domain props */
  viewDomain:  ViewDomain;
  fullYDomain: [number, number];
}

// ── Design constants ──────────────────────────────────────────────────────────

/** Default hard cap on Recharts data points after decimation */
export const DEFAULT_MAX_POINTS = 800;

/** Transit dip detection threshold: flux must be this fraction below median */
export const TRANSIT_DIP_THRESHOLD = 0.9975;

/** Fallback transit center when no dip is detected (normalized phase = π) */
export const TRANSIT_CENTER_FALLBACK = 0.5;

/** Fallback transit half-width in normalized phase units */
export const TRANSIT_HALF_FALLBACK = 0.04;

/** Minimum viewport span to prevent degenerate zoom states (1% of range) */
export const MIN_VIEWPORT_SPAN = 0.01;

/** Space Mono base style — consumed by index.tsx inline style objects */
export const MONO_STYLE: React.CSSProperties = {
  fontFamily:    "'Space Mono', 'Courier New', monospace",
  fontSize:      11,
  color:         "#cbd5e1",
};
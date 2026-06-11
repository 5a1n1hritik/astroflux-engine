/**
 * useChartData.ts
 * src/components/charts/flux/hooks/useChartData.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Viewport Engine Pipeline: Raw Dataset → Viewport Filter → Decimation → Recharts
 *
 * PIPELINE ORDER (critical — do not reorder):
 *
 *   Step 1 — TRANSIT DETECTION  (runs on full dataset, once per data change)
 *     Finds the contiguous flux-dip region by comparing each point against
 *     the dataset median. Produces a stable TransitBounds object that never
 *     changes unless the source arrays change.
 *
 *   Step 2 — VIEWPORT SLICE  (runs on full dataset filtered by viewport)
 *     Finds the index range [iStart, iEnd) in timeArray that falls within
 *     [viewport.start, viewport.end] in normalized phase space.
 *     Uses binary search (O(log n)) — never iterates the full array at
 *     render time.
 *
 *   Step 3 — DECIMATION STRIDE  (runs on the viewport slice only)
 *     Computes stride = max(1, floor(viewCount / targetPoints)).
 *     targetPoints = maxPoints × (density / 4) — higher density → more points.
 *     Stride sampling is applied to the slice indices, NOT the full array,
 *     so zooming in always increases visible detail.
 *
 *   Step 4 — POINT CONSTRUCTION
 *     Maps strided indices → ChartPoint[]. Writes transitEvent only for
 *     points inside the transit zone (gap-based amber overlay).
 *
 * MEMOIZATION STRATEGY:
 *   - Transit detection is memoized on [timeArray, fluxArray] identity.
 *     Cost: O(n log n) for sort. Stable reference prevents downstream
 *     re-renders when only viewport/density changes.
 *   - The full pipeline output is memoized on
 *     [timeArray, fluxArray, viewport, density, maxPoints].
 *   - Y-domain computation is memoized on [timeArray, fluxArray] only
 *     (full-dataset extents; viewport Y zoom is handled by useZoom).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo } from "react";
import {
  DEFAULT_MAX_POINTS,
  TRANSIT_DIP_THRESHOLD,
  TRANSIT_CENTER_FALLBACK,
  TRANSIT_HALF_FALLBACK,
  type UseChartDataInput,
  type UseChartDataOutput,
  type ChartPoint,
  type TransitBounds,
} from "../types";

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useChartData({
  timeArray,
  fluxArray,
  viewport,
  density,
  maxPoints = DEFAULT_MAX_POINTS,
}: UseChartDataInput): UseChartDataOutput {

  // ── MEMOIZATION LAYER 1: Full-dataset Y extents ──────────────────────────
  // Depends only on source arrays. Never reruns when viewport/density change.
  const fullYDomain = useMemo<[number, number]>(() => {
    return computeYDomain(fluxArray);
  }, [fluxArray]);

  // ── MEMOIZATION LAYER 2: Transit detection ───────────────────────────────
  // O(n log n) sort — memoized on source array identity only.
  const transitBounds = useMemo<TransitBounds | null>(() => {
    return detectTransitZone(timeArray, fluxArray);
  }, [timeArray, fluxArray]);

  // ── MEMOIZATION LAYER 3: Full pipeline (viewport + decimation) ───────────
  // Reruns when viewport, density, or maxPoints changes.
  // timeArray/fluxArray changes are transitively covered.
  const { chartData, pointsInView } = useMemo(() => {
    return buildChartData({
      timeArray,
      fluxArray,
      viewport,
      density,
      maxPoints,
      transitBounds,
    });
  }, [timeArray, fluxArray, viewport, density, maxPoints, transitBounds]);

  return { chartData, fullYDomain, transitBounds, pointsInView };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — TRANSIT ZONE DETECTION
//
// Algorithm:
//   1. Compute dataset median via a sorted copy (O(n log n), runs once).
//   2. Threshold = median × TRANSIT_DIP_THRESHOLD (default: 99.75% of median).
//   3. Scan for first and last index below threshold.
//   4. Return center and half-width in normalized phase coordinates.
//
// Invariants:
//   - Returns null if the array is too short (<10 points) or empty.
//   - detected=false when no dip is found; center/low/high use fallback values
//     so downstream consumers always get a valid zone to render.
// ─────────────────────────────────────────────────────────────────────────────

function detectTransitZone(
  timeArray: number[],
  fluxArray: number[],
): TransitBounds | null {
  const n = Math.min(timeArray.length, fluxArray.length);
  if (n < 10) return null;

  // Sort a copy — never mutate the source array
  const sorted    = Float64Array.from(fluxArray.slice(0, n)).sort();
  const median    = sorted[Math.floor(n / 2)];
  const threshold = median * TRANSIT_DIP_THRESHOLD;

  let dipFirst = -1;
  let dipLast  = -1;

  for (let i = 0; i < n; i++) {
    if (fluxArray[i] < threshold) {
      if (dipFirst === -1) dipFirst = i;
      dipLast = i;
    }
  }

  if (dipFirst === -1) {
    // No dip detected — return fallback zone so amber overlay still renders
    return {
      center:   TRANSIT_CENTER_FALLBACK,
      low:      TRANSIT_CENTER_FALLBACK - TRANSIT_HALF_FALLBACK,
      high:     TRANSIT_CENTER_FALLBACK + TRANSIT_HALF_FALLBACK,
      detected: false,
    };
  }

  const centerNorm = ((dipFirst + dipLast) * 0.5) / (n - 1);
  const halfNorm   = Math.max(0.008, ((dipLast - dipFirst) / (n - 1)) * 0.5 + 0.007);

  return {
    center:   centerNorm,
    low:      centerNorm - halfNorm,
    high:     centerNorm + halfNorm,
    detected: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — BINARY SEARCH VIEWPORT SLICE
//
// Converts viewport {start, end} from normalized phase [0,1] back to
// source-array time values, then binary-searches for the index boundaries.
//
// Complexity: O(log n) per call — safe to run inside useMemo.
// ─────────────────────────────────────────────────────────────────────────────

function findViewportBounds(
  timeArray: number[],
  tMin:      number,
  tRange:    number,
  viewport:  { start: number; end: number },
): { iStart: number; iEnd: number } {
  const n       = timeArray.length;
  const tStart  = tMin + viewport.start * tRange;
  const tEnd    = tMin + viewport.end   * tRange;

  // Lower bound: first index where timeArray[i] >= tStart
  let lo = 0, hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (timeArray[mid] < tStart) lo = mid + 1;
    else hi = mid;
  }
  const iStart = lo;

  // Upper bound: first index where timeArray[i] > tEnd
  lo = 0; hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (timeArray[mid] <= tEnd) lo = mid + 1;
    else hi = mid;
  }
  const iEnd = lo;

  return { iStart, iEnd };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 + 4 — DECIMATION + POINT CONSTRUCTION
//
// Called inside the main useMemo with all pipeline dependencies.
// Applies stride to the viewport slice only.
// ─────────────────────────────────────────────────────────────────────────────

interface BuildInput {
  timeArray:     number[];
  fluxArray:     number[];
  viewport:      { start: number; end: number };
  density:       number;
  maxPoints:     number;
  transitBounds: TransitBounds | null;
}

function buildChartData({
  timeArray,
  fluxArray,
  viewport,
  density,
  maxPoints,
  transitBounds,
}: BuildInput): { chartData: ChartPoint[]; pointsInView: number } {

  const n = Math.min(timeArray.length, fluxArray.length);
  if (n === 0) return { chartData: [], pointsInView: 0 };

  // Pre-compute normalization constants once
  const tMin   = timeArray[0];
  const tRange = (timeArray[n - 1] - tMin) || 1;

  // ── STEP 2: Viewport slice via binary search ──────────────────────────────
  const { iStart, iEnd } = findViewportBounds(timeArray, tMin, tRange, viewport);
  const viewCount         = iEnd - iStart;

  if (viewCount === 0) return { chartData: [], pointsInView: 0 };

  // ── STEP 3: Decimation stride ─────────────────────────────────────────────
  // targetPoints scales linearly with density:
  //   density 1 → maxPoints × 0.25   (lightest, fastest)
  //   density 2 → maxPoints × 0.50
  //   density 3 → maxPoints × 0.75
  //   density 4 → maxPoints × 1.00   (full resolution cap)
  const targetPoints = Math.max(2, Math.floor(maxPoints * (density / 4)));
  const stride       = Math.max(1, Math.floor(viewCount / targetPoints));

  // ── STEP 4: Point construction ────────────────────────────────────────────
  // Pre-allocate output array with exact capacity to avoid repeated resizing
  const estimatedLength = Math.ceil(viewCount / stride);
  const chartData: ChartPoint[] = new Array(estimatedLength);
  let   writeIdx = 0;

  // Cache transit zone bounds for the tight inner loop (avoid property reads)
  const transitLow  = transitBounds?.low  ?? -1;
  const transitHigh = transitBounds?.high ?? -1;

  for (let i = iStart; i < iEnd; i += stride) {
    const phaseNorm  = (timeArray[i] - tMin) / tRange; // normalized [0,1]
    const rawFlux    = fluxArray[i];
    const inTransit  = phaseNorm >= transitLow && phaseNorm <= transitHigh;

    chartData[writeIdx++] = {
      phase:        phaseNorm,
      flux:         rawFlux,
      transitEvent: inTransit ? rawFlux : undefined,
      srcIdx:       i,
    };
  }

  // Trim to actual written length (last stride may overshoot pre-allocated size)
  chartData.length = writeIdx;

  return { chartData, pointsInView: viewCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL-DATASET Y DOMAIN
//
// Adds asymmetric headroom: 12% below min (transit dips go down),
// 8% above max. Runs once per fluxArray identity change.
// ─────────────────────────────────────────────────────────────────────────────

function computeYDomain(fluxArray: number[]): [number, number] {
  if (fluxArray.length === 0) return [0.99, 1.01];

  let minF =  Infinity;
  let maxF = -Infinity;

  for (let i = 0; i < fluxArray.length; i++) {
    const v = fluxArray[i];
    if (v < minF) minF = v;
    if (v > maxF) maxF = v;
  }

  const range = maxF - minF || 1e-6;
  return [
    minF - range * 0.12,
    maxF + range * 0.08,
  ];
}
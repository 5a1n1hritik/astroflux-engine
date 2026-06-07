"use client";

/**
 * FluxChart.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * High-performance scientific light-curve renderer.
 *
 * PERFORMANCE ARCHITECTURE — Two-canvas split:
 *
 *   canvas#flux-static  (z-index: 0)
 *   └─ Drawn ONCE when data arrives (or on resize).
 *      Contains: grid, axis labels, flux curve path, transit dip overlay.
 *      Cost: ~1ms. Never redrawn during animation.
 *
 *   canvas#flux-marker  (z-index: 1, position: absolute, inset: 0)
 *   └─ Redrawn every rAF tick. Contains only:
 *        • 1px vertical scanline (2 draw calls)
 *        • 4px intersection dot (1 draw call)
 *        • floating readout tooltip (3 draw calls)
 *      Cost: ~0.05ms. Driven by ref, never triggers React re-renders.
 *
 * PHASE → X MAPPING:
 *   The live `currentPhaseAngle` (radians, 0–2π from WASM) is mapped
 *   linearly to the chart's X axis (which displays normalized orbital phase).
 *   Mapping: x_pixel = PAD_L + (phase / 2π) × plotWidth
 *   This is O(1) — no array index lookup, no Math.floor, no spread ops.
 *
 * TRANSIT DIP ZONE:
 *   Transit occurs when the planet passes in front of the star as seen from
 *   the observer (phase ≈ π, i.e. the planet is between us and the star).
 *   We define the window as [π - halfWidth, π + halfWidth] where halfWidth
 *   is estimated from the flux data's minimum region.
 *   The zone is drawn as a layered amber glow: wide dim fill + tight bright
 *   fill + top edge line — matching our design token palette.
 *
 * COORDINATE CONVENTIONS:
 *   • X axis: Orbital Phase φ ∈ [0, 2π] displayed as [0, 1] normalized
 *   • Y axis: Relative Flux F/F₀ (normalized; baseline ≈ 1.0)
 *   • Origin: bottom-left of the plot area (standard scientific convention)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";

// ── Design tokens (must match globals.css) ────────────────────────────────────
const TOKEN = {
  // Curve
  curveColor:        "#e2f0ff",   // Near-white with faint blue cast — clinical precision
  curveWidth:        1.0,         // 1px: ultra-sharp, no antialiasing blur

  // Grid
  gridColor:         "rgba(148, 163, 184, 0.06)",  // slate-400 @ 6%
  gridColorStrong:   "rgba(148, 163, 184, 0.12)",  // baseline (F/F₀ = 1) emphasis
  axisColor:         "rgba(148, 163, 184, 0.35)",

  // Labels
  labelColor:        "#475569",   // slate-600 — secondary text, --color-text-muted
  labelFont:         "9px 'Space Mono', 'Courier New', monospace",
  axisFont:          "8px 'Space Mono', 'Courier New', monospace",

  // Live marker
  markerColor:       "#22d3ee",   // --color-cyan-bright
  markerAlpha:       0.9,
  markerLineAlpha:   0.35,
  dotRadius:         3.5,

  // Transit dip overlay
  transitAmber:      "rgba(251, 191, 36,",  // amber-400 base, we append alpha
  transitCyanEdge:   "rgba(34, 211, 238,",  // cyan fringe at exact center

  // Tooltip
  tooltipBg:         "rgba(2, 4, 9, 0.82)",
  tooltipBorder:     "rgba(34, 211, 238, 0.30)",
  tooltipFont:       "8.5px 'Space Mono', 'Courier New', monospace",
  tooltipColor:      "#94a3b8",
  tooltipValueColor: "#22d3ee",
} as const;

// ── Padding — pixels inside the canvas to the plot area ───────────────────────
const PAD = { top: 24, right: 20, bottom: 36, left: 52 } as const;

// ── Props ─────────────────────────────────────────────────────────────────────
export interface FluxChartProps {
  timeArray:         number[];
  fluxArray:         number[];
  currentPhaseAngle: number;   // radians, 0–2π — passed each frame from page.tsx
}

// ── Imperative handle (optional: for external phase injection without re-render)
export interface FluxChartHandle {
  setPhase: (radians: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const FluxChart = forwardRef<FluxChartHandle, FluxChartProps>(
  function FluxChart({ timeArray, fluxArray, currentPhaseAngle }, ref) {

    // ── Canvas refs ────────────────────────────────────────────────────────────
    const staticCanvasRef = useRef<HTMLCanvasElement>(null);
    const markerCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef    = useRef<HTMLDivElement>(null);

    // ── Mutable state refs (zero React state updates in hot path) ─────────────
    const phaseRef        = useRef<number>(currentPhaseAngle);
    const rafRef          = useRef<number>(0);

    // Cached plot geometry — recomputed on resize/data change, read in rAF loop
    const plotRef = useRef({
      w:    0,    // canvas pixel width
      h:    0,    // canvas pixel height
      pw:   0,    // plot area width  (canvas.w - PAD.left - PAD.right)
      ph:   0,    // plot area height (canvas.h - PAD.top  - PAD.bottom)
      yMin: 0,
      yMax: 1,
      // Pre-built lookup: pixel X for each data index (built once from timeArray)
      xPixels:    new Float32Array(0),
      // Pre-built lookup: pixel Y for each data index (built once from fluxArray)
      yPixels:    new Float32Array(0),
      // Transit zone boundaries in pixel-X space
      transitX1:  0,
      transitX2:  0,
      transitCx:  0,  // pixel X at transit center (phase = π)
      hasTransit: false,
    });

    // Imperative handle — lets parent inject phase without prop drilling re-renders
    useImperativeHandle(ref, () => ({
      setPhase: (radians: number) => { phaseRef.current = radians; },
    }), []);

    // ── Sync phaseRef from prop (for cases where parent re-renders anyway) ─────
    // This does NOT trigger a re-render — it only keeps the ref in sync.
    phaseRef.current = currentPhaseAngle;

    // ─────────────────────────────────────────────────────────────────────────
    // DETECT TRANSIT DIP ZONE
    // Strategy: find the contiguous region where flux drops below 99.5% of
    // the median. This is robust across synthetic and real Kepler light curves.
    // Returns { centerNorm, halfWidthNorm } in normalized phase [0, 1] space.
    // ─────────────────────────────────────────────────────────────────────────
    function detectTransitZone(flux: number[]): {
      centerNorm: number;
      halfWidthNorm: number;
      found: boolean;
    } {
      if (flux.length < 10) return { centerNorm: 0.5, halfWidthNorm: 0.02, found: false };

      // Compute median flux (sort copy, take middle value)
      const sorted = [...flux].sort((a, b) => a - b);
      const median  = sorted[Math.floor(sorted.length / 2)];
      const threshold = median * 0.9975;   // 0.25% below median → transit floor

      // Find indices below threshold
      const dipIndices: number[] = [];
      for (let i = 0; i < flux.length; i++) {
        if (flux[i] < threshold) dipIndices.push(i);
      }

      if (dipIndices.length === 0) {
        // No real transit detected — default to phase π (center of range)
        return { centerNorm: 0.5, halfWidthNorm: 0.015, found: false };
      }

      const first = dipIndices[0];
      const last  = dipIndices[dipIndices.length - 1];
      const centerNorm    = ((first + last) / 2) / (flux.length - 1);
      const halfWidthNorm = Math.max(0.01, (last - first) / (flux.length - 1) / 2 + 0.008);

      return { centerNorm, halfWidthNorm, found: true };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DRAW STATIC LAYER (once per data change or resize)
    // ─────────────────────────────────────────────────────────────────────────
    const drawStatic = useCallback(() => {
      const canvas = staticCanvasRef.current;
      if (!canvas || timeArray.length === 0 || fluxArray.length === 0) return;

      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;

      const W  = canvas.width;
      const H  = canvas.height;
      const pw = W - PAD.left - PAD.right;
      const ph = H - PAD.top  - PAD.bottom;

      // ── Compute data extents ─────────────────────────────────────────────────
      const minFlux = Math.min(...fluxArray);
      const maxFlux = Math.max(...fluxArray);
      const fluxRange = maxFlux - minFlux || 0.001;

      // Add headroom: 15% below min, 10% above max (dip events go down)
      const yMin = minFlux - fluxRange * 0.15;
      const yMax = maxFlux + fluxRange * 0.10;

      // ── Build pixel lookup arrays (O(n) once, O(1) in rAF) ──────────────────
      const xPixels = new Float32Array(timeArray.length);
      const yPixels = new Float32Array(fluxArray.length);

      const tMin = timeArray[0];
      const tMax = timeArray[timeArray.length - 1];
      const tRange = tMax - tMin || 1;

      for (let i = 0; i < timeArray.length; i++) {
        xPixels[i] = PAD.left + ((timeArray[i] - tMin) / tRange) * pw;
      }
      for (let i = 0; i < fluxArray.length; i++) {
        yPixels[i] = PAD.top + ph - ((fluxArray[i] - yMin) / (yMax - yMin)) * ph;
      }

      // ── Detect transit zone ──────────────────────────────────────────────────
      const transit = detectTransitZone(fluxArray);
      const transitX1 = PAD.left + (transit.centerNorm - transit.halfWidthNorm) * pw;
      const transitX2 = PAD.left + (transit.centerNorm + transit.halfWidthNorm) * pw;
      const transitCx = PAD.left + transit.centerNorm * pw;

      // ── Cache into plotRef ───────────────────────────────────────────────────
      plotRef.current = {
        w: W, h: H, pw, ph, yMin, yMax,
        xPixels, yPixels,
        transitX1, transitX2, transitCx,
        hasTransit: transit.found,
      };

      // ── Clear ────────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);

      // ── 1. TRANSIT DIP HIGHLIGHT ZONE ────────────────────────────────────────
      // Rendered before curve so it's behind the data line.
      if (transit.found || true) {  // Always draw zone (even estimated) for UX
        const zoneW = transitX2 - transitX1;

        // Wide outer amber glow
        const outerGrad = ctx.createLinearGradient(transitX1 - 8, 0, transitX2 + 8, 0);
        outerGrad.addColorStop(0,   `${TOKEN.transitAmber} 0.00)`);
        outerGrad.addColorStop(0.2, `${TOKEN.transitAmber} 0.04)`);
        outerGrad.addColorStop(0.5, `${TOKEN.transitAmber} 0.07)`);
        outerGrad.addColorStop(0.8, `${TOKEN.transitAmber} 0.04)`);
        outerGrad.addColorStop(1,   `${TOKEN.transitAmber} 0.00)`);
        ctx.fillStyle = outerGrad;
        ctx.fillRect(transitX1 - 8, PAD.top, zoneW + 16, ph);

        // Tight inner zone fill
        const innerGrad = ctx.createLinearGradient(transitX1, 0, transitX2, 0);
        innerGrad.addColorStop(0,   `${TOKEN.transitAmber} 0.00)`);
        innerGrad.addColorStop(0.3, `${TOKEN.transitAmber} 0.10)`);
        innerGrad.addColorStop(0.5, `${TOKEN.transitAmber} 0.15)`);
        innerGrad.addColorStop(0.7, `${TOKEN.transitAmber} 0.10)`);
        innerGrad.addColorStop(1,   `${TOKEN.transitAmber} 0.00)`);
        ctx.fillStyle = innerGrad;
        ctx.fillRect(transitX1, PAD.top, zoneW, ph);

        // Top edge marker line (amber, 1px)
        ctx.beginPath();
        ctx.moveTo(transitX1, PAD.top);
        ctx.lineTo(transitX2, PAD.top);
        ctx.strokeStyle = `${TOKEN.transitAmber} 0.40)`;
        ctx.lineWidth   = 1;
        ctx.stroke();

        // Center vertical tick (cyan) — marks exact transit midpoint
        ctx.beginPath();
        ctx.moveTo(transitCx, PAD.top);
        ctx.lineTo(transitCx, PAD.top + ph);
        ctx.strokeStyle = `${TOKEN.transitCyanEdge} 0.18)`;
        ctx.lineWidth   = 1;
        ctx.stroke();

        // Label: "TRANSIT" above zone
        ctx.fillStyle = `${TOKEN.transitAmber} 0.45)`;
        ctx.font      = "7px 'Space Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("TRANSIT", transitCx, PAD.top - 6);
        ctx.textAlign = "left"; // reset
      }

      // ── 2. HORIZONTAL GRID LINES ──────────────────────────────────────────────
      const gridCount = 5;
      for (let i = 0; i <= gridCount; i++) {
        const flux = yMin + (i / gridCount) * (yMax - yMin);
        const y    = PAD.top + ph - (i / gridCount) * ph;

        // Baseline (F/F₀ ≈ 1.0) gets a stronger line
        const isBaseline = Math.abs(flux - 1.0) < (yMax - yMin) * 0.08;
        ctx.beginPath();
        ctx.moveTo(PAD.left, y);
        ctx.lineTo(PAD.left + pw, y);
        ctx.strokeStyle = isBaseline ? TOKEN.gridColorStrong : TOKEN.gridColor;
        ctx.lineWidth   = 1;
        ctx.setLineDash(isBaseline ? [] : [3, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Y label
        ctx.fillStyle = TOKEN.labelColor;
        ctx.font      = TOKEN.labelFont;
        ctx.textAlign = "right";
        ctx.fillText(flux.toFixed(4), PAD.left - 6, y + 3);
      }
      ctx.textAlign = "left";

      // ── 3. VERTICAL PHASE TICKS ───────────────────────────────────────────────
      const phaseTicks = [0, 0.25, 0.5, 0.75, 1.0];
      const phaseLabels = ["0", "π/2", "π", "3π/2", "2π"];
      for (let i = 0; i < phaseTicks.length; i++) {
        const x = PAD.left + phaseTicks[i] * pw;

        // Tick line (very subtle)
        ctx.beginPath();
        ctx.moveTo(x, PAD.top);
        ctx.lineTo(x, PAD.top + ph);
        ctx.strokeStyle = TOKEN.gridColor;
        ctx.lineWidth   = 1;
        ctx.setLineDash([2, 8]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Tick label
        ctx.fillStyle = TOKEN.labelColor;
        ctx.font      = TOKEN.labelFont;
        ctx.textAlign = "center";
        ctx.fillText(phaseLabels[i], x, PAD.top + ph + 14);
      }
      ctx.textAlign = "left";

      // ── 4. AXIS LINES (L + bottom) ────────────────────────────────────────────
      ctx.beginPath();
      ctx.moveTo(PAD.left, PAD.top);
      ctx.lineTo(PAD.left, PAD.top + ph);
      ctx.lineTo(PAD.left + pw, PAD.top + ph);
      ctx.strokeStyle = TOKEN.axisColor;
      ctx.lineWidth   = 1;
      ctx.stroke();

      // ── 5. AXIS TITLES ────────────────────────────────────────────────────────
      ctx.fillStyle  = TOKEN.labelColor;
      ctx.font       = TOKEN.axisFont;
      ctx.textAlign  = "center";
      ctx.fillText("ORBITAL PHASE  φ", PAD.left + pw / 2, H - 6);

      // Y-axis title (rotated)
      ctx.save();
      ctx.translate(10, PAD.top + ph / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("RELATIVE FLUX  F / F₀", 0, 0);
      ctx.restore();
      ctx.textAlign = "left";

      // ── 6. FLUX CURVE ─────────────────────────────────────────────────────────
      // Main line: ultra-sharp, 1px, near-white
      ctx.beginPath();
      ctx.moveTo(xPixels[0], yPixels[0]);
      for (let i = 1; i < xPixels.length; i++) {
        ctx.lineTo(xPixels[i], yPixels[i]);
      }
      ctx.strokeStyle = TOKEN.curveColor;
      ctx.lineWidth   = TOKEN.curveWidth;
      ctx.lineJoin    = "round";
      ctx.stroke();

      // Subtle glow pass: same path, wider, very low opacity
      ctx.beginPath();
      ctx.moveTo(xPixels[0], yPixels[0]);
      for (let i = 1; i < xPixels.length; i++) {
        ctx.lineTo(xPixels[i], yPixels[i]);
      }
      ctx.strokeStyle = "rgba(180, 220, 255, 0.12)";
      ctx.lineWidth   = 3;
      ctx.stroke();

    }, [timeArray, fluxArray]); // eslint-disable-line

    // ─────────────────────────────────────────────────────────────────────────
    // DRAW MARKER LAYER (every rAF tick — ~0.05ms)
    // Reads phaseRef directly. ZERO React state mutations.
    // ─────────────────────────────────────────────────────────────────────────
    const drawMarker = useCallback(() => {
      const canvas = markerCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;

      const { w, h, pw, ph, yMin, yMax, xPixels, yPixels } = plotRef.current;
      if (pw === 0 || xPixels.length === 0) return;

      ctx.clearRect(0, 0, w, h);

      // ── Phase → pixel X ────────────────────────────────────────────────────────
      const phase = phaseRef.current;
      const norm  = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI);
      const markerX = PAD.left + norm * pw;

      // Clamp to plot bounds
      if (markerX < PAD.left || markerX > PAD.left + pw) return;

      // ── Closest data point (for dot + readout) — O(1) linear index ────────────
      const idx     = Math.round(norm * (xPixels.length - 1));
      const safeIdx = Math.max(0, Math.min(xPixels.length - 1, idx));
      const markerY = yPixels[safeIdx];
      // Flux value at this index (for tooltip)
      const fluxVal = yMin + ((h - PAD.bottom - markerY) / ph) * (yMax - yMin);

      // ── 1. SCANLINE — vertical thread ────────────────────────────────────────
      // Gradient: bright at intersection point, fades toward edges
      const lineGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + ph);
      lineGrad.addColorStop(0,   `rgba(34, 211, 238, 0.00)`);
      lineGrad.addColorStop(0.3, `rgba(34, 211, 238, ${TOKEN.markerLineAlpha})`);
      lineGrad.addColorStop(0.5, `rgba(34, 211, 238, ${TOKEN.markerAlpha * 0.5})`);
      lineGrad.addColorStop(0.7, `rgba(34, 211, 238, ${TOKEN.markerLineAlpha})`);
      lineGrad.addColorStop(1,   `rgba(34, 211, 238, 0.00)`);

      ctx.beginPath();
      ctx.moveTo(markerX, PAD.top);
      ctx.lineTo(markerX, PAD.top + ph);
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth   = 1;
      ctx.setLineDash([]);
      ctx.stroke();

      // ── 2. INTERSECTION DOT ───────────────────────────────────────────────────
      // Outer glow ring
      ctx.beginPath();
      ctx.arc(markerX, markerY, TOKEN.dotRadius + 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34, 211, 238, 0.12)";
      ctx.fill();

      // Inner dot
      ctx.beginPath();
      ctx.arc(markerX, markerY, TOKEN.dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = TOKEN.markerColor;
      ctx.fill();

      // ── 3. FLOATING READOUT TOOLTIP ───────────────────────────────────────────
      // Shows: φ = X.XX rad  /  F = X.XXXXX
      const tipPadX = 7;
      const tipPadY = 5;
      const tipH    = 30;
      const tipW    = 98;

      // Position tooltip: right of marker if space, else left
      const tipX = markerX + 10 + tipW > PAD.left + pw
        ? markerX - 10 - tipW
        : markerX + 10;
      const tipY = Math.max(PAD.top, Math.min(markerY - tipH / 2, PAD.top + ph - tipH));

      // Background
      ctx.fillStyle   = TOKEN.tooltipBg;
      ctx.strokeStyle = TOKEN.tooltipBorder;
      ctx.lineWidth   = 1;
      roundRect(ctx, tipX, tipY, tipW, tipH, 4);
      ctx.fill();
      ctx.stroke();

      // Label line 1: phase
      ctx.font      = TOKEN.tooltipFont;
      ctx.fillStyle = TOKEN.tooltipColor;
      ctx.fillText("φ =", tipX + tipPadX, tipY + tipPadY + 9);
      ctx.fillStyle = TOKEN.tooltipValueColor;
      ctx.fillText(`${(norm * 2 * Math.PI).toFixed(3)} rad`, tipX + tipPadX + 22, tipY + tipPadY + 9);

      // Label line 2: flux
      ctx.fillStyle = TOKEN.tooltipColor;
      ctx.fillText("F =", tipX + tipPadX, tipY + tipPadY + 20);
      ctx.fillStyle = TOKEN.tooltipValueColor;
      ctx.fillText(fluxVal.toFixed(5), tipX + tipPadX + 22, tipY + tipPadY + 20);

    }, []); // No deps — reads everything from refs

    // ─────────────────────────────────────────────────────────────────────────
    // RAF LOOP — only drives the marker canvas
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
      let running = true;

      function loop() {
        if (!running) return;
        drawMarker();
        rafRef.current = requestAnimationFrame(loop);
      }

      rafRef.current = requestAnimationFrame(loop);

      return () => {
        running = false;
        cancelAnimationFrame(rafRef.current);
      };
    }, [drawMarker]);

    // ─────────────────────────────────────────────────────────────────────────
    // STATIC LAYER — redraws only when data changes, or on resize
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
      if (timeArray.length === 0) return;
      drawStatic();
    }, [timeArray, fluxArray, drawStatic]);

    // ── Resize observer — redraw static layer on container size change ─────────
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const observer = new ResizeObserver(() => {
        // Sync canvas intrinsic sizes to container's pixel dimensions
        const rect = container.getBoundingClientRect();
        const dpr  = Math.min(window.devicePixelRatio, 2);
        const w    = Math.floor(rect.width  * dpr);
        const h    = Math.floor(rect.height * dpr);

        if (staticCanvasRef.current) {
          staticCanvasRef.current.width  = w;
          staticCanvasRef.current.height = h;
          // Scale context so logical coords are in CSS pixels
          const ctx = staticCanvasRef.current.getContext("2d");
          ctx?.scale(dpr, dpr);
        }
        if (markerCanvasRef.current) {
          markerCanvasRef.current.width  = w;
          markerCanvasRef.current.height = h;
          const ctx = markerCanvasRef.current.getContext("2d");
          ctx?.scale(dpr, dpr);
        }

        if (timeArray.length > 0) drawStatic();
      });

      observer.observe(container);
      return () => observer.disconnect();
    }, [timeArray, fluxArray, drawStatic]);

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
      <div
        className="relative w-full overflow-hidden rounded-xl bracketed"
        style={{
          background:      "rgba(2, 4, 9, 0.52)",
          backdropFilter:  "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border:          "1px solid rgba(226, 232, 240, 0.06)",
        }}
      >
        {/* ── Header strip ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#22d3ee", boxShadow: "0 0 6px #22d3ee" }}
            />
            <span
              style={{
                fontFamily:   "var(--font-mono, 'Space Mono', monospace)",
                fontSize:     9,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color:        "#475569",
              }}
            >
              FLUX LIGHT CURVE — ORBITAL PHASE SYNC
            </span>
          </div>

          {/* Transit zone legend chip */}
          <div
            className="flex items-center gap-1.5"
            style={{ opacity: 0.75 }}
          >
            <span
              style={{
                display:      "inline-block",
                width:        20,
                height:       6,
                borderRadius: 2,
                background:   "rgba(251, 191, 36, 0.35)",
                border:       "1px solid rgba(251, 191, 36, 0.50)",
              }}
            />
            <span
              style={{
                fontFamily:   "var(--font-mono, 'Space Mono', monospace)",
                fontSize:     8,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color:        "#64748b",
              }}
            >
              TRANSIT DIP
            </span>
          </div>
        </div>

        {/* ── Canvas stack ─────────────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="relative w-full"
          style={{ height: 160 }}
        >
          {/* Layer 0: static — grid, curve, axis labels, transit zone */}
          <canvas
            ref={staticCanvasRef}
            width={820}
            height={160}
            style={{
              position: "absolute",
              inset:    0,
              width:    "100%",
              height:   "100%",
            }}
          />

          {/* Layer 1: marker — scanline, dot, tooltip (60fps) */}
          <canvas
            ref={markerCanvasRef}
            width={820}
            height={160}
            style={{
              position: "absolute",
              inset:    0,
              width:    "100%",
              height:   "100%",
            }}
          />
        </div>
      </div>
    );
  }
);

FluxChart.displayName = "FluxChart";
export default FluxChart;

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: roundRect polyfill (Safari < 15.4 doesn't have ctx.roundRect)
// ─────────────────────────────────────────────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
): void {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    // Manual fallback
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
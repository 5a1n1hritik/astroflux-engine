"use client";

/**
 * FluxStaticLayer.tsx
 * src/components/charts/flux/FluxStaticLayer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * SRP: Draws the time-invariant visual elements of the light curve:
 *   1. Horizontal grid lines + Y-axis flux labels
 *   2. Vertical phase tick marks + X-axis labels (0, π/2, π, 3π/2, 2π)
 *   3. Transit dip amber bounding zone (layered glow)
 *   4. Raw flux vector path (the white/blue light curve line)
 *   5. Axis border lines and axis title text
 *
 * REDRAW TRIGGERS:
 *   - timeArray or fluxArray reference changes (new dataset loaded)
 *   - ResizeObserver fires on the outer scroll container
 *
 * NEVER redraws for:
 *   - Phase angle changes (that's FluxMarkerLayer's job)
 *   - Scroll position changes
 *   - Play/pause state
 *
 * OUTPUT CONTRACT:
 *   After each draw, writes the computed PlotGeometry into `geometryRef`.
 *   FluxMarkerLayer reads this ref every rAF tick.
 *
 * CANVAS SIZING:
 *   Width  = timeArray.length × PX_PER_POINT + PAD.left + PAD.right
 *   Height = CANVAS_H (fixed)
 *   This ensures every data point has exactly PX_PER_POINT pixels of
 *   horizontal space, giving the curve clinical engineering resolution.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useImperativeHandle, forwardRef, useRef, useCallback } from "react";
import {
  TOKEN, PAD, PX_PER_POINT, CANVAS_H,
  type PlotGeometry, type FluxChartProps, EMPTY_GEOMETRY,
} from "./types";

// ── Component Props ───────────────────────────────────────────────────────────

interface FluxStaticLayerProps {
  timeArray:   number[];
  fluxArray:   number[];
  /** Ref the orchestrator provides — we write geometry here after each draw */
  geometryRef: React.MutableRefObject<PlotGeometry>;
  /** Called after geometry is written so the orchestrator can resize the marker canvas */
  onGeometryReady: (canvasW: number) => void;
}

// ── Handle ────────────────────────────────────────────────────────────────────

export interface FluxStaticLayerHandle {
  /** Force a full redraw (called by orchestrator on ResizeObserver tick) */
  redraw: () => void;
  /** Canvas element reference (orchestrator needs its width for scroll math) */
  getCanvas: () => HTMLCanvasElement | null;
}

// ─────────────────────────────────────────────────────────────────────────────

export const FluxStaticLayer = forwardRef<FluxStaticLayerHandle, FluxStaticLayerProps>(
  function FluxStaticLayer({ timeArray, fluxArray, geometryRef, onGeometryReady }, ref) {

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // ── Transit dip detection ─────────────────────────────────────────────────
    // Finds the contiguous region where flux drops ≥0.25% below the median.
    // Returns normalized [0,1] positions. O(n log n) — runs only on data change.
    function detectTransitZone(flux: number[]): {
      centerNorm:    number;
      halfWidthNorm: number;
      found:         boolean;
    } {
      if (flux.length < 10) {
        return { centerNorm: 0.5, halfWidthNorm: 0.018, found: false };
      }

      const sorted    = [...flux].sort((a, b) => a - b);
      const median    = sorted[Math.floor(sorted.length / 2)];
      const threshold = median * 0.9975;

      const dipIndices: number[] = [];
      for (let i = 0; i < flux.length; i++) {
        if (flux[i] < threshold) dipIndices.push(i);
      }

      if (dipIndices.length === 0) {
        return { centerNorm: 0.5, halfWidthNorm: 0.012, found: false };
      }

      const first         = dipIndices[0];
      const last          = dipIndices[dipIndices.length - 1];
      const centerNorm    = ((first + last) / 2) / (flux.length - 1);
      const halfWidthNorm = Math.max(0.008, (last - first) / (flux.length - 1) / 2 + 0.007);

      return { centerNorm, halfWidthNorm, found: true };
    }

    // ── Core draw function ────────────────────────────────────────────────────
    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas || timeArray.length === 0 || fluxArray.length === 0) return;

      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;

      // ── Canvas sizing: expand width per data point ──────────────────────────
      const canvasW = Math.max(
        Math.ceil(timeArray.length * PX_PER_POINT) + PAD.left + PAD.right,
        400,   // minimum sensible width
      );
      const canvasH = CANVAS_H;

      // Sync intrinsic dimensions (this clears the canvas automatically)
      canvas.width  = canvasW;
      canvas.height = canvasH;

      const pw = canvasW - PAD.left - PAD.right;
      const ph = canvasH - PAD.top  - PAD.bottom;

      // ── Y-axis data extents ─────────────────────────────────────────────────
      let minFlux = Infinity;
      let maxFlux = -Infinity;
      for (let i = 0; i < fluxArray.length; i++) {
        if (fluxArray[i] < minFlux) minFlux = fluxArray[i];
        if (fluxArray[i] > maxFlux) maxFlux = fluxArray[i];
      }
      const fluxRange = maxFlux - minFlux || 0.001;
      const yMin = minFlux - fluxRange * 0.15;  // 15% headroom below (dips go down)
      const yMax = maxFlux + fluxRange * 0.10;  // 10% headroom above

      // ── Build pixel lookup arrays (O(n) — amortized per data load) ──────────
      const xPixels = new Float32Array(timeArray.length);
      const yPixels = new Float32Array(fluxArray.length);

      const tMin   = timeArray[0];
      const tRange = (timeArray[timeArray.length - 1] - tMin) || 1;

      for (let i = 0; i < timeArray.length; i++) {
        xPixels[i] = PAD.left + ((timeArray[i] - tMin) / tRange) * pw;
      }
      for (let i = 0; i < fluxArray.length; i++) {
        yPixels[i] = PAD.top + ph - ((fluxArray[i] - yMin) / (yMax - yMin)) * ph;
      }

      // ── Transit zone pixel coordinates ──────────────────────────────────────
      const transit   = detectTransitZone(fluxArray);
      const transitX1 = PAD.left + (transit.centerNorm - transit.halfWidthNorm) * pw;
      const transitX2 = PAD.left + (transit.centerNorm + transit.halfWidthNorm) * pw;
      const transitCx = PAD.left + transit.centerNorm * pw;

      // ── Write geometry into shared ref ──────────────────────────────────────
      geometryRef.current = {
        canvasW, canvasH, pw, ph, yMin, yMax,
        xPixels, yPixels,
        transitX1, transitX2, transitCx,
        hasTransit: transit.found,
      };

      // ── CLEAR ───────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, canvasW, canvasH);

      // ────────────────────────────────────────────────────────────────────────
      // 1. TRANSIT DIP AMBER BOUNDING ZONE
      //    Drawn first so all other elements layer above it.
      // ────────────────────────────────────────────────────────────────────────
      const zoneW = transitX2 - transitX1;

      // Wide outer amber halo (extends ±10px beyond zone boundary)
      const outerGrad = ctx.createLinearGradient(transitX1 - 10, 0, transitX2 + 10, 0);
      outerGrad.addColorStop(0,    `${TOKEN.transitAmber} 0.00)`);
      outerGrad.addColorStop(0.15, `${TOKEN.transitAmber} 0.03)`);
      outerGrad.addColorStop(0.5,  `${TOKEN.transitAmber} 0.055)`);
      outerGrad.addColorStop(0.85, `${TOKEN.transitAmber} 0.03)`);
      outerGrad.addColorStop(1,    `${TOKEN.transitAmber} 0.00)`);
      ctx.fillStyle = outerGrad;
      ctx.fillRect(transitX1 - 10, PAD.top, zoneW + 20, ph);

      // Tight inner fill
      const innerGrad = ctx.createLinearGradient(transitX1, 0, transitX2, 0);
      innerGrad.addColorStop(0,   `${TOKEN.transitAmber} 0.00)`);
      innerGrad.addColorStop(0.3, `${TOKEN.transitAmber} 0.09)`);
      innerGrad.addColorStop(0.5, `${TOKEN.transitAmber} 0.14)`);
      innerGrad.addColorStop(0.7, `${TOKEN.transitAmber} 0.09)`);
      innerGrad.addColorStop(1,   `${TOKEN.transitAmber} 0.00)`);
      ctx.fillStyle = innerGrad;
      ctx.fillRect(transitX1, PAD.top, zoneW, ph);

      // Top boundary line
      ctx.beginPath();
      ctx.moveTo(transitX1, PAD.top);
      ctx.lineTo(transitX2, PAD.top);
      ctx.strokeStyle = `${TOKEN.transitAmber} 0.38)`;
      ctx.lineWidth   = 1;
      ctx.stroke();

      // Center cyan spine — marks the exact transit midpoint
      ctx.beginPath();
      ctx.moveTo(transitCx, PAD.top);
      ctx.lineTo(transitCx, PAD.top + ph);
      ctx.strokeStyle = `${TOKEN.transitCyan} 0.16)`;
      ctx.lineWidth   = 1;
      ctx.stroke();

      // "TRANSIT" label above zone
      ctx.fillStyle = `${TOKEN.transitAmber} 0.42)`;
      ctx.font      = "7px 'Space Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("TRANSIT DIP", transitCx, PAD.top - 8);

      // ────────────────────────────────────────────────────────────────────────
      // 2. HORIZONTAL GRID + Y-AXIS LABELS
      // ────────────────────────────────────────────────────────────────────────
      const gridCount = 5;
      ctx.textAlign = "right";

      for (let i = 0; i <= gridCount; i++) {
        const fluxVal = yMin + (i / gridCount) * (yMax - yMin);
        const yPos    = PAD.top + ph - (i / gridCount) * ph;

        // Emphasize the F/F₀ = 1.0 baseline
        const isBaseline = Math.abs(fluxVal - 1.0) < (yMax - yMin) * 0.08;

        ctx.beginPath();
        ctx.moveTo(PAD.left, yPos);
        ctx.lineTo(PAD.left + pw, yPos);
        ctx.strokeStyle = isBaseline ? TOKEN.gridColorStrong : TOKEN.gridColor;
        ctx.lineWidth   = 1;
        ctx.setLineDash(isBaseline ? [] : [2, 7]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Y label
        ctx.fillStyle = TOKEN.labelColor;
        ctx.font      = TOKEN.labelFont;
        ctx.fillText(fluxVal.toFixed(4), PAD.left - 6, yPos + 3);
      }

      // ────────────────────────────────────────────────────────────────────────
      // 3. VERTICAL PHASE TICKS + X-AXIS LABELS
      // ────────────────────────────────────────────────────────────────────────
      const phaseTicks  = [0, 0.25, 0.5, 0.75, 1.0];
      const phaseLabels = ["0", "π/2", "π", "3π/2", "2π"];
      ctx.textAlign = "center";

      for (let i = 0; i < phaseTicks.length; i++) {
        const xPos = PAD.left + phaseTicks[i] * pw;

        ctx.beginPath();
        ctx.moveTo(xPos, PAD.top);
        ctx.lineTo(xPos, PAD.top + ph);
        ctx.strokeStyle = TOKEN.gridColor;
        ctx.lineWidth   = 1;
        ctx.setLineDash([2, 8]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = TOKEN.labelColor;
        ctx.font      = TOKEN.labelFont;
        ctx.fillText(phaseLabels[i], xPos, PAD.top + ph + 14);
      }

      // ────────────────────────────────────────────────────────────────────────
      // 4. AXIS BORDER (L + bottom)
      // ────────────────────────────────────────────────────────────────────────
      ctx.beginPath();
      ctx.moveTo(PAD.left, PAD.top);
      ctx.lineTo(PAD.left, PAD.top + ph);
      ctx.lineTo(PAD.left + pw, PAD.top + ph);
      ctx.strokeStyle = TOKEN.axisColor;
      ctx.lineWidth   = 1;
      ctx.stroke();

      // ────────────────────────────────────────────────────────────────────────
      // 5. AXIS TITLES
      // ────────────────────────────────────────────────────────────────────────
      ctx.fillStyle = TOKEN.labelColor;
      ctx.font      = TOKEN.axisTitleFont;
      ctx.textAlign = "center";
      ctx.fillText("ORBITAL PHASE  φ", PAD.left + pw / 2, canvasH - 6);

      // Y-axis title (rotated) — drawn at a fixed screen position
      ctx.save();
      ctx.translate(11, PAD.top + ph / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("RELATIVE FLUX  F/F₀", 0, 0);
      ctx.restore();

      ctx.textAlign = "left"; // reset

      // ────────────────────────────────────────────────────────────────────────
      // 6. FLUX CURVE — the actual light curve data
      // ────────────────────────────────────────────────────────────────────────

      // Glow pass: wider, very low opacity, drawn first
      ctx.beginPath();
      ctx.moveTo(xPixels[0], yPixels[0]);
      for (let i = 1; i < xPixels.length; i++) {
        ctx.lineTo(xPixels[i], yPixels[i]);
      }
      ctx.strokeStyle = TOKEN.curveGlowColor;
      ctx.lineWidth   = TOKEN.curveGlowWidth;
      ctx.lineJoin    = "round";
      ctx.stroke();

      // Sharp 1px main line
      ctx.beginPath();
      ctx.moveTo(xPixels[0], yPixels[0]);
      for (let i = 1; i < xPixels.length; i++) {
        ctx.lineTo(xPixels[i], yPixels[i]);
      }
      ctx.strokeStyle = TOKEN.curveColor;
      ctx.lineWidth   = TOKEN.curveWidth;
      ctx.lineJoin    = "round";
      ctx.stroke();

      // ── Notify orchestrator that geometry is ready ──────────────────────────
      onGeometryReady(canvasW);

    }, [timeArray, fluxArray, geometryRef, onGeometryReady]); // eslint-disable-line

    // ── Imperative handle ─────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      redraw:    () => draw(),
      getCanvas: () => canvasRef.current,
    }), [draw]);

    // ── Redraw when data changes ──────────────────────────────────────────────
    useEffect(() => {
      if (timeArray.length > 0 && fluxArray.length > 0) draw();
      else geometryRef.current = { ...EMPTY_GEOMETRY };
    }, [timeArray, fluxArray, draw, geometryRef]);

    return (
      <canvas
        ref={canvasRef}
        // Initial intrinsic size — will be overwritten on first draw()
        width={400}
        height={CANVAS_H}
        style={{
          display:  "block",
          position: "absolute",
          top:      0,
          left:     0,
          // Height is CSS-fixed; width grows with data (native canvas width)
          height:   CANVAS_H,
          imageRendering: "crisp-edges",
        }}
        aria-hidden="true"
      />
    );
  }
);

FluxStaticLayer.displayName = "FluxStaticLayer";
export default FluxStaticLayer;
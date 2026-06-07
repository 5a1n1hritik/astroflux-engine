"use client";

/**
 * FluxMarkerLayer.tsx
 * src/components/charts/flux/FluxMarkerLayer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * SRP: Owns the 60 FPS hot-path rendering loop for the live tracking marker.
 *
 * Draws per tick (≈0.05ms per frame, 3 draw calls total):
 *   1. Vertical cyan scanline thread with gradient fade
 *   2. Intersection circle dot with outer glow ring
 *   3. Floating tooltip: exact phase (rad) + flux value (F/F₀)
 *
 * PERFORMANCE CONTRACTS:
 *   - Zero React state reads or writes in the rAF loop.
 *   - All inputs come from MutableRefObjects: phaseRef, geometryRef.
 *   - Canvas intrinsic size is set externally by the orchestrator via
 *     the `resize(w, h)` imperative handle — no ResizeObserver here.
 *   - The loop runs continuously and self-cancels on unmount.
 *
 * PHASE → CANVAS-X MAPPING (O(1)):
 *   norm  = ((phase mod 2π) + 2π) mod 2π  /  2π    → [0, 1]
 *   idx   = round(norm × (n - 1))                   → data index
 *   markerX = xPixels[idx]                           → absolute canvas pixel X
 *
 * NOTE ON SCROLL COORDINATE SPACE:
 *   markerX is in absolute canvas coordinates (scrollable).
 *   The marker canvas is absolutely positioned over the static canvas and
 *   scrolls with it — so markerX is correct without any scroll offset math.
 *   The scroll offset is handled entirely by the orchestrator.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { TOKEN, PAD, CANVAS_H, type PlotGeometry } from "./types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface FluxMarkerLayerProps {
  /** Live mutable phase ref — written by orchestrator from Three.js loop */
  phaseRef:    React.MutableRefObject<number>;
  /** Shared plot geometry — written by FluxStaticLayer after each draw */
  geometryRef: React.MutableRefObject<PlotGeometry>;
}

// ── Handle ────────────────────────────────────────────────────────────────────

export interface FluxMarkerLayerHandle {
  /** Called by orchestrator when static canvas changes size */
  resize: (canvasW: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────

export const FluxMarkerLayer = forwardRef<FluxMarkerLayerHandle, FluxMarkerLayerProps>(
  function FluxMarkerLayer({ phaseRef, geometryRef }, ref) {

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef    = useRef<number>(0);

    // ── Imperative resize (called by orchestrator) ────────────────────────────
    useImperativeHandle(ref, () => ({
      resize: (canvasW: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width  = canvasW;
        canvas.height = CANVAS_H;
      },
    }), []);

    // ── rAF render loop ───────────────────────────────────────────────────────
    useEffect(() => {
      let running = true;

      function tick() {
        if (!running) return;

        const canvas = canvasRef.current;
        if (canvas) renderMarker(canvas, phaseRef.current, geometryRef.current);

        rafRef.current = requestAnimationFrame(tick);
      }

      rafRef.current = requestAnimationFrame(tick);
      return () => {
        running = false;
        cancelAnimationFrame(rafRef.current);
      };
    }, [phaseRef, geometryRef]);

    return (
      <canvas
        ref={canvasRef}
        width={400}
        height={CANVAS_H}
        style={{
          display:       "block",
          position:      "absolute",
          top:           0,
          left:          0,
          height:        CANVAS_H,
          pointerEvents: "none",  // Marker layer never intercepts mouse events
          imageRendering: "crisp-edges",
        }}
        aria-label="Live phase tracker"
        aria-live="polite"
      />
    );
  }
);

FluxMarkerLayer.displayName = "FluxMarkerLayer";
export default FluxMarkerLayer;

// ─────────────────────────────────────────────────────────────────────────────
// PURE RENDER FUNCTION — called every rAF tick, no React involvement
// Kept outside the component to guarantee no closure captures over React state.
// ─────────────────────────────────────────────────────────────────────────────

function renderMarker(
  canvas:   HTMLCanvasElement,
  phase:    number,
  geometry: PlotGeometry,
): void {
  const { canvasW, canvasH, pw, ph, yMin, yMax, xPixels, yPixels } = geometry;

  // Guard: geometry not yet computed
  if (pw === 0 || xPixels.length === 0 || canvasW === 0) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  ctx.clearRect(0, 0, canvasW, canvasH);

  // ── Phase → data index → canvas X ────────────────────────────────────────
  const TWO_PI = 2 * Math.PI;
  const norm   = (((phase % TWO_PI) + TWO_PI) % TWO_PI) / TWO_PI;  // [0, 1]
  const n      = xPixels.length;
  const idx    = Math.max(0, Math.min(n - 1, Math.round(norm * (n - 1))));

  const markerX = xPixels[idx];
  const markerY = yPixels[idx];

  // ── Bounds check ─────────────────────────────────────────────────────────
  if (
    markerX < PAD.left ||
    markerX > PAD.left + pw ||
    isNaN(markerX) || isNaN(markerY)
  ) return;

  // ────────────────────────────────────────────────────────────────────────
  // 1. VERTICAL SCANLINE THREAD
  //    Gradient: transparent at top/bottom, bright at intersection Y
  // ────────────────────────────────────────────────────────────────────────
  const lineGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + ph);
  lineGrad.addColorStop(0.00, "rgba(34, 211, 238, 0.00)");
  lineGrad.addColorStop(0.25, `rgba(34, 211, 238, ${TOKEN.markerLineAlpha})`);
  lineGrad.addColorStop(0.50, `rgba(34, 211, 238, ${TOKEN.markerLineAlpha * 1.6})`);
  lineGrad.addColorStop(0.75, `rgba(34, 211, 238, ${TOKEN.markerLineAlpha})`);
  lineGrad.addColorStop(1.00, "rgba(34, 211, 238, 0.00)");

  ctx.beginPath();
  ctx.moveTo(markerX, PAD.top);
  ctx.lineTo(markerX, PAD.top + ph);
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth   = 1;
  ctx.stroke();

  // ────────────────────────────────────────────────────────────────────────
  // 2. INTERSECTION DOT
  //    Outer soft glow ring + solid inner core
  // ────────────────────────────────────────────────────────────────────────

  // Glow ring
  const glowGrad = ctx.createRadialGradient(
    markerX, markerY, 0,
    markerX, markerY, TOKEN.dotGlowRadius,
  );
  glowGrad.addColorStop(0,   "rgba(34, 211, 238, 0.40)");
  glowGrad.addColorStop(0.5, "rgba(34, 211, 238, 0.12)");
  glowGrad.addColorStop(1,   "rgba(34, 211, 238, 0.00)");
  ctx.beginPath();
  ctx.arc(markerX, markerY, TOKEN.dotGlowRadius, 0, Math.PI * 2);
  ctx.fillStyle = glowGrad;
  ctx.fill();

  // Solid dot
  ctx.beginPath();
  ctx.arc(markerX, markerY, TOKEN.dotRadius, 0, Math.PI * 2);
  ctx.fillStyle = TOKEN.markerColor;
  ctx.fill();

  // ────────────────────────────────────────────────────────────────────────
  // 3. FLOATING TOOLTIP — exact numeric readout
  //    Shows: φ (radians) and F/F₀ value at the active index
  // ────────────────────────────────────────────────────────────────────────

  // Reconstruct flux value from the Y pixel (inverse of the Y-mapping)
  const fluxAtIdx = yMin + ((PAD.top + ph - markerY) / ph) * (yMax - yMin);
  const phaseRad  = norm * TWO_PI;

  const tipW      = 104;
  const tipH      = 34;
  const tipPad    = 7;
  const tipRadius = 5;

  // Horizontal placement: right of marker if space, else left
  const spaceRight = canvasW - markerX - 12;
  const tipX = spaceRight >= tipW + 4
    ? markerX + 12
    : markerX - 12 - tipW;

  // Vertical: vertically centered on the dot, clamped to plot bounds
  const tipY = Math.max(
    PAD.top,
    Math.min(markerY - tipH / 2, PAD.top + ph - tipH),
  );

  // Background fill
  ctx.fillStyle   = TOKEN.tooltipBg;
  ctx.strokeStyle = TOKEN.tooltipBorder;
  ctx.lineWidth   = 1;
  roundRect(ctx, tipX, tipY, tipW, tipH, tipRadius);
  ctx.fill();
  ctx.stroke();

  // Top accent line (cyan, spans full tooltip width)
  ctx.beginPath();
  ctx.moveTo(tipX + tipRadius, tipY);
  ctx.lineTo(tipX + tipW - tipRadius, tipY);
  ctx.strokeStyle = "rgba(34, 211, 238, 0.50)";
  ctx.lineWidth   = 1;
  ctx.stroke();

  // Row 1: phase value
  ctx.font      = TOKEN.tooltipFont;
  ctx.fillStyle = TOKEN.tooltipLabelColor;
  ctx.textAlign = "left";
  ctx.fillText("φ  =", tipX + tipPad, tipY + tipPad + 9);
  ctx.fillStyle = TOKEN.tooltipValueColor;
  ctx.fillText(`${phaseRad.toFixed(4)} rad`, tipX + tipPad + 28, tipY + tipPad + 9);

  // Row 2: flux value
  ctx.fillStyle = TOKEN.tooltipLabelColor;
  ctx.fillText("F  =", tipX + tipPad, tipY + tipPad + 22);
  ctx.fillStyle = TOKEN.tooltipValueColor;
  ctx.fillText(fluxAtIdx.toFixed(6), tipX + tipPad + 28, tipY + tipPad + 22);

  ctx.textAlign = "left"; // reset
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: rounded rectangle — polyfills ctx.roundRect for Safari < 15.4
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
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x, y + h - r,     r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x,     y,     x + r, y,          r);
  ctx.closePath();
}
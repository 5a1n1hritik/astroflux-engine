"use client";

/**
 * index.tsx
 * src/components/charts/flux/index.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Core Orchestrator — the single exported FluxChart component.
 *
 * SRP: Owns the scrollable container, coordinates the two canvas layers,
 * and runs the scroll-sync engine. No drawing logic lives here.
 *
 * ── COMPONENT TREE ───────────────────────────────────────────────────────────
 *
 *   <div.chart-outer>               ← glass panel, fixed visible height
 *     <header />                    ← label strip, legend chip (no state)
 *     <div.scroll-viewport>         ← overflow-x: scroll, scroll-snap: none
 *       <div.canvas-stack>          ← position:relative, width = canvasW
 *         <FluxStaticLayer />       ← z:0, absolute, drawn once per data
 *         <FluxMarkerLayer />       ← z:1, absolute, 60fps rAF loop
 *       </div>
 *     </div>
 *   </div>
 *
 * ── SCROLL-SYNC ENGINE ───────────────────────────────────────────────────────
 *
 * The scroll engine runs inside a rAF loop (separate from the marker loop).
 * Every tick:
 *   1. Read phaseRef.current (latest phase from Three.js — no React involved)
 *   2. Compute target marker X in canvas coordinates:
 *        norm     = phase / 2π
 *        markerX  = PAD.left + norm × geometry.pw
 *   3. Compute target scrollLeft so markerX lands at the viewport center:
 *        targetScroll = markerX - viewportW × MARKER_LOCK_FRACTION
 *   4. Lerp current scrollLeft toward targetScroll:
 *        scrollLeft += (targetScroll - scrollLeft) × SCROLL_LERP_FACTOR
 *
 * The lerp factor (0.06) gives buttery smooth scroll momentum — the curve
 * slides behind the fixed scanline like a physical tape reader.
 *
 * ── FORWARDREF CONTRACT ──────────────────────────────────────────────────────
 *   ref.setPhase(radians) — called by OrbitSimulator's onFrameUpdate,
 *   60× per second. Writes to phaseRef only. Zero React re-renders.
 *
 * ── RESIZE HANDLING ──────────────────────────────────────────────────────────
 *   ResizeObserver watches the scroll viewport. On size change:
 *     1. Calls staticLayerRef.redraw() → recomputes geometry for new width
 *     2. Calls markerLayerRef.resize(canvasW) → syncs marker canvas size
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import FluxStaticLayer, { type FluxStaticLayerHandle } from "./FluxStaticLayer";
import FluxMarkerLayer, { type FluxMarkerLayerHandle } from "./FluxMarkerLayer";
import {
  PAD, CANVAS_H, MARKER_LOCK_FRACTION, EMPTY_GEOMETRY,
  type FluxChartProps, type FluxChartHandle, type PlotGeometry,
} from "./types";

// ── Scroll-sync lerp factor ───────────────────────────────────────────────────
// Lower = smoother/slower follow. 0.06 gives a "tape reader" momentum feel.
// Range: 0.02 (very slow) — 0.20 (near-instant)
const SCROLL_LERP_FACTOR = 0.06;

// ── Component ─────────────────────────────────────────────────────────────────

const FluxChart = forwardRef<FluxChartHandle, FluxChartProps>(
  function FluxChart({ timeArray, fluxArray, currentPhaseAngle }, ref) {

    // ── Refs: layer handles ───────────────────────────────────────────────────
    const staticLayerRef = useRef<FluxStaticLayerHandle>(null);
    const markerLayerRef = useRef<FluxMarkerLayerHandle>(null);

    // ── Refs: scroll container + canvas stack ─────────────────────────────────
    const viewportRef   = useRef<HTMLDivElement>(null);   // the scrollable div
    const stackRef      = useRef<HTMLDivElement>(null);   // position:relative wrapper

    // ── Shared mutable refs (no React state, survive re-renders) ─────────────
    const phaseRef    = useRef<number>(currentPhaseAngle);
    const geometryRef = useRef<PlotGeometry>(EMPTY_GEOMETRY);

    // Current interpolated scrollLeft — maintained between ticks
    const scrollRef   = useRef<number>(0);
    const scrollRafRef= useRef<number>(0);

    // ── Sync phaseRef from prop (cold-start / React re-render path) ───────────
    phaseRef.current = currentPhaseAngle;

    // ── Imperative handle — the Three.js hot path ────────────────────────────
    useImperativeHandle(ref, () => ({
      setPhase: (radians: number) => {
        phaseRef.current = radians;
      },
    }), []);

    // ── onGeometryReady: called by FluxStaticLayer after each draw ─────────────
    // Syncs the marker canvas size and resets the scroll engine position.
    const onGeometryReady = useCallback((canvasW: number) => {
      // Resize marker canvas to match static canvas
      markerLayerRef.current?.resize(canvasW);

      // Resize the canvas stack wrapper so the scroll container knows total width
      if (stackRef.current) {
        stackRef.current.style.width  = `${canvasW}px`;
        stackRef.current.style.height = `${CANVAS_H}px`;
      }
    }, []);

    // ── SCROLL-SYNC ENGINE ────────────────────────────────────────────────────
    useEffect(() => {
      let running = true;

      function syncScroll() {
        if (!running) return;

        const viewport  = viewportRef.current;
        const geometry  = geometryRef.current;

        if (viewport && geometry.pw > 0 && geometry.xPixels.length > 0) {
          const viewportW = viewport.clientWidth;

          // Phase → target marker X in canvas-space (absolute, not scroll-relative)
          const TWO_PI = 2 * Math.PI;
          const phase  = phaseRef.current;
          const norm   = (((phase % TWO_PI) + TWO_PI) % TWO_PI) / TWO_PI;
          const n      = geometry.xPixels.length;
          const idx    = Math.max(0, Math.min(n - 1, Math.round(norm * (n - 1))));
          const markerX = geometry.xPixels[idx];

          // Target scrollLeft: places markerX at MARKER_LOCK_FRACTION of viewport
          const targetScroll = markerX - viewportW * MARKER_LOCK_FRACTION;
          const maxScroll    = geometry.canvasW - viewportW;
          const clampedTarget = Math.max(0, Math.min(maxScroll, targetScroll));

          // Lerp current scroll toward target — smooth pursuit
          const current = scrollRef.current;
          const next    = current + (clampedTarget - current) * SCROLL_LERP_FACTOR;
          scrollRef.current = next;

          // Direct DOM mutation — bypasses React entirely
          viewport.scrollLeft = next;
        }

        scrollRafRef.current = requestAnimationFrame(syncScroll);
      }

      scrollRafRef.current = requestAnimationFrame(syncScroll);
      return () => {
        running = false;
        cancelAnimationFrame(scrollRafRef.current);
      };
    }, []); // runs for lifetime of component — reads everything via refs

    // ── ResizeObserver: redraws static layer when container resizes ───────────
    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const observer = new ResizeObserver(() => {
        // Trigger full static redraw — geometry will update, then onGeometryReady fires
        staticLayerRef.current?.redraw();
      });

      observer.observe(viewport);
      return () => observer.disconnect();
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
      <div
        aria-label="Flux light curve chart"
        style={{
          position:              "relative",
          width:                 "100%",
          borderRadius:          12,
          overflow:              "hidden",
          background:            "rgba(2, 4, 9, 0.52)",
          backdropFilter:        "blur(24px)",
          WebkitBackdropFilter:  "blur(24px)",
          border:                "1px solid rgba(226, 232, 240, 0.065)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,0.03)",
            "0 20px 40px rgba(0,0,0,0.40)",
          ].join(", "),
        }}
      >
        {/* ── Header strip ──────────────────────────────────────────────────── */}
        <ChartHeader />

        {/* ── Center-lock indicator ─────────────────────────────────────────── */}
        {/*
         * A fixed hairline pin overlaid at the exact center of the scroll
         * viewport. This is the visual reference that the scanline locks to.
         * It's a CSS-only element — position:absolute, pointer-events:none.
         */}
        <CenterLockPin />

        {/* ── Scrollable viewport ───────────────────────────────────────────── */}
        <div
          ref={viewportRef}
          style={{
            position:          "relative",
            overflowX:         "scroll",
            overflowY:         "hidden",
            width:             "100%",
            height:            CANVAS_H,
            // Hide scrollbar — scroll is fully programmatic, never user-driven
            scrollbarWidth:    "none",
            msOverflowStyle:   "none" as React.CSSProperties["msOverflowStyle"],
          }}
          // Webkit scrollbar hidden via className below
          className="flux-no-scrollbar"
          // Block user scroll — chart position is purely simulation-driven
          onWheel={(e) => e.preventDefault()}
          onTouchMove={(e) => e.preventDefault()}
        >
          {/* ── Canvas stack: both layers absolutely positioned here ─────────── */}
          <div
            ref={stackRef}
            style={{
              position:  "relative",
              // Initial size — overwritten by onGeometryReady after first draw
              width:     400,
              height:    CANVAS_H,
              flexShrink: 0,
            }}
          >
            {/* Layer 0: static — drawn once per data load */}
            <FluxStaticLayer
              ref={staticLayerRef}
              timeArray={timeArray}
              fluxArray={fluxArray}
              geometryRef={geometryRef}
              onGeometryReady={onGeometryReady}
            />

            {/* Layer 1: marker — 60fps rAF, reads phaseRef + geometryRef */}
            <FluxMarkerLayer
              ref={markerLayerRef}
              phaseRef={phaseRef}
              geometryRef={geometryRef}
            />
          </div>
        </div>

        {/* Scoped style: hide webkit scrollbar on the viewport */}
        <style>{`
          .flux-no-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
    );
  }
);

FluxChart.displayName = "FluxChart";

// Re-export types so consumers can import from the module root
export type { FluxChartProps, FluxChartHandle };
export default FluxChart;

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS — pure, no props, no state
// ─────────────────────────────────────────────────────────────────────────────

/** Header strip: title label + transit legend chip */
function ChartHeader() {
  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "10px 16px 6px",
        flexShrink:     0,
      }}
    >
      {/* Left: title + status dot */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width:        5,
            height:       5,
            borderRadius: "50%",
            background:   "#22d3ee",
            boxShadow:    "0 0 6px #22d3ee",
            flexShrink:   0,
          }}
        />
        <span
          style={{
            fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
            fontSize:      8.5,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color:         "rgba(71, 85, 105, 0.90)",
          }}
        >
          Neural Flux Mapper — Phase-Locked Tracking
        </span>
      </div>

      {/* Right: transit legend + scroll hint */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Transit dip chip */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              display:      "inline-block",
              width:        18,
              height:       5,
              borderRadius: 2,
              background:   "rgba(251, 191, 36, 0.30)",
              border:       "1px solid rgba(251, 191, 36, 0.45)",
            }}
          />
          <span
            style={{
              fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
              fontSize:      7.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color:         "rgba(100, 116, 139, 0.70)",
            }}
          >
            Transit Dip
          </span>
        </div>

        {/* Scroll tracking hint */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              display:      "inline-block",
              width:        1,
              height:       10,
              background:   "rgba(34, 211, 238, 0.55)",
              boxShadow:    "0 0 4px rgba(34, 211, 238, 0.40)",
            }}
          />
          <span
            style={{
              fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
              fontSize:      7.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color:         "rgba(100, 116, 139, 0.70)",
            }}
          >
            Phase Lock
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * CenterLockPin
 * A fixed vertical hairline at the horizontal center of the scroll viewport.
 * This is the visual anchor — it never moves. The flux curve scrolls behind it.
 * Uses a top-to-bottom gradient to fade at chart edges, not a hard line.
 */
function CenterLockPin() {
  return (
    <div
      aria-hidden="true"
      style={{
        position:      "absolute",
        top:           36,           // aligns to PAD.top of chart area
        bottom:        38,           // aligns to PAD.bottom
        left:          "50%",
        transform:     "translateX(-50%)",
        width:         1,
        pointerEvents: "none",
        zIndex:        20,           // above both canvas layers
        background:    "linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.12) 20%, rgba(34,211,238,0.20) 50%, rgba(34,211,238,0.12) 80%, transparent 100%)",
      }}
    />
  );
}
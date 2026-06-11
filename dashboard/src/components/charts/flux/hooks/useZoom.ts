/**
 * useZoom.ts
 * src/components/charts/flux/hooks/useZoom.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Decoupled viewport navigation engine for the FluxChart module.
 * Implements UseZoomOutput from types.ts exactly.
 *
 * INTERACTION MODEL:
 *
 *   Box Zoom  (plain drag):
 *     mouseDown → record refAreaLeft  (Recharts X coordinate string/number)
 *     mouseMove → record refAreaRight (live preview via dragArea state)
 *     mouseUp   → compute [min, max] from left/right → setViewport + setYZoom
 *                 discard if span < MIN_VIEWPORT_SPAN (accidental micro-drag)
 *
 *   Pan  (Shift + drag):
 *     mouseDown (Shift held) → record panAnchor + snapshot panOriginViewport
 *     mouseMove              → dx = anchor.x − current.x
 *                              shift viewport by dx, clamp to [0,1]
 *                              update anchor to current (incremental delta)
 *     mouseUp                → clear pan state (viewport already committed live)
 *
 *   Reset:
 *     setViewport(FULL_VIEWPORT), setYZoom(null), clear all drag state
 *
 * STATE ARCHITECTURE:
 *   - isDragging / isPanning are React state so callers re-render on mode
 *     changes (cursor style, tooltip disable). NOT refs.
 *   - All in-flight drag coordinates are refs — zero re-renders during move.
 *   - dragArea is state — drives the live ReferenceArea preview rectangle.
 *   - shiftHeldRef is declared before ALL callbacks (no temporal dead zone).
 *
 * RECHARTS INTEGRATION:
 *   Recharts mouse events expose activeLabel (X value) and activePayload[0].value
 *   (Y value). index.tsx extracts these into ChartCoord and calls hook handlers.
 *   refAreaLeft / refAreaRight naming matches Recharts ReferenceArea docs.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  FULL_VIEWPORT,
  MIN_VIEWPORT_SPAN,
  type Viewport,
  type ViewDomain,
  type ChartCoord,
  type UseZoomOutput,
} from "../types";

// ── Hook input ─────────────────────────────────────────────────────────────────

export interface UseZoomInput {
  /** Full-dataset Y domain from useChartData — reset target for Y axis */
  fullYDomain: [number, number];
}

// ── Extended output ────────────────────────────────────────────────────────────

export interface UseZoomExtendedOutput extends UseZoomOutput {
  /**
   * Wire this to document keydown/keyup in index.tsx.
   * Writes to shiftHeldRef only — no re-render.
   */
  setShiftHeld: (held: boolean) => void;
}

// ── Internal drag mode ─────────────────────────────────────────────────────────

type DragMode = "idle" | "box" | "pan";

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useZoom({ fullYDomain }: UseZoomInput): UseZoomExtendedOutput {

  // ── Committed state ────────────────────────────────────────────────────────
  const [viewport,   setViewport]   = useState<Viewport>(FULL_VIEWPORT);
  const [yZoom,      setYZoom]      = useState<[number, number] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning,  setIsPanning]  = useState(false);
  const [dragArea,   setDragArea]   = useState<{
    x1: number; y1: number; x2: number; y2: number;
  } | null>(null);

  // ── In-flight refs ─────────────────────────────────────────────────────────
  // shiftHeldRef MUST be declared before any callbacks that read it
  const shiftHeldRef      = useRef(false);
  const modeRef           = useRef<DragMode>("idle");

  // Box-zoom: refAreaLeft/Right mirror Recharts ReferenceArea x1/x2 naming
  const refAreaLeftRef    = useRef<number | null>(null);
  const refAreaRightRef   = useRef<number | null>(null);
  const dragStartYRef     = useRef<number | null>(null);
  const dragCurrentYRef   = useRef<number | null>(null);

  // Pan: incremental anchor tracking
  const panAnchorRef      = useRef<ChartCoord | null>(null);
  const panOriginRef      = useRef<Viewport>(FULL_VIEWPORT);

  // Stable viewport ref for pan clamping (avoids stale closure in onMouseMove)
  const viewportRef       = useRef<Viewport>(viewport);
  useEffect(() => { viewportRef.current = viewport; }, [viewport]);

  // ── setShiftHeld ───────────────────────────────────────────────────────────
  const setShiftHeld = useCallback((held: boolean) => {
    shiftHeldRef.current = held;
  }, []);

  // ── onMouseDown ────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((coord: ChartCoord) => {
    if (shiftHeldRef.current) {
      // PAN MODE
      modeRef.current      = "pan";
      panAnchorRef.current = coord;
      panOriginRef.current = { ...viewportRef.current };
      setIsPanning(true);
    } else {
      // BOX ZOOM MODE
      modeRef.current         = "box";
      refAreaLeftRef.current  = coord.x;
      refAreaRightRef.current = coord.x;
      dragStartYRef.current   = coord.y;
      dragCurrentYRef.current = coord.y;
      setIsDragging(true);
      setDragArea({ x1: coord.x, y1: coord.y, x2: coord.x, y2: coord.y });
    }
  }, []);

  // ── onMouseMove ────────────────────────────────────────────────────────────
  const onMouseMove = useCallback((coord: ChartCoord) => {
    const mode = modeRef.current;

    if (mode === "box" && refAreaLeftRef.current !== null) {
      refAreaRightRef.current = coord.x;
      dragCurrentYRef.current = coord.y;
      setDragArea({
        x1: refAreaLeftRef.current,
        y1: dragStartYRef.current ?? coord.y,
        x2: coord.x,
        y2: coord.y,
      });
    }

    if (mode === "pan" && panAnchorRef.current !== null) {
      const dx       = panAnchorRef.current.x - coord.x;
      const origin   = panOriginRef.current;
      const span     = origin.end - origin.start;
      const newStart = clamp(origin.start + dx, 0, 1 - span);
      const newEnd   = newStart + span;

      // Roll anchor forward — incremental delta, prevents accumulation
      panAnchorRef.current = coord;
      panOriginRef.current = { start: newStart, end: newEnd };

      setViewport({ start: newStart, end: newEnd });
    }
  }, []);

  // ── onMouseUp ──────────────────────────────────────────────────────────────
  const onMouseUp = useCallback(() => {
    if (modeRef.current === "box") {
      const left  = refAreaLeftRef.current;
      const right = refAreaRightRef.current;
      const top   = dragStartYRef.current;
      const bot   = dragCurrentYRef.current;

      if (left !== null && right !== null && top !== null && bot !== null) {
        const x1 = Math.min(left,  right);
        const x2 = Math.max(left,  right);
        const y1 = Math.min(top,   bot);
        const y2 = Math.max(top,   bot);

        if (x2 - x1 >= MIN_VIEWPORT_SPAN && y2 - y1 >= MIN_VIEWPORT_SPAN) {
          const newStart = clamp(x1, 0, 1);
          const newEnd   = clamp(x2, 0, 1);
          if (newEnd - newStart >= MIN_VIEWPORT_SPAN) {
            setViewport({ start: newStart, end: newEnd });
          }
          setYZoom([y1, y2]);
        }
        // Too small → discard silently
      }
    }
    // PAN: already committed live during move

    modeRef.current         = "idle";
    refAreaLeftRef.current  = null;
    refAreaRightRef.current = null;
    dragStartYRef.current   = null;
    dragCurrentYRef.current = null;
    panAnchorRef.current    = null;

    setIsDragging(false);
    setIsPanning(false);
    setDragArea(null);
  }, []);

  // ── resetView ──────────────────────────────────────────────────────────────
  const resetView = useCallback(() => {
    setViewport(FULL_VIEWPORT);
    setYZoom(null);

    modeRef.current         = "idle";
    refAreaLeftRef.current  = null;
    refAreaRightRef.current = null;
    dragStartYRef.current   = null;
    dragCurrentYRef.current = null;
    panAnchorRef.current    = null;

    setIsDragging(false);
    setIsPanning(false);
    setDragArea(null);
  }, []);

  // ── Derived ViewDomain ─────────────────────────────────────────────────────
  const viewDomain = useMemo<ViewDomain>(() => ({
    x: [viewport.start, viewport.end],
    y: yZoom ?? fullYDomain,
  }), [viewport, yZoom, fullYDomain]);

  return {
    viewport,
    yZoom,
    dragArea,
    isDragging,
    isPanning,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    resetView,
    viewDomain,
    fullYDomain,
    setShiftHeld,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
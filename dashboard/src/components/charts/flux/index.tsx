"use client";

/**
 * index.tsx
 * src/components/charts/flux/index.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Core orchestrator for the FluxChart module. Stitches together:
 *   useChartData  → viewport slice + decimation pipeline
 *   useZoom       → box-zoom + Shift-drag pan + resetView
 *   Toolbar       → RenderMode / YScale / Density / Reset controls
 *   FluxTooltip   → precision tooltip with srcIdx reads
 *   Recharts      → ComposedChart rendering layer
 *
 * MOUSE EVENT WIRING:
 *   Recharts exposes onMouseDown/Move/Up on <ComposedChart>. These events
 *   provide `activeLabel` (X domain value as string) and `activePayload`
 *   (array of series values at that X). We extract a ChartCoord and forward
 *   it to useZoom handlers. Recharts does NOT expose the native MouseEvent,
 *   so Shift detection uses a document-level keydown/keyup listener wired
 *   via useEffect and written into useZoom's shiftHeldRef via setShiftHeld.
 *
 * SVG TICK RENDERERS:
 *   Recharts tick props arrive as a complex union type that causes TS2590
 *   ("Expression produces a union type that is too complex to represent").
 *   We bypass this by typing tick render functions as (props: unknown) => JSX
 *   and casting internally — safe because Recharts always provides x, y,
 *   and payload at runtime.
 *
 * PHASE MARKER:
 *   A rAF loop reads phaseRef (written by setPhase imperative handle) and
 *   updates markerPhaseNorm state only when phase shifts > 0.5% — throttles
 *   Recharts repaints to ~2/sec during typical orbital motion.
 *
 * EXPAND/COLLAPSE:
 *   CSS height transition on the chart container div. Collapsed = 44px strip
 *   showing phase readout + transit status + progress spark.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";

import { useChartData } from "./hooks/useChartData";
// import { useZoom } from "./hooks/useZoom";
import { Toolbar } from "./components/Toolbar";
import { FluxTooltip } from "./components/FluxTooltip";

import {
  FULL_VIEWPORT,
  MONO_STYLE,
  type FluxChartProps,
  type FluxChartHandle,
  type RenderMode,
  type YScaleMode,
  type DensityLevel,
  // type ChartPoint,
  // type ChartCoord,
} from "./types";

// ── Constants ──────────────────────────────────────────────────────────────────

const TWO_PI = 2 * Math.PI;

function normalizePhase(rad: number): number {
  return (((rad % TWO_PI) + TWO_PI) % TWO_PI) / TWO_PI;
}

// ── SVG tick renderers ─────────────────────────────────────────────────────────
// Typed as (props: unknown) to bypass TS2590 Recharts union type error.

const PHASE_LABELS: Record<string, string> = {
  "0.00": "0",
  "0.25": "π/2",
  "0.50": "π",
  "0.75": "3π/2",
  "1.00": "2π",
};

function XAxisTick(props: unknown): React.ReactElement | null {
  const { x, y, payload } = props as {
    x: number;
    y: number;
    payload: { value: number };
  };
  if (!payload) return null;
  const label = PHASE_LABELS[payload.value.toFixed(2)];
  if (!label) return null;
  return (
    <text
      x={x}
      y={y + 13}
      textAnchor="middle"
      style={{
        fontFamily: "'Space Mono','Courier New',monospace",
        fontSize: 11,
      }}
      fill="#cbd5e1"
    >
      {label}
    </text>
  );
}

function YAxisTick(props: unknown): React.ReactElement | null {
  const { x, y, payload } = props as {
    x: number;
    y: number;
    payload: { value: number };
  };
  if (!payload) return null;
  return (
    <text
      x={x - 4}
      y={y + 4}
      textAnchor="end"
      style={{
        fontFamily: "'Space Mono','Courier New',monospace",
        fontSize: 11,
      }}
      fill="#cbd5e1"
    >
      {payload.value.toFixed(4)}
    </text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const FluxChart = forwardRef<FluxChartHandle, FluxChartProps>(
  function FluxChart({ timeArray, fluxArray, currentPhaseAngle }, ref) {
    // ── UI state ───────────────────────────────────────────────────────────────
    const [expanded, setExpanded] = useState(true);
    const [renderMode, setRenderMode] = useState<RenderMode>("line");
    const [yScale, setYScale] = useState<YScaleMode>("linear");
    const [density, setDensity] = useState<DensityLevel>(2);
    const [markerPhaseNorm, setMarkerPhaseNorm] = useState(() =>
      normalizePhase(currentPhaseAngle),
    );

    // ── Mutable refs ──────────────────────────────────────────────────────────
    const phaseRef = useRef<number>(currentPhaseAngle);
    const rafRef = useRef<number>(0);
    const lastNormRef = useRef<number>(normalizePhase(currentPhaseAngle));

    // ── Imperative handle: Three.js entry point ───────────────────────────────
    useImperativeHandle(
      ref,
      () => ({
        setPhase: (rad: number) => {
          phaseRef.current = rad;
        },
      }),
      [],
    );

    // ── Phase marker rAF loop ─────────────────────────────────────────────────
    // Only calls setMarkerPhaseNorm when phase moves >0.5% — ~2 Recharts
    // repaints/sec during orbital motion instead of 60.
    useEffect(() => {
      let alive = true;
      const tick = () => {
        if (!alive) return;
        const n = normalizePhase(phaseRef.current);
        if (Math.abs(n - lastNormRef.current) > 0.005) {
          lastNormRef.current = n;
          setMarkerPhaseNorm(n);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => {
        alive = false;
        cancelAnimationFrame(rafRef.current);
      };
    }, []);

    // ── Data pipeline ─────────────────────────────────────────────────────────
    // const { fullYDomain: initialY } = useChartData({
    //   timeArray,
    //   fluxArray,
    //   viewport: { start: 0, end: 1 }, // Init
    //   density: 1,
    // });

    // const zoom = useZoom({ fullYDomain: [0, 1] }); // seeded; real domain below
    // const zoom = useZoom({ fullYDomain: initialY });

    const { chartData, fullYDomain, transitBounds, pointsInView } =
      useChartData({
        timeArray,
        fluxArray,
        // viewport: zoom.viewport,
        viewport: FULL_VIEWPORT,
        density,
      });

    // Re-create zoom with the correct fullYDomain now that data is available
    // useZoom is a hook so we can't call it twice — instead we feed it back
    // via a stable ref that useZoom's viewDomain computation reads.
    // Pattern: call useZoom once with a stable fullYDomain ref.
    // const fullYDomainRef = useRef(fullYDomain);
    // fullYDomainRef.current = fullYDomain;

    // The actual zoom hook — uses fullYDomain for Y reset + domain derivation
    // const zoomFull = useZoom({ fullYDomain });

    // ── Shift key listener ────────────────────────────────────────────────────
    // useEffect(() => {
    //   const onKeyDown = (e: KeyboardEvent) => {
    //     if (e.key === "Shift") zoom.setShiftHeld(true);
    //   };
    //   const onKeyUp = (e: KeyboardEvent) => {
    //     if (e.key === "Shift") {
    //       zoom.setShiftHeld(false);
    //       // Also cancel any in-progress pan on Shift release
    //       zoom.onMouseUp();
    //     }
    //   };
    //   document.addEventListener("keydown", onKeyDown);
    //   document.addEventListener("keyup", onKeyUp);
    //   return () => {
    //     document.removeEventListener("keydown", onKeyDown);
    //     document.removeEventListener("keyup", onKeyUp);
    //   };
    // }, [zoom.setShiftHeld, zoom.onMouseUp]);

    // ── Recharts mouse event extraction ──────────────────────────────────────
    // Recharts provides a CategorizedData object. We extract ChartCoord from it.
    // Types as unknown to sidestep the deeply nested Recharts event union.
    // const extractCoord = useCallback((e: unknown): ChartCoord | null => {
    //   const ev = e as {
    //     activeLabel?: string | number;
    //     activePayload?: Array<{ value: number; payload: ChartPoint }>;
    //   } | null;
    //   if (!ev?.activePayload?.length) return null;
    //   const x =
    //     typeof ev.activeLabel === "string"
    //       ? parseFloat(ev.activeLabel)
    //       : (ev.activeLabel ?? 0);
    //   const y = ev.activePayload[0]?.value ?? 0;
    //   if (isNaN(x)) return null;
    //   return { x, y };
    // }, []);

    // const handleMouseDown = useCallback(
    //   (e: unknown) => {
    //     const coord = extractCoord(e);
    //     if (coord) zoom.onMouseDown(coord);
    //   },
    //   [extractCoord, zoom.onMouseDown],
    // );

    // const handleMouseMove = useCallback(
    //   (e: unknown) => {
    //     const coord = extractCoord(e);
    //     if (coord) zoom.onMouseMove(coord);
    //   },
    //   [extractCoord, zoom.onMouseMove],
    // );

    // const handleMouseUp = useCallback(() => {
    //   zoom.onMouseUp();
    // }, [zoom.onMouseUp]);

    // ── Derived ───────────────────────────────────────────────────────────────
    // const { viewDomain, dragArea, isDragging, isPanning } = zoom;
    const viewDomain = {
      x: [0, 1] as [number, number],
      y: fullYDomain,
    };
    // const isZoomed =
    //   zoom.viewport.start !== FULL_VIEWPORT.start ||
    //   zoom.viewport.end !== FULL_VIEWPORT.end ||
    //   zoom.yZoom !== null;

    const isZoomed = false;

    // Log scale safety: disable if any flux value ≤ 0
    const minFlux = fullYDomain[0];
    const logUnsafe = minFlux <= 0;
    const effectiveYScale: YScaleMode =
      yScale === "log" && logUnsafe ? "linear" : yScale;

    // Cursor style feedback
    // const chartCursor = isDragging
    //   ? "crosshair"
    //   : isPanning
    //     ? "grab"
    //     : "default";
    const chartCursor = "default";

    // Curried FluxTooltip content (stable reference via useCallback)
    const tooltipContent = useCallback(
      (props: unknown) => (
        <FluxTooltip
          {...(props as object)}
          fluxArray={fluxArray}
          transitBounds={transitBounds}
        />
      ),
      [fluxArray, transitBounds],
    );

    // ── Expand / collapse ─────────────────────────────────────────────────────
    const toggleExpand = useCallback(() => setExpanded((v) => !v), []);

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
      <div
        className="relative w-full rounded-xl border border-white/5 overflow-hidden"
        style={{
          background: "rgba(2, 4, 9, 0.65)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.03), 0 24px 48px rgba(0,0,0,0.45)",
        }}
        aria-label="Flux light curve — scientific visualization panel"
      >
        {/* ══════════════════════════════════════════════════════════════════
            HEADER STRIP
        ══════════════════════════════════════════════════════════════════ */}
        {/* ── UPDATE HEADER CONTAINER IN index.tsx ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px 6px",
          }}
        >
          {/* Indicator + Title Layout */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#22d3ee",
                boxShadow: "0 0 10px #22d3ee, 0 0 4px #22d3ee",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                ...MONO_STYLE,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.18em",
                // textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              Neural Flux Mapper
            </span>
          </div>

          {/* Collapse toggle */}
          <button
            onClick={toggleExpand}
            aria-label={expanded ? "Collapse chart" : "Expand chart"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.02)",
              cursor: "pointer",
              color: "rgba(148,163,184,0.65)",
              flexShrink: 0,
            }}
          >
            <svg
              width={10}
              height={10}
              viewBox="0 0 10 10"
              fill="none"
              aria-hidden="true"
              style={{
                transition: "transform 0.25s ease",
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <polyline
                points="2,7 5,3 8,7"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TOOLBAR — only when expanded
        ══════════════════════════════════════════════════════════════════ */}
        {expanded && (
          <div style={{ marginTop: 8 }}>
            <Toolbar
              renderMode={renderMode}
              yScale={effectiveYScale}
              density={density}
              isZoomed={isZoomed}
              minFlux={minFlux}
              pointsInView={pointsInView}
              totalPoints={fluxArray.length}
              onRenderMode={setRenderMode}
              onYScale={setYScale}
              onDensity={setDensity}
              // onResetView={zoom.resetView}
              onResetView={() => {}}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            CHART / COLLAPSED STRIP
        ══════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            height: expanded ? 210 : 44,
            minHeight: expanded ? 210 : 44,
            width: "100%",
            overflow: "hidden",
          }}
        >
          {/* ── Expanded chart ─────────────────────────────────────────────── */}
          {expanded &&
            (chartData.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={210} minWidth={300}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 22, bottom: 30, left: 10 }}
                  // onMouseDown={handleMouseDown}
                  // onMouseMove={handleMouseMove}
                  // onMouseUp={handleMouseUp}
                  // onMouseLeave={handleMouseUp}
                  // style={{
                  //   cursor: zoom.isDragging
                  //     ? "crosshair"
                  //     : zoom.isPanning
                  //       ? "grab"
                  //       : "default",
                  //   userSelect: "none",
                  // }}
                  style={{
                    cursor: chartCursor,
                    userSelect: "none",
                  }}
                >
                  {/* Grid — solid faint lines, no dashes */}
                  <CartesianGrid
                    stroke="rgba(148,163,184,0.04)"
                    strokeWidth={1}
                    strokeDasharray=""
                    vertical={false}
                  />

                  {/* X Axis */}
                  <XAxis
                    dataKey="phase"
                    type="number"
                    domain={viewDomain.x}
                    ticks={[0, 0.25, 0.5, 0.75, 1]}
                    tick={XAxisTick}
                    axisLine={{ stroke: "rgba(148,163,184,0.22)" }}
                    tickLine={{ stroke: "rgba(148,163,184,0.18)" }}
                    label={{
                      value: "ORBITAL PHASE  φ",
                      position: "insideBottom",
                      offset: -18,
                      style: {
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 9,
                        fill: "rgba(148,163,184,0.50)",
                        letterSpacing: "0.14em",
                      },
                    }}
                  />

                  {/* Y Axis — linear or log */}
                  <YAxis
                    domain={viewDomain.y}
                    scale={effectiveYScale}
                    tick={YAxisTick}
                    width={68}
                    axisLine={{ stroke: "rgba(148,163,184,0.22)" }}
                    tickLine={{ stroke: "rgba(148,163,184,0.18)" }}
                    label={{
                      value: "F / F₀",
                      angle: -90,
                      position: "insideLeft",
                      offset: 14,
                      style: {
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 9,
                        fill: "rgba(148,163,184,0.50)",
                      },
                    }}
                  />

                  {/* Tooltip */}
                  <Tooltip
                    content={tooltipContent}
                    cursor={{
                      stroke: "rgba(34,211,238,0.20)",
                      strokeWidth: 1,
                      strokeDasharray: "3 3",
                    }}
                  />

                  {/* Transit zone shaded area */}
                  {transitBounds && (
                    <ReferenceArea
                      x1={transitBounds.low}
                      x2={transitBounds.high}
                      fill="rgba(251,191,36,0.05)"
                      stroke="none"
                    />
                  )}

                  {/* Transit boundary lines */}
                  {transitBounds && (
                    <>
                      <ReferenceLine
                        x={transitBounds.low}
                        stroke="rgba(251,191,36,0.22)"
                        strokeWidth={1}
                        strokeDasharray="4 3"
                      />
                      <ReferenceLine
                        x={transitBounds.high}
                        stroke="rgba(251,191,36,0.22)"
                        strokeWidth={1}
                        strokeDasharray="4 3"
                      />
                    </>
                  )}

                  {/* Live phase marker */}
                  <ReferenceLine
                    x={markerPhaseNorm}
                    stroke="#22d3ee"
                    strokeWidth={1}
                    strokeOpacity={0.7}
                    label={{
                      value: `φ = ${(markerPhaseNorm * TWO_PI).toFixed(2)}`,
                      position: "top",
                      style: {
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 8,
                        fill: "#22d3ee",
                        letterSpacing: "0.06em",
                      },
                    }}
                  />

                  {/* Box-zoom drag selection rectangle */}
                  {/* {isDragging && dragArea && (
                    <ReferenceArea
                      x1={Math.min(dragArea.x1, dragArea.x2)}
                      x2={Math.max(dragArea.x1, dragArea.x2)}
                      y1={Math.min(dragArea.y1, dragArea.y2)}
                      y2={Math.max(dragArea.y1, dragArea.y2)}
                      stroke="rgba(34,211,238,0.55)"
                      strokeWidth={1}
                      strokeDasharray="4 2"
                      fill="rgba(34,211,238,0.06)"
                    />
                  )} */}

                  {/* ── DATA SERIES — controlled by renderMode ────────────── */}

                  {/* Line: monotone (line + combined modes) */}
                  {(renderMode === "line" || renderMode === "line-scatter") && (
                    <Line
                      type="monotone"
                      dataKey="flux"
                      stroke="#22d3ee"
                      strokeWidth={1.2}
                      dot={false}
                      activeDot={{
                        r: 3.5,
                        fill: "#22d3ee",
                        stroke: "rgba(34,211,238,0.25)",
                        strokeWidth: 7,
                      }}
                      isAnimationActive={false}
                      connectNulls
                    />
                  )}

                  {/* Step line */}
                  {renderMode === "step" && (
                    <Line
                      type="stepAfter"
                      dataKey="flux"
                      stroke="#22d3ee"
                      strokeWidth={1.2}
                      dot={false}
                      activeDot={{
                        r: 3.5,
                        fill: "#22d3ee",
                        stroke: "rgba(34,211,238,0.25)",
                        strokeWidth: 7,
                      }}
                      isAnimationActive={false}
                      connectNulls
                    />
                  )}

                  {/* Scatter dots (scatter + combined modes) */}
                  {(renderMode === "scatter" ||
                    renderMode === "line-scatter") && (
                    <Scatter
                      dataKey="flux"
                      fill="#22d3ee"
                      fillOpacity={renderMode === "line-scatter" ? 0.5 : 0.82}
                      isAnimationActive={false}
                    />
                  )}

                  {/* Transit event step overlay — all modes, amber */}
                  <Line
                    type="stepAfter"
                    dataKey="transitEvent"
                    stroke="#f59e0b"
                    strokeWidth={1.4}
                    strokeDasharray="5 3"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ))}

          {/* ── Collapsed strip ───────────────────────────────────────────── */}
          {!expanded && (
            <CollapsedStrip
              markerPhaseNorm={markerPhaseNorm}
              transitBounds={transitBounds}
            />
          )}
        </div>
      </div>
    );
  },
);

FluxChart.displayName = "FluxChart";
export type { FluxChartProps, FluxChartHandle };
export default FluxChart;

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "1.5px solid rgba(34,211,238,0.12)",
          borderTopColor: "rgba(34,211,238,0.55)",
          animation: "flux-spin 0.9s linear infinite",
        }}
      />
      <span
        style={{
          ...MONO_STYLE,
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(71,85,105,0.70)",
        }}
      >
        Awaiting flux data stream...
      </span>
      <style>{`@keyframes flux-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

interface CollapsedStripProps {
  markerPhaseNorm: number;
  transitBounds: import("./types").TransitBounds | null;
}

function CollapsedStrip({
  markerPhaseNorm,
  transitBounds,
}: CollapsedStripProps) {
  const phaseRad = markerPhaseNorm * TWO_PI;
  const inTransit = transitBounds
    ? markerPhaseNorm >= transitBounds.low &&
      markerPhaseNorm <= transitBounds.high
    : false;

  return (
    <div
      style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 14,
      }}
    >
      <span
        style={{
          ...MONO_STYLE,
          fontSize: 10,
          color: "#22d3ee",
          whiteSpace: "nowrap",
        }}
      >
        φ = {phaseRad.toFixed(3)} rad
      </span>
      <span style={{ color: "rgba(71,85,105,0.40)", fontSize: 10 }}>·</span>
      <span
        style={{
          ...MONO_STYLE,
          fontSize: 9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: inTransit ? "#f59e0b" : "rgba(71,85,105,0.55)",
          whiteSpace: "nowrap",
        }}
      >
        {inTransit ? "⬤ Transit Active" : "○ Nominal"}
      </span>
      {/* Phase progress spark */}
      <div
        style={{
          flex: 1,
          height: 2,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 1,
          overflow: "hidden",
          minWidth: 40,
        }}
      >
        <div
          style={{
            width: `${markerPhaseNorm * 100}%`,
            height: "100%",
            background:
              "linear-gradient(90deg, rgba(34,211,238,0.35) 0%, #22d3ee 100%)",
            borderRadius: 1,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}





// "use client";

// /**
//  * index.tsx
//  * src/components/charts/flux/index.tsx
//  * ─────────────────────────────────────────────────────────────────────────────
//  * Unified FluxChart orchestrator — Recharts-powered scientific light-curve
//  * viewer. Fixed all TypeScript union type complexities [ts(2590), ts(2322)].
//  * ─────────────────────────────────────────────────────────────────────────────
//  */

// import {
//   useState,
//   useEffect,
//   useRef,
//   useCallback,
//   useMemo,
//   forwardRef,
//   useImperativeHandle,
//   memo,
// } from "react";
// import {
//   ComposedChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ReferenceLine,
//   ResponsiveContainer,
// } from "recharts";

// // ── Public API ─────────────────────────────────────────────────────────────────

// export interface FluxChartProps {
//   timeArray:         number[];
//   fluxArray:         number[];
//   /** Cold-start initializer. Hot-path updates via FluxChartHandle.setPhase() */
//   currentPhaseAngle: number;
// }

// export interface FluxChartHandle {
//   /** Called 60×/sec by OrbitSimulator — zero React re-renders */
//   setPhase: (radians: number) => void;
// }

// // ── Constants ──────────────────────────────────────────────────────────────────

// const TWO_PI = 2 * Math.PI;

// /** Transit dip zone half-width in normalized phase [0,1] space */
// const TRANSIT_HALF_WIDTH = 0.04;

// /** Phase at which transit center occurs (normalized [0,1]) */
// const TRANSIT_CENTER_NORM = 0.5; // phase = π

// /** Zoom levels — stride multipliers for decimation */
// const ZOOM_LEVELS = [1, 2, 3, 4] as const;
// type ZoomLevel = (typeof ZOOM_LEVELS)[number];

// /** Max data points sent to Recharts before decimation kicks in */
// const MAX_RENDER_POINTS = 800;

// // ── Types ──────────────────────────────────────────────────────────────────────

// interface ChartPoint {
//   /** Normalized phase [0, 1] — maps to X axis */
//   phase:        number;
//   /** Raw F/F₀ float from pipeline */
//   flux:         number;
//   /** Amber step-line value — defined only in transit zone, undefined elsewhere */
//   transitEvent: number | undefined;
//   /** Original array index — used for raw-float tooltip reads */
//   srcIdx:       number;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // COMPONENT
// // ─────────────────────────────────────────────────────────────────────────────

// const FluxChart = forwardRef<FluxChartHandle, FluxChartProps>(
//   function FluxChart({ timeArray, fluxArray, currentPhaseAngle }, ref) {

//     // ── UI state (only what triggers visual re-renders) ───────────────────────
//     const [expanded,  setExpanded]  = useState(true);
//     const [zoom,      setZoom]      = useState<ZoomLevel>(1);
//     /** Phase for the ReferenceLine — updated by a debounced rAF loop */
//     const [markerPhaseNorm, setMarkerPhaseNorm] = useState(
//       normalizePhase(currentPhaseAngle)
//     );

//     // ── Mutable refs — hot path, zero re-renders ──────────────────────────────
//     const phaseRef        = useRef<number>(currentPhaseAngle);
//     const rafRef          = useRef<number>(0);
//     const lastMarkerNorm  = useRef<number>(normalizePhase(currentPhaseAngle));

//     // ── Imperative handle: Three.js animation thread entry point ─────────────
//     useImperativeHandle(ref, () => ({
//       setPhase: (radians: number) => {
//         phaseRef.current = radians;
//       },
//     }), []);

//     // ── Phase marker loop ─────────────────────────────────────────────────────
//     useEffect(() => {
//       let running = true;

//       function tick() {
//         if (!running) return;
//         const norm = normalizePhase(phaseRef.current);
//         if (Math.abs(norm - lastMarkerNorm.current) > 0.005) {
//           lastMarkerNorm.current = norm;
//           setMarkerPhaseNorm(norm);
//         }
//         rafRef.current = requestAnimationFrame(tick);
//       }

//       rafRef.current = requestAnimationFrame(tick);
//       return () => {
//         running = false;
//         cancelAnimationFrame(rafRef.current);
//       };
//     }, []);

//     // ── Data pipeline: build chartData ────────────────────────────────────────
//     const { chartData, yDomain, transitBounds } = useMemo(() => {
//       if (timeArray.length === 0 || fluxArray.length === 0) {
//         return { chartData: [], yDomain: [0.99, 1.01] as [number, number], transitBounds: null };
//       }

//       const n = Math.min(timeArray.length, fluxArray.length);

//       let minF =  Infinity;
//       let maxF = -Infinity;
//       for (let i = 0; i < n; i++) {
//         if (fluxArray[i] < minF) minF = fluxArray[i];
//         if (fluxArray[i] > maxF) maxF = fluxArray[i];
//       }
//       const range  = maxF - minF || 1e-6;
//       const yMin   = minF - range * 0.12;
//       const yMax   = maxF + range * 0.08;

//       const sorted    = Float64Array.from(fluxArray.slice(0, n)).sort();
//       const median    = sorted[Math.floor(n / 2)];
//       const threshold = median * 0.9975;

//       let dipFirst = -1;
//       let dipLast  = -1;
//       for (let i = 0; i < n; i++) {
//         if (fluxArray[i] < threshold) {
//           if (dipFirst === -1) dipFirst = i;
//           dipLast = i;
//         }
//       }

//       const transitC     = dipFirst >= 0
//         ? ((dipFirst + dipLast) * 0.5) / (n - 1)
//         : TRANSIT_CENTER_NORM;
//       const transitHalf  = dipFirst >= 0
//         ? Math.max(0.01, ((dipLast - dipFirst) / (n - 1)) * 0.5 + 0.008)
//         : TRANSIT_HALF_WIDTH;
//       const transitLow   = transitC - transitHalf;
//       const transitHigh  = transitC + transitHalf;

//       const stride = Math.max(1, Math.floor(n / (MAX_RENDER_POINTS / zoom)));

//       const tMin   = timeArray[0];
//       const tRange = (timeArray[n - 1] - tMin) || 1;

//       const points: ChartPoint[] = [];
//       for (let i = 0; i < n; i += stride) {
//         const phaseNorm = (timeArray[i] - tMin) / tRange;
//         const inTransit = phaseNorm >= transitLow && phaseNorm <= transitHigh;

//         points.push({
//           phase:        phaseNorm,
//           flux:         fluxArray[i],
//           transitEvent: inTransit ? fluxArray[i] : undefined,
//           srcIdx:       i,
//         });
//       }

//       return {
//         chartData:     points,
//         yDomain:       [yMin, yMax] as [number, number],
//         transitBounds: { low: transitLow, high: transitHigh, center: transitC },
//       };
//     }, [timeArray, fluxArray, zoom]);

//     const handleZoom = useCallback((z: ZoomLevel) => setZoom(z), []);
//     const toggleExpand = useCallback(() => setExpanded(v => !v), []);

//     const formatPhase = useCallback((v: number) => {
//       const labels: Record<string, string> = {
//         "0":    "0",
//         "0.25": "π/2",
//         "0.5":  "π",
//         "0.75": "3π/2",
//         "1":    "2π",
//       };
//       const key = v.toFixed(2);
//       return labels[key] ?? "";
//     }, []);

//     const formatFlux = useCallback((v: number) => v.toFixed(4), []);

//     // ── Render Ticks directly in SVG workspace to bypass complex type unions ──
//     const renderCustomAxisTick = (props: any) => {
//       const { x, y, payload } = props;
//       return (
//         <g transform={`translate(${x},${y})`}>
//           <text
//             x={0}
//             y={0}
//             dy={12}
//             textAnchor="middle"
//             fill="#cbd5e1"
//             style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px" }}
//           >
//             {props.isYAxis ? formatFlux(payload.value) : formatPhase(payload.value)}
//           </text>
//         </g>
//       );
//     };

//     return (
//       <div
//         className="relative w-full rounded-xl border border-white/5 overflow-hidden"
//         style={{
//           background:           "rgba(2, 4, 9, 0.65)",
//           backdropFilter:       "blur(32px)",
//           WebkitBackdropFilter: "blur(32px)",
//           boxShadow:            "inset 0 1px 0 rgba(255,255,255,0.03), 0 24px 48px rgba(0,0,0,0.45)",
//           transition:           "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
//         }}
//         aria-label="Flux light curve chart"
//       >
//         {/* ── HEADER ──────────────────────────────────────────────────────── */}
//         <div className="flex items-center justify-between px-4 pt-3 pb-2">
//           <div className="flex items-center gap-2.5">
//             <span
//               className="inline-block rounded-full"
//               style={{
//                 width:     5,
//                 height:    5,
//                 background: "#22d3ee",
//                 boxShadow: "0 0 6px #22d3ee",
//                 flexShrink: 0,
//               }}
//             />
//             <span
//               style={{
//                 fontFamily:    "'Space Mono', 'Courier New', monospace",
//                 fontSize:      9,
//                 letterSpacing: "0.16em",
//                 textTransform: "uppercase",
//                 color:         "rgba(148, 163, 184, 0.75)",
//               }}
//             >
//               Neural Flux Mapper — Recharts Scientific Layer
//             </span>
//           </div>

//           <div className="flex items-center gap-3">
//             {expanded && (
//               <div className="flex items-center gap-1">
//                 {ZOOM_LEVELS.map((z) => (
//                   <button
//                     key={z}
//                     onClick={() => handleZoom(z)}
//                     style={{
//                       fontFamily:    "'Space Mono', monospace",
//                       fontSize:      8,
//                       letterSpacing: "0.10em",
//                       padding:       "2px 7px",
//                       borderRadius:  4,
//                       border:        "1px solid",
//                       cursor:        "pointer",
//                       transition:    "all 0.15s ease",
//                       borderColor:   zoom === z
//                         ? "rgba(34,211,238,0.50)"
//                         : "rgba(255,255,255,0.07)",
//                       background:    zoom === z
//                         ? "rgba(34,211,238,0.10)"
//                         : "rgba(255,255,255,0.02)",
//                       color:         zoom === z ? "#22d3ee" : "rgba(100,116,139,0.80)",
//                     }}
//                     aria-pressed={zoom === z}
//                     aria-label={`Zoom ${z}×`}
//                   >
//                     {z}×
//                   </button>
//                 ))}
//               </div>
//             )}

//             {expanded && (
//               <div className="flex items-center gap-3">
//                 <LegendChip color="#22d3ee" label="F/F₀" />
//                 <LegendChip color="#f59e0b" label="Transit" dashed />
//               </div>
//             )}

//             <button
//               onClick={toggleExpand}
//               aria-label={expanded ? "Collapse chart" : "Expand chart"}
//               style={{
//                 display:        "flex",
//                 alignItems:     "center",
//                 justifyContent: "center",
//                 width:          22,
//                 height:         22,
//                 borderRadius:   4,
//                 border:         "1px solid rgba(255,255,255,0.07)",
//                 background:     "rgba(255,255,255,0.02)",
//                 cursor:         "pointer",
//                 color:          "rgba(148,163,184,0.70)",
//                 transition:     "all 0.15s ease",
//                 flexShrink:     0,
//               }}
//             >
//               <CollapseIcon expanded={expanded} />
//             </button>
//           </div>
//         </div>

//         {/* ── CHART AREA ─────────────────────────────────────────────────── */}
//         <div
//           style={{
//             height:     expanded ? 192 : 44,
//             overflow:   "hidden",
//             transition: "height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
//           }}
//         >
//           {chartData.length === 0 ? (
//             <EmptyState expanded={expanded} />
//           ) : (
//             <ResponsiveContainer width="100%" height="100%">
//               <ComposedChart
//                 data={chartData}
//                 margin={{ top: 8, right: 20, bottom: 20, left: 12 }}
//               >
//                 <CartesianGrid
//                   strokeDasharray=""
//                   stroke="rgba(148, 163, 184, 0.04)"
//                   strokeWidth={1}
//                   vertical={false}
//                 />

//                 <XAxis
//                   dataKey="phase"
//                   type="number"
//                   domain={[0, 1]}
//                   ticks={[0, 0.25, 0.5, 0.75, 1]}
//                   tick={renderCustomAxisTick}
//                   axisLine={{ stroke: "rgba(148,163,184,0.25)", strokeWidth: 1 }}
//                   tickLine={{ stroke: "rgba(148,163,184,0.20)", strokeWidth: 1 }}
//                   label={{
//                     value:    "ORBITAL PHASE  φ",
//                     position: "insideBottom",
//                     offset:   -12,
//                     style:    {
//                       fontFamily:    "'Space Mono', monospace",
//                       fontSize:      9,
//                       fill:          "rgba(148,163,184,0.60)",
//                       letterSpacing: "0.14em",
//                       textTransform: "uppercase",
//                     },
//                   }}
//                 />

//                 <YAxis
//                   domain={yDomain}
//                   tick={(props) => renderCustomAxisTick({ ...props, isYAxis: true })}
//                   width={62}
//                   axisLine={{ stroke: "rgba(148,163,184,0.25)", strokeWidth: 1 }}
//                   tickLine={{ stroke: "rgba(148,163,184,0.20)", strokeWidth: 1 }}
//                   label={{
//                     value:   "F / F₀",
//                     angle:   -90,
//                     position:"insideLeft",
//                     offset:  12,
//                     style:   {
//                       fontFamily:    "'Space Mono', monospace",
//                       fontSize:      9,
//                       fill:          "rgba(148,163,184,0.60)",
//                       letterSpacing: "0.10em",
//                     },
//                   }}
//                 />

//                 <Tooltip
//                   content={<FluxTooltip fluxArray={fluxArray} />}
//                   cursor={{
//                     stroke:      "rgba(34,211,238,0.20)",
//                     strokeWidth: 1,
//                     strokeDasharray: "4 4",
//                   }}
//                 />

//                 {transitBounds && (
//                   <>
//                     <ReferenceLine
//                       x={transitBounds.low}
//                       stroke="rgba(251,191,36,0.25)"
//                       strokeWidth={1}
//                       strokeDasharray="3 3"
//                     />
//                     <ReferenceLine
//                       x={transitBounds.high}
//                       stroke="rgba(251,191,36,0.25)"
//                       strokeWidth={1}
//                       strokeDasharray="3 3"
//                     />
//                   </>
//                 )}

//                 <ReferenceLine
//                   x={markerPhaseNorm}
//                   stroke="#22d3ee"
//                   strokeWidth={1}
//                   strokeOpacity={0.75}
//                   label={{
//                     value:    `φ=${(markerPhaseNorm * TWO_PI).toFixed(2)}`,
//                     position: "top",
//                     style:    {
//                       fontFamily: "'Space Mono', monospace",
//                       fontSize:   8,
//                       fill:       "#22d3ee",
//                     },
//                   }}
//                 />

//                 <Line
//                   type="monotone"
//                   dataKey="flux"
//                   stroke="#22d3ee"
//                   strokeWidth={1.2}
//                   dot={false}
//                   activeDot={{ r: 3, fill: "#22d3ee", stroke: "rgba(34,211,238,0.30)", strokeWidth: 6 }}
//                   isAnimationActive={false}
//                   connectNulls
//                 />

//                 <Line
//                   type="stepAfter"
//                   dataKey="transitEvent"
//                   stroke="#f59e0b"
//                   strokeWidth={1.4}
//                   strokeDasharray="5 3"
//                   dot={false}
//                   activeDot={false}
//                   isAnimationActive={false}
//                   connectNulls={false}
//                 />
//               </ComposedChart>
//             </ResponsiveContainer>
//           )}
//         </div>

//         {!expanded && (
//           <CollapsedStrip markerPhaseNorm={markerPhaseNorm} />
//         )}
//       </div>
//     );
//   }
// );

// FluxChart.displayName = "FluxChart";
// export default FluxChart;

// // ── UTILITIES ─────────────────────────────────────────────────────────────

// function normalizePhase(radians: number): number {
//   return (((radians % TWO_PI) + TWO_PI) % TWO_PI) / TWO_PI;
// }

// // ── SUB-COMPONENTS ─────────────────────────────────────────────────────────

// interface FluxTooltipProps {
//   active?:    boolean;
//   payload?:   Array<{ payload: ChartPoint }>;
//   fluxArray:  number[];
// }

// const FluxTooltip = memo(function FluxTooltip({
//   active, payload, fluxArray,
// }: FluxTooltipProps) {
//   if (!active || !payload?.length) return null;

//   const point   = payload[0].payload;
//   const rawFlux = fluxArray[point.srcIdx] ?? point.flux;
//   const phaseRad = point.phase * TWO_PI;

//   return (
//     <div
//       style={{
//         background:    "rgba(2, 4, 9, 0.90)",
//         border:        "1px solid rgba(34, 211, 238, 0.28)",
//         borderRadius:  6,
//         padding:       "8px 11px",
//         boxShadow:     "0 8px 24px rgba(0,0,0,0.50)",
//       }}
//     >
//       <div
//         style={{
//           height:       1,
//           background:   "linear-gradient(90deg, #22d3ee 0%, transparent 100%)",
//           marginBottom: 7,
//           borderRadius: 1,
//         }}
//       />
//       <TooltipRow label="φ" value={`${phaseRad.toFixed(4)} rad`} />
//       <TooltipRow label="F/F₀" value={rawFlux.toFixed(6)} highlight />
//       {point.transitEvent !== undefined && (
//         <TooltipRow label="EVT" value="TRANSIT DIP" amber />
//       )}
//     </div>
//   );
// });

// interface TooltipRowProps {
//   label:     string;
//   value:     string;
//   highlight?: boolean;
//   amber?:    boolean;
// }

// function TooltipRow({ label, value, highlight, amber }: TooltipRowProps) {
//   return (
//     <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 3 }}>
//       <span
//         style={{
//           fontFamily:    "'Space Mono', monospace",
//           fontSize:      8,
//           color:         "rgba(148,163,184,0.70)",
//           letterSpacing: "0.10em",
//           minWidth:      28,
//         }}
//       >
//         {label}
//       </span>
//       <span
//         style={{
//           fontFamily: "'Space Mono', monospace",
//           fontSize:   10,
//           fontWeight: 700,
//           color:      amber ? "#f59e0b" : highlight ? "#22d3ee" : "#cbd5e1",
//           letterSpacing: "0.04em",
//         }}
//       >
//         {value}
//       </span>
//     </div>
//   );
// }

// function LegendChip({
//   color, label, dashed,
// }: { color: string; label: string; dashed?: boolean }) {
//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
//       <svg width={18} height={6} aria-hidden="true">
//         <line
//           x1={0} y1={3} x2={18} y2={3}
//           stroke={color}
//           strokeWidth={1.5}
//           strokeDasharray={dashed ? "4 3" : undefined}
//           opacity={0.85}
//         />
//       </svg>
//       <span
//         style={{
//           fontFamily:    "'Space Mono', monospace",
//           fontSize:      8,
//           letterSpacing: "0.12em",
//           textTransform: "uppercase",
//           color:         "rgba(100,116,139,0.75)",
//         }}
//       >
//         {label}
//       </span>
//     </div>
//   );
// }

// function CollapseIcon({ expanded }: { expanded: boolean }) {
//   return (
//     <svg
//       width={10}
//       height={10}
//       viewBox="0 0 10 10"
//       fill="none"
//       aria-hidden="true"
//       style={{ transition: "transform 0.25s ease", transform: expanded ? "rotate(0deg)" : "rotate(180deg)" }}
//     >
//       <polyline
//         points="2,7 5,3 8,7"
//         stroke="currentColor"
//         strokeWidth={1.5}
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//     </svg>
//   );
// }

// function CollapsedStrip({ markerPhaseNorm }: { markerPhaseNorm: number }) {
//   const phaseRad    = markerPhaseNorm * TWO_PI;
//   const inTransit   = Math.abs(markerPhaseNorm - TRANSIT_CENTER_NORM) < TRANSIT_HALF_WIDTH;

//   return (
//     <div
//       style={{
//         position:   "absolute",
//         bottom:     0,
//         left:       0,
//         right:      0,
//         height:     44,
//         display:    "flex",
//         alignItems: "center",
//         padding:    "0 16px",
//         gap:        16,
//         borderTop:  "1px solid rgba(255,255,255,0.05)",
//       }}
//     >
//       <span
//         style={{
//           fontFamily:    "'Space Mono', monospace",
//           fontSize:      10,
//           color:         "#22d3ee",
//           letterSpacing: "0.06em",
//         }}
//       >
//         φ = {phaseRad.toFixed(3)} rad
//       </span>

//       <span style={{ color: "rgba(71,85,105,0.50)", fontSize: 10 }}>·</span>

//       <span
//         style={{
//           fontFamily:    "'Space Mono', monospace",
//           fontSize:      9,
//           letterSpacing: "0.12em",
//           textTransform: "uppercase",
//           color:         inTransit ? "#f59e0b" : "rgba(71,85,105,0.60)",
//         }}
//       >
//         {inTransit ? "⬤ TRANSIT ACTIVE" : "○ NOMINAL"}
//       </span>

//       <div
//         style={{
//           flex:       1,
//           height:     2,
//           background: "rgba(255,255,255,0.04)",
//           borderRadius: 1,
//           overflow:   "hidden",
//           position:   "relative",
//         }}
//       >
//         <div
//           style={{
//             position:    "absolute",
//             top:         0,
//             left:        0,
//             width:       `${markerPhaseNorm * 100}%`,
//             height:      "100%",
//             background:  "linear-gradient(90deg, rgba(34,211,238,0.40) 0%, #22d3ee 100%)",
//             borderRadius: 1,
//             transition:  "width 0.3s ease",
//           }}
//         />
//       </div>
//     </div>
//   );
// }

// function EmptyState({ expanded }: { expanded: boolean }) {
//   if (!expanded) return null;
//   return (
//     <div
//       style={{
//         display:        "flex",
//         alignItems:     "center",
//         justifyContent: "center",
//         height:         "100%",
//         gap:            10,
//       }}
//     >
//       <div
//         style={{
//           width:        18,
//           height:       18,
//           borderRadius: "50%",
//           border:       "1.5px solid rgba(34,211,238,0.12)",
//           borderTopColor: "rgba(34,211,238,0.60)",
//           animation:    "spin 0.9s linear infinite",
//         }}
//       />
//       <span
//         style={{
//           fontFamily:    "'Space Mono', monospace",
//           fontSize:      9,
//           letterSpacing: "0.14em",
//           textTransform: "uppercase",
//           color:         "rgba(71,85,105,0.70)",
//         }}
//       >
//         Awaiting flux data stream...
//       </span>
//       <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
//     </div>
//   );
// }


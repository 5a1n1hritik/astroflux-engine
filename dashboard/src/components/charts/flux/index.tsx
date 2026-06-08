"use client";

/**
 * index.tsx
 * src/components/charts/flux/index.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified FluxChart orchestrator — Recharts-powered scientific light-curve
 * viewer. Fixed all TypeScript union type complexities [ts(2590), ts(2322)].
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
  memo,
} from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

// ── Public API ─────────────────────────────────────────────────────────────────

export interface FluxChartProps {
  timeArray:         number[];
  fluxArray:         number[];
  /** Cold-start initializer. Hot-path updates via FluxChartHandle.setPhase() */
  currentPhaseAngle: number;
}

export interface FluxChartHandle {
  /** Called 60×/sec by OrbitSimulator — zero React re-renders */
  setPhase: (radians: number) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TWO_PI = 2 * Math.PI;

/** Transit dip zone half-width in normalized phase [0,1] space */
const TRANSIT_HALF_WIDTH = 0.04;

/** Phase at which transit center occurs (normalized [0,1]) */
const TRANSIT_CENTER_NORM = 0.5; // phase = π

/** Zoom levels — stride multipliers for decimation */
const ZOOM_LEVELS = [1, 2, 3, 4] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];

/** Max data points sent to Recharts before decimation kicks in */
const MAX_RENDER_POINTS = 800;

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChartPoint {
  /** Normalized phase [0, 1] — maps to X axis */
  phase:        number;
  /** Raw F/F₀ float from pipeline */
  flux:         number;
  /** Amber step-line value — defined only in transit zone, undefined elsewhere */
  transitEvent: number | undefined;
  /** Original array index — used for raw-float tooltip reads */
  srcIdx:       number;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const FluxChart = forwardRef<FluxChartHandle, FluxChartProps>(
  function FluxChart({ timeArray, fluxArray, currentPhaseAngle }, ref) {

    // ── UI state (only what triggers visual re-renders) ───────────────────────
    const [expanded,  setExpanded]  = useState(true);
    const [zoom,      setZoom]      = useState<ZoomLevel>(1);
    /** Phase for the ReferenceLine — updated by a debounced rAF loop */
    const [markerPhaseNorm, setMarkerPhaseNorm] = useState(
      normalizePhase(currentPhaseAngle)
    );

    // ── Mutable refs — hot path, zero re-renders ──────────────────────────────
    const phaseRef        = useRef<number>(currentPhaseAngle);
    const rafRef          = useRef<number>(0);
    const lastMarkerNorm  = useRef<number>(normalizePhase(currentPhaseAngle));

    // ── Imperative handle: Three.js animation thread entry point ─────────────
    useImperativeHandle(ref, () => ({
      setPhase: (radians: number) => {
        phaseRef.current = radians;
      },
    }), []);

    // ── Phase marker loop ─────────────────────────────────────────────────────
    useEffect(() => {
      let running = true;

      function tick() {
        if (!running) return;
        const norm = normalizePhase(phaseRef.current);
        if (Math.abs(norm - lastMarkerNorm.current) > 0.005) {
          lastMarkerNorm.current = norm;
          setMarkerPhaseNorm(norm);
        }
        rafRef.current = requestAnimationFrame(tick);
      }

      rafRef.current = requestAnimationFrame(tick);
      return () => {
        running = false;
        cancelAnimationFrame(rafRef.current);
      };
    }, []);

    // ── Data pipeline: build chartData ────────────────────────────────────────
    const { chartData, yDomain, transitBounds } = useMemo(() => {
      if (timeArray.length === 0 || fluxArray.length === 0) {
        return { chartData: [], yDomain: [0.99, 1.01] as [number, number], transitBounds: null };
      }

      const n = Math.min(timeArray.length, fluxArray.length);

      let minF =  Infinity;
      let maxF = -Infinity;
      for (let i = 0; i < n; i++) {
        if (fluxArray[i] < minF) minF = fluxArray[i];
        if (fluxArray[i] > maxF) maxF = fluxArray[i];
      }
      const range  = maxF - minF || 1e-6;
      const yMin   = minF - range * 0.12;
      const yMax   = maxF + range * 0.08;

      const sorted    = Float64Array.from(fluxArray.slice(0, n)).sort();
      const median    = sorted[Math.floor(n / 2)];
      const threshold = median * 0.9975;

      let dipFirst = -1;
      let dipLast  = -1;
      for (let i = 0; i < n; i++) {
        if (fluxArray[i] < threshold) {
          if (dipFirst === -1) dipFirst = i;
          dipLast = i;
        }
      }

      const transitC     = dipFirst >= 0
        ? ((dipFirst + dipLast) * 0.5) / (n - 1)
        : TRANSIT_CENTER_NORM;
      const transitHalf  = dipFirst >= 0
        ? Math.max(0.01, ((dipLast - dipFirst) / (n - 1)) * 0.5 + 0.008)
        : TRANSIT_HALF_WIDTH;
      const transitLow   = transitC - transitHalf;
      const transitHigh  = transitC + transitHalf;

      const stride = Math.max(1, Math.floor(n / (MAX_RENDER_POINTS / zoom)));

      const tMin   = timeArray[0];
      const tRange = (timeArray[n - 1] - tMin) || 1;

      const points: ChartPoint[] = [];
      for (let i = 0; i < n; i += stride) {
        const phaseNorm = (timeArray[i] - tMin) / tRange;
        const inTransit = phaseNorm >= transitLow && phaseNorm <= transitHigh;

        points.push({
          phase:        phaseNorm,
          flux:         fluxArray[i],
          transitEvent: inTransit ? fluxArray[i] : undefined,
          srcIdx:       i,
        });
      }

      return {
        chartData:     points,
        yDomain:       [yMin, yMax] as [number, number],
        transitBounds: { low: transitLow, high: transitHigh, center: transitC },
      };
    }, [timeArray, fluxArray, zoom]);

    const handleZoom = useCallback((z: ZoomLevel) => setZoom(z), []);
    const toggleExpand = useCallback(() => setExpanded(v => !v), []);

    const formatPhase = useCallback((v: number) => {
      const labels: Record<string, string> = {
        "0":    "0",
        "0.25": "π/2",
        "0.5":  "π",
        "0.75": "3π/2",
        "1":    "2π",
      };
      const key = v.toFixed(2);
      return labels[key] ?? "";
    }, []);

    const formatFlux = useCallback((v: number) => v.toFixed(4), []);

    // ── Render Ticks directly in SVG workspace to bypass complex type unions ──
    const renderCustomAxisTick = (props: any) => {
      const { x, y, payload } = props;
      return (
        <g transform={`translate(${x},${y})`}>
          <text
            x={0}
            y={0}
            dy={12}
            textAnchor="middle"
            fill="#cbd5e1"
            style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px" }}
          >
            {props.isYAxis ? formatFlux(payload.value) : formatPhase(payload.value)}
          </text>
        </g>
      );
    };

    return (
      <div
        className="relative w-full rounded-xl border border-white/5 overflow-hidden"
        style={{
          background:           "rgba(2, 4, 9, 0.65)",
          backdropFilter:       "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          boxShadow:            "inset 0 1px 0 rgba(255,255,255,0.03), 0 24px 48px rgba(0,0,0,0.45)",
          transition:           "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        aria-label="Flux light curve chart"
      >
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-block rounded-full"
              style={{
                width:     5,
                height:    5,
                background: "#22d3ee",
                boxShadow: "0 0 6px #22d3ee",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily:    "'Space Mono', 'Courier New', monospace",
                fontSize:      9,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color:         "rgba(148, 163, 184, 0.75)",
              }}
            >
              Neural Flux Mapper — Recharts Scientific Layer
            </span>
          </div>

          <div className="flex items-center gap-3">
            {expanded && (
              <div className="flex items-center gap-1">
                {ZOOM_LEVELS.map((z) => (
                  <button
                    key={z}
                    onClick={() => handleZoom(z)}
                    style={{
                      fontFamily:    "'Space Mono', monospace",
                      fontSize:      8,
                      letterSpacing: "0.10em",
                      padding:       "2px 7px",
                      borderRadius:  4,
                      border:        "1px solid",
                      cursor:        "pointer",
                      transition:    "all 0.15s ease",
                      borderColor:   zoom === z
                        ? "rgba(34,211,238,0.50)"
                        : "rgba(255,255,255,0.07)",
                      background:    zoom === z
                        ? "rgba(34,211,238,0.10)"
                        : "rgba(255,255,255,0.02)",
                      color:         zoom === z ? "#22d3ee" : "rgba(100,116,139,0.80)",
                    }}
                    aria-pressed={zoom === z}
                    aria-label={`Zoom ${z}×`}
                  >
                    {z}×
                  </button>
                ))}
              </div>
            )}

            {expanded && (
              <div className="flex items-center gap-3">
                <LegendChip color="#22d3ee" label="F/F₀" />
                <LegendChip color="#f59e0b" label="Transit" dashed />
              </div>
            )}

            <button
              onClick={toggleExpand}
              aria-label={expanded ? "Collapse chart" : "Expand chart"}
              style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                width:          22,
                height:         22,
                borderRadius:   4,
                border:         "1px solid rgba(255,255,255,0.07)",
                background:     "rgba(255,255,255,0.02)",
                cursor:         "pointer",
                color:          "rgba(148,163,184,0.70)",
                transition:     "all 0.15s ease",
                flexShrink:     0,
              }}
            >
              <CollapseIcon expanded={expanded} />
            </button>
          </div>
        </div>

        {/* ── CHART AREA ─────────────────────────────────────────────────── */}
        <div
          style={{
            height:     expanded ? 192 : 44,
            overflow:   "hidden",
            transition: "height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {chartData.length === 0 ? (
            <EmptyState expanded={expanded} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 20, bottom: 20, left: 12 }}
              >
                <CartesianGrid
                  strokeDasharray=""
                  stroke="rgba(148, 163, 184, 0.04)"
                  strokeWidth={1}
                  vertical={false}
                />

                <XAxis
                  dataKey="phase"
                  type="number"
                  domain={[0, 1]}
                  ticks={[0, 0.25, 0.5, 0.75, 1]}
                  tick={renderCustomAxisTick}
                  axisLine={{ stroke: "rgba(148,163,184,0.25)", strokeWidth: 1 }}
                  tickLine={{ stroke: "rgba(148,163,184,0.20)", strokeWidth: 1 }}
                  label={{
                    value:    "ORBITAL PHASE  φ",
                    position: "insideBottom",
                    offset:   -12,
                    style:    {
                      fontFamily:    "'Space Mono', monospace",
                      fontSize:      9,
                      fill:          "rgba(148,163,184,0.60)",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    },
                  }}
                />

                <YAxis
                  domain={yDomain}
                  tick={(props) => renderCustomAxisTick({ ...props, isYAxis: true })}
                  width={62}
                  axisLine={{ stroke: "rgba(148,163,184,0.25)", strokeWidth: 1 }}
                  tickLine={{ stroke: "rgba(148,163,184,0.20)", strokeWidth: 1 }}
                  label={{
                    value:   "F / F₀",
                    angle:   -90,
                    position:"insideLeft",
                    offset:  12,
                    style:   {
                      fontFamily:    "'Space Mono', monospace",
                      fontSize:      9,
                      fill:          "rgba(148,163,184,0.60)",
                      letterSpacing: "0.10em",
                    },
                  }}
                />

                <Tooltip
                  content={<FluxTooltip fluxArray={fluxArray} />}
                  cursor={{
                    stroke:      "rgba(34,211,238,0.20)",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                />

                {transitBounds && (
                  <>
                    <ReferenceLine
                      x={transitBounds.low}
                      stroke="rgba(251,191,36,0.25)"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <ReferenceLine
                      x={transitBounds.high}
                      stroke="rgba(251,191,36,0.25)"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                  </>
                )}

                <ReferenceLine
                  x={markerPhaseNorm}
                  stroke="#22d3ee"
                  strokeWidth={1}
                  strokeOpacity={0.75}
                  label={{
                    value:    `φ=${(markerPhaseNorm * TWO_PI).toFixed(2)}`,
                    position: "top",
                    style:    {
                      fontFamily: "'Space Mono', monospace",
                      fontSize:   8,
                      fill:       "#22d3ee",
                    },
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="flux"
                  stroke="#22d3ee"
                  strokeWidth={1.2}
                  dot={false}
                  activeDot={{ r: 3, fill: "#22d3ee", stroke: "rgba(34,211,238,0.30)", strokeWidth: 6 }}
                  isAnimationActive={false}
                  connectNulls
                />

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
          )}
        </div>

        {!expanded && (
          <CollapsedStrip markerPhaseNorm={markerPhaseNorm} />
        )}
      </div>
    );
  }
);

FluxChart.displayName = "FluxChart";
export default FluxChart;

// ── UTILITIES ─────────────────────────────────────────────────────────────

function normalizePhase(radians: number): number {
  return (((radians % TWO_PI) + TWO_PI) % TWO_PI) / TWO_PI;
}

// ── SUB-COMPONENTS ─────────────────────────────────────────────────────────

interface FluxTooltipProps {
  active?:    boolean;
  payload?:   Array<{ payload: ChartPoint }>;
  fluxArray:  number[];
}

const FluxTooltip = memo(function FluxTooltip({
  active, payload, fluxArray,
}: FluxTooltipProps) {
  if (!active || !payload?.length) return null;

  const point   = payload[0].payload;
  const rawFlux = fluxArray[point.srcIdx] ?? point.flux;
  const phaseRad = point.phase * TWO_PI;

  return (
    <div
      style={{
        background:    "rgba(2, 4, 9, 0.90)",
        border:        "1px solid rgba(34, 211, 238, 0.28)",
        borderRadius:  6,
        padding:       "8px 11px",
        boxShadow:     "0 8px 24px rgba(0,0,0,0.50)",
      }}
    >
      <div
        style={{
          height:       1,
          background:   "linear-gradient(90deg, #22d3ee 0%, transparent 100%)",
          marginBottom: 7,
          borderRadius: 1,
        }}
      />
      <TooltipRow label="φ" value={`${phaseRad.toFixed(4)} rad`} />
      <TooltipRow label="F/F₀" value={rawFlux.toFixed(6)} highlight />
      {point.transitEvent !== undefined && (
        <TooltipRow label="EVT" value="TRANSIT DIP" amber />
      )}
    </div>
  );
});

interface TooltipRowProps {
  label:     string;
  value:     string;
  highlight?: boolean;
  amber?:    boolean;
}

function TooltipRow({ label, value, highlight, amber }: TooltipRowProps) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 3 }}>
      <span
        style={{
          fontFamily:    "'Space Mono', monospace",
          fontSize:      8,
          color:         "rgba(148,163,184,0.70)",
          letterSpacing: "0.10em",
          minWidth:      28,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize:   10,
          fontWeight: 700,
          color:      amber ? "#f59e0b" : highlight ? "#22d3ee" : "#cbd5e1",
          letterSpacing: "0.04em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function LegendChip({
  color, label, dashed,
}: { color: string; label: string; dashed?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <svg width={18} height={6} aria-hidden="true">
        <line
          x1={0} y1={3} x2={18} y2={3}
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray={dashed ? "4 3" : undefined}
          opacity={0.85}
        />
      </svg>
      <span
        style={{
          fontFamily:    "'Space Mono', monospace",
          fontSize:      8,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color:         "rgba(100,116,139,0.75)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function CollapseIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      style={{ transition: "transform 0.25s ease", transform: expanded ? "rotate(0deg)" : "rotate(180deg)" }}
    >
      <polyline
        points="2,7 5,3 8,7"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CollapsedStrip({ markerPhaseNorm }: { markerPhaseNorm: number }) {
  const phaseRad    = markerPhaseNorm * TWO_PI;
  const inTransit   = Math.abs(markerPhaseNorm - TRANSIT_CENTER_NORM) < TRANSIT_HALF_WIDTH;

  return (
    <div
      style={{
        position:   "absolute",
        bottom:     0,
        left:       0,
        right:      0,
        height:     44,
        display:    "flex",
        alignItems: "center",
        padding:    "0 16px",
        gap:        16,
        borderTop:  "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <span
        style={{
          fontFamily:    "'Space Mono', monospace",
          fontSize:      10,
          color:         "#22d3ee",
          letterSpacing: "0.06em",
        }}
      >
        φ = {phaseRad.toFixed(3)} rad
      </span>

      <span style={{ color: "rgba(71,85,105,0.50)", fontSize: 10 }}>·</span>

      <span
        style={{
          fontFamily:    "'Space Mono', monospace",
          fontSize:      9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color:         inTransit ? "#f59e0b" : "rgba(71,85,105,0.60)",
        }}
      >
        {inTransit ? "⬤ TRANSIT ACTIVE" : "○ NOMINAL"}
      </span>

      <div
        style={{
          flex:       1,
          height:     2,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 1,
          overflow:   "hidden",
          position:   "relative",
        }}
      >
        <div
          style={{
            position:    "absolute",
            top:         0,
            left:        0,
            width:       `${markerPhaseNorm * 100}%`,
            height:      "100%",
            background:  "linear-gradient(90deg, rgba(34,211,238,0.40) 0%, #22d3ee 100%)",
            borderRadius: 1,
            transition:  "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

function EmptyState({ expanded }: { expanded: boolean }) {
  if (!expanded) return null;
  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        height:         "100%",
        gap:            10,
      }}
    >
      <div
        style={{
          width:        18,
          height:       18,
          borderRadius: "50%",
          border:       "1.5px solid rgba(34,211,238,0.12)",
          borderTopColor: "rgba(34,211,238,0.60)",
          animation:    "spin 0.9s linear infinite",
        }}
      />
      <span
        style={{
          fontFamily:    "'Space Mono', monospace",
          fontSize:      9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color:         "rgba(71,85,105,0.70)",
        }}
      >
        Awaiting flux data stream...
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
"use client";

import { useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Activity,
  Pause,
  Play,
  Star,
  Orbit,
  Database,
  Gauge,
  Telescope,
} from "lucide-react";

// ── Upgraded Props Structure Aligned with Multi-Body Data Matrix ─────────────

export interface TelemetryData {
  targetName: string; // Dynamic active selected planet name (e.g., 'Kepler-90 h')
  mission: string; // System canonical host name reference
  starMassSolar: number;
  starRadiusSolar: number;
  totalDataPoints: number; // Now represents total active planets in the system array
  phaseAngleRad: number;
}

export interface TelemetryPanelProps {
  data: TelemetryData;
  isPlaying: boolean;
  onPlayPause: () => void;
  defaultExpanded?: boolean;
  className?: string;
}

interface TelemetryRow {
  label: string;
  icon: React.ReactNode;
  getValue: (d: TelemetryData) => string;
  accent?: "cyan" | "emerald" | "default";
}

// ── Upgraded Telemetry Data Rows Grid ─────────────────────────────────────────
const ROWS: TelemetryRow[] = [
  {
    label: "Active Target",
    icon: <Telescope size={9} strokeWidth={2} />,
    getValue: (d) => d.targetName,
    accent: "emerald",
  },
  {
    label: "Host System",
    icon: <Star size={9} strokeWidth={2} />,
    getValue: (d) => d.mission,
    accent: "default",
  },
  {
    label: "Stellar Mass",
    icon: <Orbit size={9} strokeWidth={2} />,
    getValue: (d) => `${d.starMassSolar.toFixed(3)} M☉`,
    accent: "cyan",
  },
  {
    label: "Stellar Radius",
    icon: <Activity size={9} strokeWidth={2} />,
    getValue: (d) => `${d.starRadiusSolar.toFixed(3)} R☉`,
    accent: "cyan",
  },
  {
    label: "Total Planets",
    icon: <Database size={9} strokeWidth={2} />,
    getValue: (d) => `${d.totalDataPoints} Worlds`,
    accent: "default",
  },
  {
    label: "Phase Angle",
    icon: <Gauge size={9} strokeWidth={2} />,
    getValue: (d) => `${(d.phaseAngleRad * (180 / Math.PI)).toFixed(2)}°`,
    accent: "cyan",
  },
];

const VALUE_COLORS = {
  cyan: "#22d3ee",
  emerald: "#34d399",
  default: "rgba(226,232,240,0.85)",
} as const;

export default function TelemetryPanel({
  data,
  isPlaying,
  onPlayPause,
  defaultExpanded = true,
  className = "",
}: TelemetryPanelProps) {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);
  const [hovered, setHovered] = useState<boolean>(false);
  const [active, setActive] = useState<boolean>(false);

  const toggleExpand = useCallback(() => setExpanded((v) => !v), []);

  const transform3D = active
    ? "perspective(800px) translateZ(6px)  scale(1.010)"
    : hovered
      ? "perspective(800px) translateZ(14px) scale(1.026)"
      : "perspective(800px) translateZ(0px)  scale(1.000)";

  return (
    <div
      className={`absolute ${className}`}
      style={{
        top: "50%",
        left: 28,
        transform: "translateY(-50%)",
        width: expanded ? 238 : "auto",
        zIndex: 10,
      }}
      aria-label="System telemetry panel"
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 12,
          background: "rgba(2,4,9,0.62)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(226,232,240,0.065)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,0.04)",
            "0 32px 64px rgba(0,0,0,0.50)",
            "0 0 0 0.5px rgba(226,232,240,0.04)",
          ].join(", "),
          backgroundImage: hovered
            ? "repeating-linear-gradient(0deg, rgba(34,211,238,0.012) 0px, rgba(34,211,238,0.012) 1px, transparent 1px, transparent 3px)"
            : "none",
          transition: "background-image 0.3s ease",
          pointerEvents: "none",
        }}
      />

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setActive(false);
        }}
        onMouseDown={() => setActive(true)}
        onMouseUp={() => setActive(false)}
        style={{
          position: "relative",
          transform: transform3D,
          transition: "transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          willChange: "transform",
          padding: expanded ? "14px 16px 12px" : "9px 14px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── COLLAPSED STATE ─────────────────────────────────────────────── */}
        {!expanded && (
          <div className="flex items-center gap-3">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isPlaying ? "#34d399" : "#fbbf24",
                boxShadow: isPlaying ? "0 0 8px #34d399" : "0 0 8px #fbbf24",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono, 'Space Mono', monospace)",
                fontSize: 10,
                fontWeight: 700,
                color: "#34d399",
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
              }}
            >
              {data.targetName}
            </span>
            <span style={{ color: "rgba(71,85,105,0.50)", fontSize: 9 }}>
              |
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono, 'Space Mono', monospace)",
                fontSize: 9,
                color: "#22d3ee",
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
              }}
            >
              {data.starMassSolar.toFixed(2)} M☉
            </span>
            <span style={{ color: "rgba(71,85,105,0.50)", fontSize: 9 }}>
              |
            </span>
            <button
              onClick={toggleExpand}
              aria-label="Expand telemetry panel"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 0 2px 4px",
                color: "rgba(71,85,105,0.70)",
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <ChevronDown size={12} strokeWidth={2} />
            </button>
          </div>
        )}

        {/* ── EXPANDED STATE ─────────────────────────────────────────────── */}
        {expanded && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: isPlaying ? "#34d399" : "#fbbf24",
                    boxShadow: isPlaying
                      ? "0 0 8px #34d399"
                      : "0 0 8px #fbbf24",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono, 'Space Mono', monospace)",
                    fontSize: 8.5,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(71,85,105,0.90)",
                  }}
                >
                  System Telemetry
                </span>
              </div>

              <button
                onClick={toggleExpand}
                aria-label="Collapse telemetry panel"
                style={{
                  background: "none",
                  border: "1px solid rgba(226,232,240,0.08)",
                  borderRadius: 4,
                  cursor: "pointer",
                  padding: "2px 4px",
                  color: "rgba(71,85,105,0.70)",
                  display: "flex",
                  alignItems: "center",
                  transition: "border-color 0.2s ease, color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(34,211,238,0.30)";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#22d3ee";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(226,232,240,0.08)";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "rgba(71,85,105,0.70)";
                }}
              >
                <ChevronUp size={10} strokeWidth={2} />
              </button>
            </div>

            <div
              style={{
                height: 1,
                background:
                  "linear-gradient(90deg, rgba(34,211,238,0.15) 0%, transparent 75%)",
                marginBottom: 10,
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {ROWS.map((row, i) => (
                <TelemetryRowItem
                  key={row.label}
                  row={row}
                  data={data}
                  isLast={i === ROWS.length - 1}
                />
              ))}
            </div>

            <div
              style={{
                height: 1,
                background:
                  "linear-gradient(90deg, rgba(226,232,240,0.06) 0%, transparent 80%)",
                margin: "12px 0 10px",
              }}
            />

            <button
              onClick={onPlayPause}
              aria-label={isPlaying ? "Pause simulation" : "Resume simulation"}
              style={{
                width: "100%",
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                borderRadius: 7,
                border: "1px solid",
                borderColor: isPlaying
                  ? "rgba(251,191,36,0.25)"
                  : "rgba(52,211,153,0.25)",
                background: isPlaying
                  ? "rgba(251,191,36,0.07)"
                  : "rgba(52,211,153,0.07)",
                cursor: "pointer",
                transition: "all 0.22s ease",
                fontFamily: "var(--font-mono, 'Space Mono', monospace)",
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: isPlaying ? "#fbbf24" : "#34d399",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = isPlaying
                  ? "rgba(251,191,36,0.13)"
                  : "rgba(52,211,153,0.13)";
                el.style.boxShadow = isPlaying
                  ? "0 0 18px rgba(251,191,36,0.14)"
                  : "0 0 18px rgba(52,211,153,0.14)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = isPlaying
                  ? "rgba(251,191,36,0.07)"
                  : "rgba(52,211,153,0.07)";
                el.style.boxShadow = "none";
              }}
            >
              {isPlaying ? (
                <Pause size={9} strokeWidth={2.5} />
              ) : (
                <Play size={9} strokeWidth={2.5} />
              )}
              {isPlaying ? "Pause Runtime" : "Engage Runtime"}
            </button>

            {hovered && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  bottom: -18,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontFamily: "var(--font-mono, 'Space Mono', monospace)",
                  fontSize: 6.5,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(34,211,238,0.28)",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  animation: "holo-fade 1.8s ease forwards",
                }}
              >
                ◆ HOLOGRAPHIC DISPLAY ◆
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes holo-fade {
          0%   { opacity: 0; transform: translateX(-50%) translateY(2px); }
          20%  { opacity: 1; transform: translateX(-50%) translateY(0px); }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

interface TelemetryRowItemProps {
  row: TelemetryRow;
  data: TelemetryData;
  isLast: boolean;
}

function TelemetryRowItem({ row, data, isLast }: TelemetryRowItemProps) {
  const valueColor = VALUE_COLORS[row.accent ?? "default"];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "5.5px 0",
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.035)",
        gap: 8,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}
      >
        <span style={{ color: "rgba(71,85,105,0.60)", display: "flex" }}>
          {row.icon}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono, 'Space Mono', monospace)",
            fontSize: 8.5,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "rgba(71,85,105,0.80)",
            whiteSpace: "nowrap",
          }}
        >
          {row.label}
        </span>
      </div>

      <span
        style={{
          fontFamily: "var(--font-mono, 'Space Mono', monospace)",
          fontSize: 10.5,
          fontWeight: 700,
          color: valueColor,
          textAlign: "right",
          letterSpacing: "0.04em",
          textShadow:
            row.accent !== "default" ? `0 0 12px ${valueColor}55` : "none",
        }}
      >
        {row.getValue(data)}
      </span>
    </div>
  );
}

"use client";

/**
 * Toolbar.tsx
 * src/components/charts/flux/components/Toolbar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * SRP: Isolated HUD control panel for the FluxChart cockpit layer.
 *
 * Contains:
 *   1. RenderMode tab selector — "line" | "scatter" | "line-scatter" | "step"
 *   2. Linear ↔ Log Y-scale toggle with safety lock when minFlux ≤ 0
 *   3. Sample density pills — 1× to 4× decimation control
 *   4. Reset View button — only rendered when a zoom is active
 *   5. Point count readout — "N pts in view / M total"
 *
 * Style contract:
 *   bg-slate-900/40 border border-white/5 backdrop-blur-md
 *   11px Space Mono, color #cbd5e1
 *   All interactive states via inline style (no Tailwind class collisions
 *   from conditional string building — safer for SSR hydration).
 *
 * No internal state — all values arrive as props and changes are emitted
 * via callback props. Toolbar is a pure controlled component.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { memo } from "react";
import {
  RENDER_MODES,
  DENSITY_LEVELS,
  type RenderMode,
  type YScaleMode,
  type DensityLevel,
} from "../types";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface ToolbarProps {
  // ── Current state ────────────────────────────────────────────────────────────
  renderMode: RenderMode;
  yScale: YScaleMode;
  density: DensityLevel;
  /** True when a zoom/pan is active — shows the Reset View button */
  isZoomed: boolean;
  /** Minimum flux value in the current dataset. Used for log-scale safety lock. */
  minFlux: number;
  /** Count of data points currently visible in the viewport (post-decimation) */
  pointsInView: number;
  /** Total raw data points in the full dataset */
  totalPoints: number;

  // ── Callbacks ────────────────────────────────────────────────────────────────
  onRenderMode: (mode: RenderMode) => void;
  onYScale: (scale: YScaleMode) => void;
  onDensity: (level: DensityLevel) => void;
  onResetView: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const Toolbar = memo(function Toolbar({
  renderMode,
  yScale,
  density,
  isZoomed,
  minFlux,
  pointsInView,
  totalPoints,
  onRenderMode,
  onYScale,
  onDensity,
  onResetView,
}: ToolbarProps) {
  /**
   * Log scale is unsafe when any flux value ≤ 0.
   * Recharts YAxis scale="log" with non-positive values produces NaN ticks
   * and broken rendering. We hard-disable the toggle in that case.
   */
  const logDisabled = minFlux <= 0;

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-3 py-2"
      style={{
        background: "rgba(15, 23, 42, 0.40)", // bg-slate-900/40
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
      role="toolbar"
      aria-label="Chart visualization controls"
    >
      {/* ── Section 1: RenderMode tabs ─────────────────────────────────────── */}
      <ControlSection label="MODE">
        {RENDER_MODES.map(({ id, label }) => (
          <TabButton
            key={id}
            active={renderMode === id}
            onClick={() => onRenderMode(id)}
            label={label}
            accentColor="#22d3ee"
            aria-pressed={renderMode === id}
            aria-label={`Render mode: ${label}`}
          />
        ))}
      </ControlSection>

      <Divider />

      {/* ── Section 2: Y-scale toggle ─────────────────────────────────────── */}
      <ControlSection label="Y SCALE">
        <ScaleToggle
          yScale={yScale}
          disabled={logDisabled}
          onToggle={() => onYScale(yScale === "linear" ? "log" : "linear")}
        />
        {logDisabled && (
          <LockBadge title="Log scale unavailable: dataset contains flux ≤ 0" />
        )}
      </ControlSection>

      <Divider />

      {/* ── Section 3: Sample density pills ──────────────────────────────── */}
      <ControlSection label="DENSITY">
        {DENSITY_LEVELS.map((level) => (
          <TabButton
            key={level}
            active={density === level}
            onClick={() => onDensity(level)}
            label={`${level}×`}
            accentColor="#a78bfa"
            aria-pressed={density === level}
            aria-label={`Sample density ${level}×`}
          />
        ))}
      </ControlSection>

      {/* ── Section 4: Reset view (conditional) ──────────────────────────── */}
      {isZoomed && (
        <>
          <Divider />
          <button
            onClick={onResetView}
            aria-label="Reset zoom to full view"
            style={{
              ...MONO,
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "3px 9px",
              borderRadius: 5,
              border: "1px solid rgba(251,191,36,0.35)",
              background: "rgba(251,191,36,0.08)",
              color: "#f59e0b",
              cursor: "pointer",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(251,191,36,0.16)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(251,191,36,0.60)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(251,191,36,0.08)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(251,191,36,0.35)";
            }}
          >
            ↺ Reset View
          </button>
        </>
      )}

      {/* ── Section 5: Point count readout (right-aligned) ───────────────── */}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span style={{ ...MONO, fontSize: 9, color: "rgba(148,163,184,0.50)" }}>
          PTS
        </span>
        <span
          style={{
            ...MONO,
            fontSize: 9,
            color: "#22d3ee",
            letterSpacing: "0.04em",
          }}
        >
          {pointsInView.toLocaleString()}
        </span>
        <span style={{ ...MONO, fontSize: 9, color: "rgba(71,85,105,0.60)" }}>
          / {totalPoints.toLocaleString()}
        </span>
      </div>
    </div>
  );
});

Toolbar.displayName = "Toolbar";
export default Toolbar;

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS — all pure, no internal state
// ─────────────────────────────────────────────────────────────────────────────

/** Labeled group wrapper */
function ControlSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      <span
        style={{
          ...MONO,
          fontSize: 8,
          fontWeight: 600,
          letterSpacing: "0.2em", // Letters space badhaye
          color: "rgba(148, 163, 184, 0.45)", // Sophisticated dim title
          marginRight: 6,
          textTransform: "uppercase",
          userSelect: "none",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
        {children}
      </div>
    </div>
  );
}

/** Individual tab/pill button */
interface TabButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  onClick: () => void;
  label: string;
  accentColor: string;
}

function TabButton({
  active,
  onClick,
  label,
  accentColor,
  ...rest
}: TabButtonProps) {
  const borderColor = active ? `${accentColor}55` : "rgba(255,255,255,0.06)";
  const bgColor = active
    ? hexWithAlpha(accentColor, 0.1)
    : "rgba(255,255,255,0.02)";
  const textColor = active ? accentColor : "rgba(100,116,139,0.85)";

  return (
    <button
      onClick={onClick}
      style={{
        ...MONO,
        fontSize: 9,
        fontWeight: active ? 600 : 400,
        letterSpacing: "0.12em",
        padding: "4px 12px",
        borderRadius: 5,
        border: `1px solid ${borderColor}`,
        background: bgColor,
        color: textColor,
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.color = accentColor;
          el.style.borderColor = `${accentColor}33`;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.color = "rgba(100,116,139,0.85)";
          el.style.borderColor = "rgba(255,255,255,0.06)";
        }
      }}
      {...rest}
    >
      {label}
    </button>
  );
}

/** Linear ↔ Log toggle with disabled state */
interface ScaleToggleProps {
  yScale: YScaleMode;
  disabled: boolean;
  onToggle: () => void;
}

function ScaleToggle({ yScale, disabled, onToggle }: ScaleToggleProps) {
  const isLog = yScale === "log";

  return (
    <button
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      aria-label={
        disabled
          ? "Log scale unavailable (flux ≤ 0 in dataset)"
          : `Switch to ${isLog ? "linear" : "logarithmic"} scale`
      }
      title={
        disabled
          ? "Log scale unavailable: dataset contains flux ≤ 0"
          : undefined
      }
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 4,
        border: "1px solid",
        borderColor: disabled
          ? "rgba(71,85,105,0.25)"
          : isLog
            ? "rgba(167,139,250,0.45)"
            : "rgba(255,255,255,0.08)",
        background: disabled
          ? "rgba(71,85,105,0.05)"
          : isLog
            ? "rgba(167,139,250,0.10)"
            : "rgba(255,255,255,0.02)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "all 0.18s ease",
      }}
    >
      {/* Track */}
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: 28,
          height: 14,
          borderRadius: 7,
          background: isLog && !disabled ? "#a78bfa" : "rgba(71,85,105,0.40)",
          transition: "background 0.2s ease",
          flexShrink: 0,
        }}
      >
        {/* Thumb */}
        <span
          style={{
            position: "absolute",
            top: 2,
            left: isLog ? 14 : 2,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: disabled ? "rgba(71,85,105,0.60)" : "#f8fafc",
            transition: "left 0.18s ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.40)",
          }}
        />
      </span>
      {/* Label */}
      <span
        style={{
          ...MONO,
          fontSize: 9,
          letterSpacing: "0.12em",
          color: disabled
            ? "rgba(71,85,105,0.60)"
            : isLog
              ? "#a78bfa"
              : "rgba(148,163,184,0.80)",
        }}
      >
        {isLog ? "LOG" : "LIN"}
      </span>
    </button>
  );
}

/** Safety lock icon shown when log scale is unavailable */
function LockBadge({ title }: { title: string }) {
  return (
    <span
      title={title}
      aria-label={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 6px",
        borderRadius: 3,
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.25)",
        cursor: "help",
      }}
    >
      <svg
        width={8}
        height={9}
        viewBox="0 0 8 9"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x={1}
          y={4}
          width={6}
          height={5}
          rx={1}
          stroke="rgba(239,68,68,0.70)"
          strokeWidth={1}
        />
        <path
          d="M2 4V3a2 2 0 014 0v1"
          stroke="rgba(239,68,68,0.70)"
          strokeWidth={1}
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <span
        style={{
          ...MONO,
          fontSize: 8,
          color: "rgba(239,68,68,0.75)",
          letterSpacing: "0.08em",
        }}
      >
        F≤0
      </span>
    </span>
  );
}

/** Vertical divider between control groups */
function Divider() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 1,
        height: 16,
        background: "rgba(255,255,255,0.06)",
        flexShrink: 0,
        margin: "0 2px",
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const MONO: React.CSSProperties = {
  fontFamily: "'Space Mono', 'Courier New', monospace",
  fontSize: 11,
  color: "#cbd5e1",
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: hex + explicit alpha → rgba string
// Handles both 3-char (#abc) and 6-char (#aabbcc) hex input.
// ─────────────────────────────────────────────────────────────────────────────

function hexWithAlpha(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

"use client";

/**
 * ViewSwitcher.tsx
 * src/components/universe/hud/ViewSwitcher.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NASA-style bottom-right VIEW mode toggle panel.
 * Three modes: Planet → System → Star
 *
 * SRP: Owns only active tab state display. Emits onViewChange to parent.
 * Never touches camera, scene, or simulation state directly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ViewMode = "planet" | "system" | "star";

export interface ViewSwitcherProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

// ── View config ───────────────────────────────────────────────────────────────

interface ViewOption {
  id: ViewMode;
  label: string;
  icon: React.ReactNode;
}

const VIEW_OPTIONS: ViewOption[] = [
  {
    id: "planet",
    label: "Planet",
    icon: (
      // Filled circle — planet
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8" fill="currentColor" opacity="0.9" />
      </svg>
    ),
  },
  {
    id: "system",
    label: "System",
    icon: (
      // Orbit ring with center dot — system
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <ellipse
          cx="11" cy="11" rx="9" ry="5"
          stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.9"
        />
        <circle cx="11" cy="11" r="2.2" fill="currentColor" opacity="0.9" />
      </svg>
    ),
  },
  {
    id: "star",
    label: "Star",
    icon: (
      // Radial burst — star
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="4.5" fill="currentColor" opacity="0.95" />
        {[0, 45, 90, 135].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 11 + Math.cos(rad) * 5.8;
          const y1 = 11 + Math.sin(rad) * 5.8;
          const x2 = 11 + Math.cos(rad) * 9.2;
          const y2 = 11 + Math.sin(rad) * 9.2;
          const x3 = 11 + Math.cos(rad + Math.PI) * 5.8;
          const y3 = 11 + Math.sin(rad + Math.PI) * 5.8;
          const x4 = 11 + Math.cos(rad + Math.PI) * 9.2;
          const y4 = 11 + Math.sin(rad + Math.PI) * 9.2;
          return (
            <g key={deg} opacity="0.85">
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <line x1={x3} y1={y3} x2={x4} y2={y4} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
    ),
  },
];

// ── Accent colors per view ────────────────────────────────────────────────────

const VIEW_ACCENT: Record<ViewMode, string> = {
  planet: "#22d3ee",   // cyan
  system: "#34d399",   // emerald
  star:   "#fbbf24",   // amber
};

const VIEW_GLOW: Record<ViewMode, string> = {
  planet: "rgba(34,211,238,0.22)",
  system: "rgba(52,211,153,0.22)",
  star:   "rgba(251,191,36,0.22)",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ViewSwitcher({
  activeView,
  onViewChange,
  className = "",
}: ViewSwitcherProps) {
  const handleSelect = useCallback(
    (view: ViewMode) => {
      if (view !== activeView) onViewChange(view);
    },
    [activeView, onViewChange]
  );

  return (
    <div
      className={className}
      style={{
        position:  "relative",
        display:   "inline-flex",
        flexDirection: "column",
        alignItems:    "center",
        gap:           0,
      }}
      aria-label="View mode switcher"
      role="radiogroup"
    >
      {/* Glass backplane */}
      <div
        aria-hidden="true"
        style={{
          position:        "absolute",
          inset:           0,
          borderRadius:    10,
          background:      "rgba(2,6,15,0.72)",
          backdropFilter:  "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border:          "1px solid rgba(226,232,240,0.07)",
          boxShadow:       "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
          pointerEvents:   "none",
        }}
      />

      {/* VIEW label */}
      <div
        style={{
          position:      "relative",
          padding:       "7px 0 5px",
          width:         "100%",
          textAlign:     "center",
          fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
          fontSize:      7.5,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color:         "rgba(100,116,139,0.70)",
          borderBottom:  "1px solid rgba(226,232,240,0.05)",
        }}
      >
        VIEW
      </div>

      {/* Buttons row */}
      <div
        style={{
          position: "relative",
          display:  "flex",
          flexDirection: "row",
          gap:      0,
          padding:  "6px 6px 8px",
        }}
      >
        {VIEW_OPTIONS.map((opt, idx) => {
          const isActive = opt.id === activeView;
          const accent   = VIEW_ACCENT[opt.id];
          const glow     = VIEW_GLOW[opt.id];

          return (
            <button
              key={opt.id}
              role="radio"
              aria-checked={isActive}
              aria-label={`${opt.label} view`}
              onClick={() => handleSelect(opt.id)}
              style={{
                position:       "relative",
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                gap:            5,
                width:          66,
                height:         62,
                borderRadius:   7,
                border:         isActive
                  ? `1px solid ${accent}44`
                  : "1px solid transparent",
                background:     isActive ? glow : "transparent",
                cursor:         isActive ? "default" : "pointer",
                color:          isActive ? accent : "rgba(100,116,139,0.65)",
                transition:     "all 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",
                outline:        "none",
                // Subtle separator between buttons
                marginLeft:     idx > 0 ? 2 : 0,
                boxShadow:      isActive ? `0 0 18px ${glow}` : "none",
              }}
              onMouseEnter={(e) => {
                if (isActive) return;
                const el = e.currentTarget;
                el.style.color      = "rgba(226,232,240,0.80)";
                el.style.background = "rgba(226,232,240,0.05)";
              }}
              onMouseLeave={(e) => {
                if (isActive) return;
                const el = e.currentTarget;
                el.style.color      = "rgba(100,116,139,0.65)";
                el.style.background = "transparent";
              }}
            >
              {/* Icon */}
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                {opt.icon}
              </span>

              {/* Label */}
              <span
                style={{
                  fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
                  fontSize:      8.5,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  fontWeight:    isActive ? 700 : 400,
                  lineHeight:    1,
                }}
              >
                {opt.label}
              </span>

              {/* Active underline pip */}
              {isActive && (
                <span
                  aria-hidden="true"
                  style={{
                    position:     "absolute",
                    bottom:       4,
                    left:         "50%",
                    transform:    "translateX(-50%)",
                    width:        18,
                    height:       2,
                    borderRadius: 1,
                    background:   accent,
                    boxShadow:    `0 0 6px ${accent}`,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
"use client";

/**
 * BottomControlBar.tsx
 * src/components/universe/hud/BottomControlBar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NASA-style bottom control bar.
 * Left: RATE label + horizontal slider
 * Center: rate value display (e.g. "1 sec/sec")
 * Right: global icon controls
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback } from "react";

export interface BottomControlBarProps {
  rate: number;          // 0.1 → 10.0
  onRateChange: (val: number) => void;
  isFullscreen: boolean;
  onFullscreen: () => void;
}

const MIN_RATE = 0.1;
const MAX_RATE = 10.0;

function formatRate(rate: number): string {
  if (rate < 1) return `${rate.toFixed(1)} sec/sec`;
  if (rate === 1) return "1 sec/sec";
  return `${rate.toFixed(1)}x sec/sec`;
}

export default function BottomControlBar({
  rate,
  onRateChange,
  isFullscreen,
  onFullscreen,
}: BottomControlBarProps) {
  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onRateChange(parseFloat(e.target.value));
    },
    [onRateChange]
  );

  // Slider fill % for custom track styling
  const fillPct = ((rate - MIN_RATE) / (MAX_RATE - MIN_RATE)) * 100;

  return (
    <>
      {/* Scoped slider styles */}
      <style>{`
        .af-rate-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 3px;
          border-radius: 2px;
          background: linear-gradient(
            to right,
            rgba(226,232,240,0.75) 0%,
            rgba(226,232,240,0.75) ${fillPct}%,
            rgba(71,85,105,0.35) ${fillPct}%,
            rgba(71,85,105,0.35) 100%
          );
          outline: none;
          cursor: pointer;
        }
        .af-rate-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #f1f5f9;
          border: 2px solid rgba(226,232,240,0.40);
          box-shadow: 0 0 6px rgba(0,0,0,0.60);
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .af-rate-slider::-webkit-slider-thumb:hover {
          transform: scale(1.25);
        }
        .af-rate-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #f1f5f9;
          border: 2px solid rgba(226,232,240,0.40);
          cursor: pointer;
        }
      `}</style>

      <div
        style={{
          position:       "absolute",
          bottom:         0,
          left:           0,
          right:          0,
          height:         44,
          display:        "flex",
          alignItems:     "center",
          paddingLeft:    20,
          paddingRight:   20,
          gap:            16,
          background:     "rgba(2,4,9,0.78)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop:      "1px solid rgba(226,232,240,0.06)",
          zIndex:         20,
        }}
        aria-label="Simulation control bar"
      >
        {/* ── LEFT: RATE label ── */}
        <span
          style={{
            fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
            fontSize:      9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color:         "rgba(100,116,139,0.80)",
            flexShrink:    0,
          }}
        >
          RATE
        </span>

        {/* ── SLIDER ── */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", maxWidth: 460 }}>
          <input
            type="range"
            className="af-rate-slider"
            min={MIN_RATE}
            max={MAX_RATE}
            step={0.1}
            value={rate}
            onChange={handleSlider}
            aria-label="Simulation rate"
            aria-valuemin={MIN_RATE}
            aria-valuemax={MAX_RATE}
            aria-valuenow={rate}
            aria-valuetext={formatRate(rate)}
          />
        </div>

        {/* ── CENTER: rate value ── */}
        <span
          style={{
            fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
            fontSize:      10,
            letterSpacing: "0.06em",
            color:         "rgba(203,213,225,0.80)",
            flexShrink:    0,
            minWidth:      80,
            textAlign:     "center",
          }}
        >
          {formatRate(rate)}
        </span>

        {/* ── RIGHT: global controls ── */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          {/* Fullscreen toggle */}
          <button
            onClick={onFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            style={{
              background: "none",
              border:     "none",
              cursor:     "pointer",
              padding:    4,
              color:      "rgba(100,116,139,0.70)",
              display:    "flex",
              transition: "color 0.18s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(226,232,240,0.90)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(100,116,139,0.70)"; }}
          >
            {isFullscreen ? (
              // Minimize icon
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 1v4H1M9 1v4h4M5 13v-4H1M9 13v-4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              // Maximize icon
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>

          {/* Settings icon */}
          <button
            aria-label="Settings"
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: 4, color: "rgba(100,116,139,0.70)", display: "flex",
              transition: "color 0.18s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(226,232,240,0.90)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(100,116,139,0.70)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.5 2.5l1 1M10.5 10.5l1 1M11.5 2.5l-1 1M3.5 10.5l-1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
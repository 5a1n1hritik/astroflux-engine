"use client";

import { useMemo } from "react";
import type { ViewMode } from "./ViewSwitcher";
import { TIME_PRESETS } from "@/lib/timePresets";

export interface BottomControlBarProps {
  rateIndex: number;
  onRateChange: (index: number) => void;
  isFullscreen: boolean;
  onFullscreen: () => void;
  viewMode: ViewMode;
  systemData: any;
}

const PRESET_MAX = TIME_PRESETS.length - 1;

function resolveStarChips(sd: any) {
  const spectral = sd?.star_parameters?.spectral_type ?? "G";
  const cls = spectral.charAt(0).toUpperCase();
  const grid: any[] = sd?.simulation_grid ?? [];
  const chips = [
    ...new Set(
      grid
        .map((p: any) => p.planet_name?.replace(/\s+[a-z]$/i, "").trim())
        .filter(Boolean),
    ),
  ].slice(0, 4) as string[];
  return { label: `MORE SYSTEMS WITH ${cls}-TYPE STARS`, chips };
}

function resolvePlanetChips(sd: any) {
  const grid: any[] = sd?.simulation_grid ?? [];
  const tagMap: Record<string, string> = {
    "Rocky Terrestrial (Earth-like)": "Super Earths",
    "Super-Earth": "Super Earths",
    "Neptune-like (Ice Giant)": "Neptune-like",
    "Gas Giant": "Gas Giants",
    "Unclassified Exoplanet": "Transit Discoveries",
  };
  const tags = [
    ...new Set(
      grid
        .map((p: any) => tagMap[p.classification_type] ?? p.classification_type)
        .filter(Boolean),
    ),
  ].slice(0, 3) as string[];
  const extra = ["Transit Discoveries", "Kepler Discoveries"].filter(
    (t) => !tags.includes(t),
  );
  const allTags = [...tags, ...extra].slice(0, 4);
  const planets = grid
    .slice(0, 4)
    .map((p: any) => p.planet_name)
    .filter(Boolean);
  return { tags: allTags, planets };
}

const label: React.CSSProperties = {
  fontFamily: "var(--font-mono,'Space Mono',monospace)",
  fontSize: 9,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "rgba(100,116,139,.80)",
  flexShrink: 0,
  whiteSpace: "nowrap",
};
const chip: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: "var(--font-mono,'Space Mono',monospace)",
  fontSize: 10,
  letterSpacing: "0.04em",
  color: "rgba(203,213,225,.75)",
  padding: "2px 8px",
  borderRadius: 3,
  whiteSpace: "nowrap",
};
const icon: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 4,
  color: "rgba(100,116,139,.70)",
  display: "flex",
  transition: "color 0.18s ease",
};

function Icons({
  isFullscreen,
  onFullscreen,
}: {
  isFullscreen: boolean;
  onFullscreen: () => void;
}) {
  return (
    <div
      style={{
        marginLeft: "auto",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexShrink: 0,
      }}
    >
      <button
        onClick={onFullscreen}
        style={icon}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "rgba(226,232,240,.90)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "rgba(100,116,139,.70)";
        }}
      >
        {isFullscreen ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M5 1v4H1M9 1v4h4M5 13v-4H1M9 13v-4h4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      <button
        style={icon}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "rgba(226,232,240,.90)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "rgba(100,116,139,.70)";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.5 2.5l1 1M10.5 10.5l1 1M11.5 2.5l-1 1M3.5 10.5l-1 1"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

export default function BottomControlBar({
  rateIndex,
  onRateChange,
  isFullscreen,
  onFullscreen,
  viewMode,
  systemData,
}: BottomControlBarProps) {
  
  const fillPct = (rateIndex / PRESET_MAX) * 100;
  const starData = useMemo(() => resolveStarChips(systemData), [systemData]);
  const planetData = useMemo(
    () => resolvePlanetChips(systemData),
    [systemData],
  );

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
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 44,
          display: "flex",
          alignItems: "center",
          paddingLeft: 20,
          paddingRight: 20,
          gap: 16,
          background: "rgba(2,4,9,0.78)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(226,232,240,0.06)",
          zIndex: 20,
        }}
        aria-label="Simulation control bar"
      >
        {/* SYSTEM — rate slider */}
        {viewMode === "system" && (
          <>
            {/* ── LEFT: RATE label ── */}
            <span
              style={{
                fontFamily: "var(--font-mono, 'Space Mono', monospace)",
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(100,116,139,0.80)",
                flexShrink: 0,
              }}
            >
              RATE
            </span>

            {/* ── SLIDER ── */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                maxWidth: 460,
              }}
            >
              <input
                type="range"
                className="af-rate-slider"
                min={0}
                max={PRESET_MAX}
                step={1}
                value={rateIndex}
                onChange={(e) => onRateChange(parseInt(e.target.value))}
                aria-label="Simulation rate"
              />
            </div>

            {/* ── CENTER: rate value ── */}
            <span
              style={{
                fontFamily: "var(--font-mono, 'Space Mono', monospace)",
                fontSize: 10,
                letterSpacing: "0.06em",
                color: "rgba(203,213,225,0.80)",
                flexShrink: 0,
                minWidth: 100,
                textAlign: "center",
              }}
            >
              {TIME_PRESETS[rateIndex].label}
            </span>

            <Icons isFullscreen={isFullscreen} onFullscreen={onFullscreen} />
          </>
        )}

        {/* STAR — more systems */}
        {viewMode === "star" && systemData && (
          <>
            <span style={label}>{starData.label}:</span>
            <span
              style={{
                color: "rgba(71,85,105,.50)",
                fontSize: 10,
                flexShrink: 0,
              }}
            >
              |
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                overflow: "hidden",
              }}
            >
              {starData.chips.map((c: string) => (
                <button key={c} style={chip}>
                  {c}
                </button>
              ))}
            </div>
            <Icons isFullscreen={isFullscreen} onFullscreen={onFullscreen} />
          </>
        )}

        {/* PLANET — more planets like this */}
        {viewMode === "planet" && systemData && (
          <>
            <span style={label}>MORE PLANETS LIKE THIS:</span>
            <span
              style={{
                color: "rgba(71,85,105,.50)",
                fontSize: 10,
                flexShrink: 0,
              }}
            >
              |
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                overflow: "hidden",
              }}
            >
              {planetData.tags.map((t: string) => (
                <button key={t} style={chip}>
                  {t}
                </button>
              ))}
              <span
                style={{
                  color: "rgba(71,85,105,.50)",
                  fontSize: 10,
                  margin: "0 4px",
                }}
              >
                |
              </span>
              {planetData.planets.slice(0, 3).map((p: string) => (
                <button
                  key={p}
                  style={{ ...chip, color: "rgba(148,163,184,.70)" }}
                >
                  {p}
                </button>
              ))}
            </div>
            <Icons isFullscreen={isFullscreen} onFullscreen={onFullscreen} />
          </>
        )}
      </div>
    </>
  );
}

"use client";

/**
 * BottomInfoCard.tsx
 * src/components/universe/hud/BottomInfoCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NASA "Eyes on Exoplanets" style bottom-left context overlay.
 * Plain typographic float — no card, no glass. Text directly over canvas.
 *
 * Content shifts per ViewMode:
 *   planet → planet name + classification + "LEARN MORE +"
 *   system → star name + planet count description
 *   star   → star name + spectral description + "LEARN MORE +"
 *
 * SRP: Purely presentational. Receives all data via props.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo } from "react";
import type { ViewMode } from "./ViewSwitcher";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface BottomInfoCardProps {
  viewMode:    ViewMode;
  systemData:  any;        // Full API response shape
  className?:  string;
}

// ── Content resolver ─────────────────────────────────────────────────────────

interface ResolvedContent {
  title:       string;
  subtitle:    string;
  showLearnMore: boolean;
  learnMoreLabel: string;
}

function resolveContent(viewMode: ViewMode, systemData: any): ResolvedContent {
  if (!systemData) {
    return { title: "—", subtitle: "", showLearnMore: false, learnMoreLabel: "" };
  }

  const starName    = systemData.star_parameters?.canonical_name ?? systemData.system_id ?? "Unknown";
  const totalPlanets = systemData.simulation_grid?.length ?? 0;
  const distanceLy  = systemData.space_location?.distance_light_years;
  const spectral    = systemData.star_parameters?.spectral_type ?? "Unknown";
  const distanceStr = distanceLy != null ? `${Math.round(distanceLy).toLocaleString()} light-years` : null;

  // First planet in grid for planet view
  const firstPlanet = systemData.simulation_grid?.[0];
  const planetName  = firstPlanet?.planet_name ?? starName;
  const classification = firstPlanet?.classification_type ?? "Exoplanet";

  const spectralDesc: Record<string, string> = {
    "G": "G-type star",
    "K": "K-type orange dwarf star",
    "M": "M-type red dwarf star",
    "F": "F-type yellow-white star",
    "A": "A-type white star",
    "B": "B-type blue-white star",
    "O": "O-type blue supergiant star",
  };
  const spectralClass = spectral.charAt(0).toUpperCase();
  const spectralLabel = spectralDesc[spectralClass] ?? `${spectral} star`;

  switch (viewMode) {
    case "planet":
      return {
        title:          planetName,
        subtitle:       classification,
        showLearnMore:  true,
        learnMoreLabel: "LEARN MORE +",
      };

    case "system":
      return {
        title: starName,
        subtitle: [
          `${totalPlanets} planet${totalPlanets !== 1 ? "s" : ""} orbiting a ${spectralLabel}`,
          distanceStr ? `${distanceStr} from Earth` : null,
        ].filter(Boolean).join(", "),
        showLearnMore:  false,
        learnMoreLabel: "",
      };

    case "star":
      return {
        title: starName,
        subtitle: [
          `A ${spectralLabel}`,
          distanceStr ? `${distanceStr} from Earth` : null,
        ].filter(Boolean).join(", "),
        showLearnMore:  true,
        learnMoreLabel: "LEARN MORE +",
      };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BottomInfoCard({
  viewMode,
  systemData,
  className = "",
}: BottomInfoCardProps) {
  const content = useMemo(
    () => resolveContent(viewMode, systemData),
    [viewMode, systemData]
  );

  return (
    <div
      className={className}
      style={{
        display:       "flex",
        flexDirection: "column",
        gap:           6,
        // Max width so subtitle doesn't bleed too wide
        maxWidth:      480,
      }}
      aria-live="polite"
      aria-label="Target information"
    >
      {/* Title row: name + optional learn more button */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <h2
          style={{
            margin:        0,
            fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
            fontSize:      28,
            fontWeight:    700,
            letterSpacing: "-0.01em",
            color:         "#f1f5f9",
            lineHeight:    1.1,
            textShadow:    "0 2px 24px rgba(0,0,0,0.80)",
          }}
        >
          {content.title}
        </h2>

        {content.showLearnMore && (
          <button
            aria-label={`${content.learnMoreLabel} about ${content.title}`}
            style={{
              display:       "inline-flex",
              alignItems:    "center",
              padding:       "5px 12px",
              borderRadius:  20,
              border:        "1px solid rgba(226,232,240,0.25)",
              background:    "rgba(226,232,240,0.08)",
              backdropFilter:"blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              cursor:        "pointer",
              fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color:         "rgba(226,232,240,0.75)",
              transition:    "all 0.18s ease",
              whiteSpace:    "nowrap",
              flexShrink:    0,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.background   = "rgba(226,232,240,0.15)";
              el.style.borderColor  = "rgba(226,232,240,0.45)";
              el.style.color        = "#f1f5f9";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background   = "rgba(226,232,240,0.08)";
              el.style.borderColor  = "rgba(226,232,240,0.25)";
              el.style.color        = "rgba(226,232,240,0.75)";
            }}
          >
            {content.learnMoreLabel}
          </button>
        )}
      </div>

      {/* Subtitle */}
      {content.subtitle && (
        <p
          style={{
            margin:        0,
            fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
            fontSize:      12,
            fontWeight:    400,
            color:         "rgba(148,163,184,0.85)",
            letterSpacing: "0.02em",
            lineHeight:    1.5,
            textShadow:    "0 1px 12px rgba(0,0,0,0.70)",
          }}
        >
          {content.subtitle}
        </p>
      )}
    </div>
  );
}
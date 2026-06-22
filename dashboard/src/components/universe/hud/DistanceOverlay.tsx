"use client";

/**
 * DistanceOverlay.tsx
 * src/components/universe/hud/DistanceOverlay.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * NASA "Eyes on Exoplanets" style distance readout.
 * Vertically centered on the LEFT edge of the viewport.
 * Plain text over canvas — no card, no background.
 *
 * "You are
 *  1,799 light-years
 *  from Earth"
 *
 * SRP: Display only. Receives distance value via props.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface DistanceOverlayProps {
  distanceLightYears: number | null | undefined;
  className?: string;
}

export default function DistanceOverlay({
  distanceLightYears,
  className = "",
}: DistanceOverlayProps) {
  const formatted =
    distanceLightYears != null
      ? Math.round(distanceLightYears).toLocaleString()
      : "—";

  return (
    <div
      className={className}
      style={{
        position:      "absolute",
        top:           "50%",
        left:          18,
        transform:     "translateY(-50%)",
        display:       "flex",
        flexDirection: "column",
        gap:           1,
        pointerEvents: "none",
        zIndex:        10,
      }}
      aria-label={`Distance: ${formatted} light-years from Earth`}
    >
      <span
        style={{
          fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
          fontSize:      11,
          fontWeight:    400,
          color:         "rgba(203,213,225,0.70)",
          letterSpacing: "0.01em",
          lineHeight:    1.4,
          textShadow:    "0 1px 8px rgba(0,0,0,0.80)",
        }}
      >
        You are
      </span>

      <span
        style={{
          fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
          fontSize:      13,
          fontWeight:    700,
          color:         "rgba(226,232,240,0.90)",
          letterSpacing: "0.01em",
          lineHeight:    1.3,
          textShadow:    "0 1px 12px rgba(0,0,0,0.85)",
        }}
      >
        {formatted} light-years
      </span>

      <span
        style={{
          fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
          fontSize:      11,
          fontWeight:    400,
          color:         "rgba(203,213,225,0.70)",
          letterSpacing: "0.01em",
          lineHeight:    1.4,
          textShadow:    "0 1px 8px rgba(0,0,0,0.80)",
        }}
      >
        from Earth
      </span>
    </div>
  );
}
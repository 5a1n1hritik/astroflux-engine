"use client";

/**
 * HeaderToken.tsx
 * src/components/hud/HeaderToken.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Brand wordmark HUD element. Fixed top-left overlay.
 *
 * SRP: This component is responsible for one thing only —
 * rendering the product identity mark and its live-status indicator.
 * No data fetching, no simulation state, no side effects.
 *
 * Visual language:
 *   - Split wordmark: "NEXUS //" in muted cyan, "ASTROFLUX-ENGINE" in white
 *   - Version badge: monospaced pill, subtly bordered
 *   - Sub-text: 8px tracked caps, --color-text-muted
 *   - Status beacon: dual-ring pulsing dot (active simulation indicator)
 *   - Decorative top-left bracket from globals.css `.bracketed`
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from "react";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface HeaderTokenProps {
  /** Controls whether the pulsing status beacon shows "live" or "standby" */
  isLive?: boolean;
  /** Override version string. Default: "v2.4" */
  version?: string;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HeaderToken({
  isLive  = true,
  version = "v2.4",
  className = "",
}: HeaderTokenProps) {
  // Ref for the animating beacon ring — imperative opacity pulse
  // avoids re-renders during simulation playback
  const beaconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = beaconRef.current;
    if (!el || !isLive) return;

    let t = 0;
    let rafId: number;

    const pulse = () => {
      t += 0.025;
      // Smooth sinusoidal opacity oscillation: 0.25 → 1.0
      el.style.opacity = String(0.625 + 0.375 * Math.sin(t));
      rafId = requestAnimationFrame(pulse);
    };

    rafId = requestAnimationFrame(pulse);
    return () => cancelAnimationFrame(rafId);
  }, [isLive]);

  return (
    <div
      className={`absolute flex flex-col gap-1.5 select-none ${className}`}
      style={{ top: 28, left: 28 }}
      aria-label="AstroFlux Engine — brand header"
    >
      {/* ── Wordmark row ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5">

        {/* Live beacon — dual concentric rings */}
        <span className="relative flex items-center justify-center w-4 h-4 flex-shrink-0">
          {/* Outer pulse ring */}
          <span
            ref={beaconRef}
            className="absolute inset-0 rounded-full"
            style={{
              background: isLive
                ? "radial-gradient(circle, rgba(34,211,238,0.18) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(71,85,105,0.18) 0%, transparent 70%)",
              border: `1px solid ${isLive ? "rgba(34,211,238,0.35)" : "rgba(71,85,105,0.35)"}`,
            }}
          />
          {/* Inner solid dot */}
          <span
            className="relative rounded-full z-10"
            style={{
              width:     6,
              height:    6,
              background: isLive ? "#22d3ee" : "#475569",
              boxShadow:  isLive ? "0 0 8px #22d3ee, 0 0 2px #22d3ee" : "none",
            }}
          />
        </span>

        {/* Split wordmark */}
        <span
          style={{
            fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
            fontSize:      13,
            fontWeight:    700,
            letterSpacing: "0.20em",
            lineHeight:    1,
          }}
        >
          {/* "NEXUS //" — subdued cyan, the namespace prefix */}
          <span style={{ color: "rgba(34,211,238,0.65)" }}>NEXUS&nbsp;//&nbsp;</span>
          {/* "ASTROFLUX-ENGINE" — full white, the product name */}
          <span
            style={{
              color:      "#f1f5f9",
              background: "linear-gradient(90deg, #f1f5f9 0%, #94d4e8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor:  "transparent",
              backgroundClip: "text",
            }}
          >
            ASTROFLUX-ENGINE
          </span>
        </span>

        {/* Version badge */}
        <span
          style={{
            fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
            fontSize:      8,
            letterSpacing: "0.12em",
            color:         "rgba(34,211,238,0.55)",
            border:        "1px solid rgba(34,211,238,0.20)",
            borderRadius:  3,
            padding:       "1px 5px",
            lineHeight:    "16px",
            background:    "rgba(34,211,238,0.05)",
          }}
        >
          {version}
        </span>
      </div>

      {/* ── Sub-text caption ──────────────────────────────────────────────── */}
      <p
        style={{
          fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
          fontSize:      8,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color:         "rgba(71,85,105,0.85)",    // --color-text-muted
          paddingLeft:   26,                        // aligns under wordmark, past beacon
          lineHeight:    1.4,
          margin:        0,
        }}
      >
        Quantum Simulation Environment — Exoplanetary Transits
      </p>

      {/* ── Status line ───────────────────────────────────────────────────── */}
      <div
        style={{
          paddingLeft:  26,
          display:      "flex",
          alignItems:   "center",
          gap:          6,
        }}
      >
        <span
          style={{
            fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
            fontSize:      7.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color:         isLive ? "rgba(52,211,153,0.70)" : "rgba(71,85,105,0.60)",
          }}
        >
          {isLive ? "SIM_ONLINE" : "SIM_STANDBY"}
        </span>
        {/* Short horizontal rule separator */}
        <span
          style={{
            display:    "block",
            width:      20,
            height:     1,
            background: isLive
              ? "linear-gradient(90deg, rgba(52,211,153,0.35) 0%, transparent 100%)"
              : "linear-gradient(90deg, rgba(71,85,105,0.25) 0%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}
'use client';

/**
 * AppFeaturedGrid.tsx
 * Responsibility: Primary structural container for the 4 NASA-Eyes mission cards.
 * Hidden below viewport until scrollOffset crosses 0.30, then fades in and
 * translates upward — all driven by inline style from the prop, zero JS animation
 * libraries needed.
 *
 * SRP: owns layout + card data only; no canvas, no scroll logic, no Three.js.
 * pointer-events-none on structural wrappers; pointer-events-auto on cards only.
 */

import React from 'react';

// ─── types ────────────────────────────────────────────────────────────────────

interface MissionCard {
  id:          string;
  eyebrow:     string;   // e.g. "NEAR-EARTH OBJECT TRACKER"
  title:       string;   // e.g. "Eyes on Asteroids"
  cta:         string;   // e.g. "Track Closest Asteroids"
  telemetry:   string;   // realistic one-liner system status
  description: string;   // 2-sentence body copy
  statusKey:   'LIVE' | 'SYNC' | 'NOMINAL' | 'ACTIVE';
  accentHue:   string;   // Tailwind arbitrary color for the card's accent strip
}

interface AppFeaturedGridProps {
  scrollOffset: number; // 0–1; reveal begins at 0.30, complete by 0.62
}

// ─── card data ────────────────────────────────────────────────────────────────

const MISSION_CARDS: MissionCard[] = [
  {
    id:          'solar-system',
    eyebrow:     'Heliocentric Navigation Suite',
    title:       'Eyes on the Solar System',
    cta:         'Explore the Solar System',
    telemetry:   'Ephemeris feed locked · JPL Horizons Δv nominal',
    description:
      'Real-time 3D positional data for every catalogued body in the solar system, '
      + 'rendered against NASA JPL ephemeris. Track planetary conjunctions, spacecraft '
      + 'trajectories, and gravitational resonance corridors.',
    statusKey:   'NOMINAL',
    accentHue:   '#f59e0b',  // amber — solar warmth
  },
  {
    id:          'asteroids',
    eyebrow:     'Near-Earth Object Tracker',
    title:       'Eyes on Asteroids',
    cta:         'Track Closest Asteroids',
    telemetry:   'Torino hazard index nominal · CNEOS relay active',
    description:
      'Live ingestion of CNEOS close-approach data feeds, cross-referenced against '
      + 'ATLAS and Pan-STARRS survey pipelines. Closest-approach vectors and impact '
      + 'probability windows updated every 6 hours.',
    statusKey:   'LIVE',
    accentHue:   '#ef4444',  // red — hazard register
  },
  {
    id:          'earth',
    eyebrow:     'Planetary Vital Signs Monitor',
    title:       'Eyes on Earth',
    cta:         'View Vital Signs',
    telemetry:   'MODIS thermal band lock · CO₂ ppm sync active',
    description:
      'Aggregated remote-sensing telemetry from MODIS, VIIRS, and Sentinel-2 '
      + 'constellations. Carbon cycle, sea surface temperature, and ice-extent '
      + 'anomalies visualised at 250 m resolution.',
    statusKey:   'SYNC',
    accentHue:   '#22d3ee',  // cyan — Earth oceans
  },
  {
    id:          'exoplanets',
    eyebrow:     'Exoplanetary Transit Observatory',
    title:       'Eyes on Exoplanets',
    cta:         'Explore Exoplanets',
    telemetry:   'Kepler archive nominal · TESS sector 67 ingesting',
    description:
      'Photometric transit light-curve library spanning 5 500+ confirmed exoplanets '
      + 'from Kepler, K2, and TESS missions. Filter by stellar class, habitable-zone '
      + 'radius, and transit signal-to-noise threshold.',
    statusKey:   'ACTIVE',
    accentHue:   '#a78bfa',  // violet — deep space/exo
  },
];

// ─── status badge colours ─────────────────────────────────────────────────────

const STATUS_STYLES: Record<MissionCard['statusKey'], string> = {
  LIVE:    'text-red-400    border-red-900/60    bg-red-950/40',
  SYNC:    'text-cyan-400   border-cyan-900/60   bg-cyan-950/40',
  NOMINAL: 'text-emerald-400 border-emerald-900/60 bg-emerald-950/40',
  ACTIVE:  'text-violet-400 border-violet-900/60 bg-violet-950/40',
};

// ─── sub-components ───────────────────────────────────────────────────────────

interface CardProps {
  card:  MissionCard;
  index: number;
  /** 0–1 scroll progress, used to stagger individual card entrance */
  t:     number;
}

function MissionCardItem({ card, index, t }: CardProps): React.ReactElement {
  // Each card staggers by 80ms equivalent in the 0–1 t space
  const stagger  = index * 0.07;
  const localT   = Math.max(0, Math.min(1, (t - stagger) / 0.22));
  const cardOpacity   = localT;
  const cardTranslate = (1 - localT) * 28; // px shift downward when hidden

  return (
    <div
      className={[
        // Base card shell — borderless dark aerospace theme per brief
        'group relative flex flex-col gap-4',
        'bg-slate-950/40 border border-slate-800/60 backdrop-blur-md',
        'p-6 rounded-xl',
        'hover:border-cyan-500/30',
        'transition-colors duration-300',
        'pointer-events-auto',   // ← cards are the ONLY interactive nodes
        'cursor-pointer',
      ].join(' ')}
      style={{
        opacity:   cardOpacity,
        transform: `translateY(${cardTranslate}px)`,
        transition: 'opacity 0.4s ease, transform 0.4s ease, border-color 0.3s ease',
        // Per-card top accent stripe using the card's accentHue
        borderTop: `1px solid ${card.accentHue}22`,
      }}
      role="button"
      tabIndex={0}
      aria-label={card.cta}
    >
      {/* Accent hairline — top edge glow */}
      <div
        className="absolute top-0 left-6 right-6 h-px rounded-full opacity-40
                   group-hover:opacity-80 transition-opacity duration-300"
        style={{ background: card.accentHue }}
      />

      {/* ── Card header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          {/* Eyebrow — mission type label */}
          <span className="font-mono text-[9px] tracking-[0.3em] text-slate-500 uppercase">
            {card.eyebrow}
          </span>
          {/* Title */}
          <h3 className="font-mono text-sm font-semibold tracking-wide text-slate-100">
            {card.title}
          </h3>
        </div>

        {/* Status badge */}
        <span
          className={`flex-shrink-0 font-mono text-[9px] tracking-[0.25em] uppercase
                      border px-2 py-1 rounded-sm ${STATUS_STYLES[card.statusKey]}`}
        >
          {card.statusKey}
        </span>
      </div>

      {/* ── Telemetry readout ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span
          className="w-1 h-1 rounded-full flex-shrink-0"
          style={{ background: card.accentHue, opacity: 0.8 }}
        />
        <span className="font-mono text-[10px] text-slate-500 tracking-wide truncate">
          {card.telemetry}
        </span>
      </div>

      {/* ── Description ───────────────────────────────────────────────── */}
      <p className="text-xs text-slate-400 leading-relaxed tracking-wide font-sans">
        {card.description}
      </p>

      {/* ── CTA row ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-auto pt-2
                      border-t border-slate-800/50">
        <span
          className="font-mono text-[11px] tracking-widest uppercase transition-colors duration-200"
          style={{ color: card.accentHue }}
        >
          {card.cta}
        </span>

        {/* Arrow — nudges right on hover */}
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1"
          style={{ color: card.accentHue, opacity: 0.7 }}
        >
          <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function AppFeaturedGrid({
  scrollOffset,
}: AppFeaturedGridProps): React.ReactElement {
  // Container becomes visible when scrollOffset > 0.30
  // Fully in place by 0.62
  const REVEAL_START = 0.30;
  const REVEAL_END   = 0.62;
  const t = Math.max(
    0,
    Math.min(1, (scrollOffset - REVEAL_START) / (REVEAL_END - REVEAL_START)),
  );

  const containerOpacity   = t;
  const containerTranslate = (1 - t) * 48; // lifts 48px into final position

  return (
    /*
     * Structural wrapper — pointer-events-none so scroll events pass
     * through to the WebGL canvas when the user isn't hovering a card.
     */
    <div
      className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none"
      style={{
        opacity:   containerOpacity,
        transform: `translateY(${containerTranslate}px)`,
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        // Ensure the whole layer is invisible and non-blocking at t === 0
        visibility: t === 0 ? 'hidden' : 'visible',
      }}
      aria-hidden={t === 0}
    >
      {/*
       * Inner content box — constrained width, centred, no pointer events
       * except on the cards themselves (handled at MissionCardItem level).
       */}
      <div className="w-full max-w-5xl px-6 pointer-events-none">

        {/* Section header */}
        <div className="mb-8 flex flex-col gap-1.5 pointer-events-none">
          <span className="font-mono text-[9px] tracking-[0.4em] text-slate-600 uppercase">
            Mission Control · Application Suite
          </span>
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-cyan-800/60" />
            <h2 className="font-mono text-xs tracking-[0.25em] text-slate-400 uppercase">
              NASA Eyes Platforms
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-900/40 to-transparent" />
          </div>
        </div>

        {/* 2×2 responsive grid — collapses to single column on small screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pointer-events-none">
          {MISSION_CARDS.map((card, i) => (
            <MissionCardItem key={card.id} card={card} index={i} t={t} />
          ))}
        </div>

        {/* Footer telemetry strip */}
        <div className="mt-6 flex items-center justify-between pointer-events-none opacity-40">
          <span className="font-mono text-[9px] tracking-widest text-slate-600">
            DATA SRC · NASA JPL · ESA · CNEOS · TESS · Kepler Archive
          </span>
          <span className="font-mono text-[9px] tracking-widest text-slate-600">
            AFX-GRID-4·REV-B
          </span>
        </div>
      </div>
    </div>
  );
}
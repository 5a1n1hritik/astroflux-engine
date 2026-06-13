'use client';

/**
 * LandingOverlay.tsx
 * Responsibility: Fullscreen HUD wrapper containing ONLY the brand identity token
 * (top-left) and the scroll-prompt cue (bottom-center). Fades out as scrollOffset
 * increases so the galaxy canvas has unobstructed viewport space.
 *
 * SRP: owns no business logic, no data fetching, no canvas — pure presentational HUD.
 * pointer-events-none on all structural wrappers; no interactive children here.
 */

import { useEffect, useState } from 'react';

interface LandingOverlayProps {
  /** 0 = top of page, 1 = bottom. Overlay fully gone at 0.4. */
  scrollOffset: number;
}

// ─── tiny sub-components ──────────────────────────────────────────────────────

/** Live UTC clock — updates every second, gives the HUD a real telemetry feel. */
function MissionClock(): React.ReactElement {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const fmt = (): string =>
      new Date()
        .toUTCString()
        .replace(/.*(\d{2}:\d{2}:\d{2}).*/, '$1');

    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="text-slate-500 font-mono text-[10px] tracking-widest tabular-nums">
      UTC {time}
    </span>
  );
}

/** Pulsing green status dot with "NOMINAL" label. */
function TelemetryDot(): React.ReactElement {
  return (
    <span className="flex items-center gap-1.5">
      {/* Outer pulse ring */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="font-mono text-[10px] tracking-[0.2em] text-emerald-500 uppercase">
        Nominal
      </span>
    </span>
  );
}

/** Looping chevron scroll cue. Two chevrons cascade with staggered opacity. */
function ScrollCue(): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <span className="font-mono text-[10px] tracking-[0.35em] text-slate-500 uppercase mb-2">
        Scroll to engage mission control
      </span>

      {/* Three chevrons with staggered fade-slide animation */}
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 12"
          fill="none"
          className="w-5 h-2.5"
          style={{
            animation: `chevronPulse 1.8s ease-in-out ${i * 0.28}s infinite`,
          }}
        >
          <polyline
            points="2,2 12,10 22,2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-500"
          />
        </svg>
      ))}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function LandingOverlay({
  scrollOffset,
}: LandingOverlayProps): React.ReactElement {
  // Fade starts at scroll 0, fully transparent by 0.38
  const opacity = Math.max(0, 1 - scrollOffset / 0.38);

  return (
    <>
      {/*
        Keyframe injected once at document level.
        Using a style tag so we don't need a separate CSS file.
      */}
      <style>{`
        @keyframes chevronPulse {
          0%   { opacity: 0.15; transform: translateY(-4px); }
          50%  { opacity: 0.7;  transform: translateY(2px);  }
          100% { opacity: 0.15; transform: translateY(-4px); }
        }
      `}</style>

      {/* ── Root overlay wrapper ─────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-10 flex flex-col justify-between p-8 pointer-events-none"
        style={{
          opacity,
          transition: 'opacity 0.15s linear',
          // Don't consume any events even during transition
          pointerEvents: opacity === 0 ? 'none' : 'none',
        }}
        aria-hidden="true"
      >

        {/* ── TOP ROW ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between w-full">

          {/* Brand token — top-left */}
          <div className="flex flex-col gap-1.5">
            {/* Primary wordmark */}
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-sm font-bold tracking-[0.22em] text-slate-100 uppercase">
                AstroFlux
              </span>
              <span className="font-mono text-sm text-slate-500 tracking-widest">
                //
              </span>
              <span className="font-mono text-sm font-bold tracking-[0.22em] text-slate-100 uppercase">
                Engine
              </span>
              <span
                className="font-mono text-[10px] tracking-widest text-cyan-500 border border-cyan-900 px-1.5 py-0.5 rounded-sm"
                style={{ letterSpacing: '0.18em' }}
              >
                v2.0
              </span>
            </div>

            {/* Sub-row: telemetry dot + live clock */}
            <div className="flex items-center gap-3 pl-0.5">
              <TelemetryDot />
              <span className="text-slate-700 font-mono text-[10px]">·</span>
              <MissionClock />
            </div>

            {/* Hairline rule — a quiet structural signal, not decoration */}
            <div className="mt-1 h-px w-48 bg-gradient-to-r from-cyan-900/60 via-slate-700/30 to-transparent" />
          </div>

          {/* Top-right: mission identifier (sparse, real-feeling) */}
          <div className="flex flex-col items-end gap-1 opacity-50">
            <span className="font-mono text-[9px] tracking-[0.3em] text-slate-500 uppercase">
              Mission ID
            </span>
            <span className="font-mono text-[11px] tracking-widest text-slate-400">
              AFX-2040-Δ
            </span>
          </div>
        </div>

        {/* ── BOTTOM CENTER ─────────────────────────────────────────────── */}
        <div className="flex justify-center pb-2">
          <ScrollCue />
        </div>
      </div>
    </>
  );
}
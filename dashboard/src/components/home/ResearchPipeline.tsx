'use client';

import { ArrowRight } from 'lucide-react';

const STEPS = [
  {
    id: '01',
    phase: 'SELECT',
    title: 'Choose Your System',
    description: 'Browse 2,847 confirmed exoplanets. Filter by distance, type, telescope coverage, and habitability index.',
    details: ['Catalog search', 'Advanced filters', 'Telescope availability', 'Priority queue'],
    color: 'rgba(34, 211, 238, 0.15)',
    dot: '#22d3ee',
  },
  {
    id: '02',
    phase: 'OBSERVE',
    title: 'Configure Telescope',
    description: 'Select from JWST, TESS, Kepler, or Hubble datasets. Set observation window and photometric band.',
    details: ['Multi-telescope support', 'Band selection', 'Time window config', 'Real FITS data'],
    color: 'rgba(139, 92, 246, 0.15)',
    dot: '#8b5cf6',
  },
  {
    id: '03',
    phase: 'SIMULATE',
    title: 'Run Transit Model',
    description: 'Rust WASM orbital engine computes transit timing, flux drop, and limb darkening in sub-millisecond ticks.',
    details: ['N-body simulation', 'Transit timing', 'Flux normalization', 'Limb darkening'],
    color: 'rgba(52, 211, 153, 0.15)',
    dot: '#34d399',
  },
  {
    id: '04',
    phase: 'ANALYZE',
    title: 'Inspect Flux Data',
    description: 'Interactive FluxChart with box zoom, log/linear toggle, and marker detection for transit events.',
    details: ['Box zoom + pan', 'Transit markers', 'Log/linear axis', 'Anomaly detection'],
    color: 'rgba(251, 191, 36, 0.15)',
    dot: '#fbbf24',
  },
  {
    id: '05',
    phase: 'EXPORT',
    title: 'Export Results',
    description: 'Download processed light curves, orbital parameters, and simulation logs in standard research formats.',
    details: ['CSV / FITS export', 'Orbital params', 'Simulation logs', 'Citation ready'],
    color: 'rgba(248, 113, 113, 0.15)',
    dot: '#f87171',
  },
];

export function ResearchPipeline() {
  return (
    <section
      className="relative w-full bg-void border-t border-white/5 overflow-hidden"
      style={{
        paddingTop: 'var(--section-pad-y)',
        paddingBottom: 'var(--section-pad-y)',
      }}
    >
      {/* Background — subtle radial */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 80% 50%, rgba(139,92,246,0.04) 0%, transparent 60%)',
        }}
      />

      {/* ── Header ── */}
      <div
        className="relative flex flex-col md:flex-row md:items-end justify-between gap-6 mb-20"
        style={{
          paddingLeft: 'var(--section-pad-x)',
          paddingRight: 'var(--section-pad-x)',
        }}
      >
        <div className="flex flex-col gap-2">
          <p className="font-mono text-white/25 text-[10px] tracking-[0.3em] uppercase">
            ASTROFLUX · WORKFLOW
          </p>
          <h2 className="font-sans font-bold text-white text-2xl md:text-3xl tracking-tight uppercase">
            Research Pipeline
          </h2>
        </div>

        <a
          href="/exoplanets"
          className="group inline-flex items-center gap-3 bg-white px-6 py-3 hover:bg-white/90 transition-colors duration-200 w-fit"
        >
          <span className="font-mono text-black text-[11px] tracking-[0.2em] uppercase font-bold">
            START RESEARCH
          </span>
          <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform duration-200" />
        </a>
      </div>

      {/* ── Timeline ── */}
      <div
        className="relative overflow-x-auto pb-4"
        style={{ scrollbarWidth: 'none' }}
      >
        <div
          className="relative flex gap-0"
          style={{
            paddingLeft: 'var(--section-pad-x)',
            paddingRight: 'var(--section-pad-x)',
            minWidth: 'max-content',
          }}
        >
          {/* Connecting line */}
          <div
            className="absolute top-[2.35rem] left-0 right-0 h-px pointer-events-none"
            style={{
              background: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.08) 10%, rgba(255,255,255,0.08) 90%, transparent 100%)',
              marginLeft: 'var(--section-pad-x)',
              marginRight: 'var(--section-pad-x)',
            }}
          />

          {STEPS.map((step, i) => (
            <div
              key={step.id}
              className="relative flex flex-col gap-5 pt-0 w-64 md:w-72 flex-shrink-0"
              style={{
                paddingRight: i < STEPS.length - 1 ? '2px' : '0',
              }}
            >
              {/* Dot + phase label row */}
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 relative z-10"
                  style={{
                    background: step.dot,
                    boxShadow: `0 0 12px ${step.dot}80`,
                  }}
                />
                <span className="font-mono text-white/30 text-[9px] tracking-[0.25em] uppercase">
                  PHASE {step.id} · {step.phase}
                </span>
              </div>

              {/* Card */}
              <div
                className="flex flex-col gap-4 p-5 mr-3"
                style={{
                  background: step.color,
                  border: `1px solid ${step.dot}30`,
                }}
              >
                <h3 className="font-sans font-bold text-white text-base uppercase tracking-tight leading-tight">
                  {step.title}
                </h3>

                <p className="font-sans text-white/45 text-xs leading-relaxed">
                  {step.description}
                </p>

                <div className="w-full h-px bg-white/5" />

                <div className="flex flex-col gap-1.5">
                  {step.details.map((d) => (
                    <div key={d} className="flex items-center gap-2">
                      <div
                        className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ background: `${step.dot}80` }}
                      />
                      <span className="font-mono text-white/30 text-[10px] tracking-wider">
                        {d}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile scroll hint */}
      <div
        className="relative mt-6 flex items-center gap-2 md:hidden"
        style={{ paddingLeft: 'var(--section-pad-x)' }}
      >
        <div className="w-8 h-px bg-white/10" />
        <span className="font-mono text-white/20 text-[9px] tracking-[0.2em] uppercase">
          SCROLL TO VIEW PIPELINE
        </span>
      </div>
    </section>
  );
}
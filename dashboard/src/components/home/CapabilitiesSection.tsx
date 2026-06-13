'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

const STATS = [
  { value: 2847, suffix: '',  label: 'EXOPLANETS CATALOGUED', decimals: 0 },
  { value: 0.3,  suffix: 'ms', label: 'SIMULATION TICK RATE',  decimals: 1 },
  { value: 99.7, suffix: '%',  label: 'ORBITAL ACCURACY',       decimals: 1 },
  { value: 4,    suffix: 'TB', label: 'TELESCOPE DATA INGESTED', decimals: 0 },
];

const MODULES = [
  {
    id: '01',
    name: 'RUST WASM',
    subtitle: 'Orbital Mechanics Engine',
    description: 'Sub-millisecond N-body simulation compiled to WebAssembly. Runs entirely in-browser with zero server latency.',
    specs: ['Kepler equation solver', 'Transit timing variation', 'Multi-body perturbation', 'WASM SIMD optimized'],
    color: 'rgba(34, 211, 238, 0.12)',
    borderColor: 'rgba(34, 211, 238, 0.20)',
  },
  {
    id: '02',
    name: 'THREE.JS WEBGL',
    subtitle: 'Real-time 3D Renderer',
    description: 'Custom GLSL shaders for stellar corona, atmospheric scattering, and photometric transit visualization.',
    specs: ['Custom star shaders', 'Atmospheric limb darkening', 'Transit shadow mapping', '60fps guaranteed'],
    color: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.20)',
  },
  {
    id: '03',
    name: 'PYTHON PIPELINE',
    subtitle: 'Data Processing Worker',
    description: 'Async worker pipeline ingesting TESS, Kepler, and JWST photometric data. Real-time flux normalization and detrending.',
    specs: ['TESS FITS ingestion', 'Savitzky-Golay filter', 'BLS periodogram', 'Async worker threads'],
    color: 'rgba(52, 211, 153, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.20)',
  },
  {
    id: '04',
    name: 'RECHARTS VIZ',
    subtitle: 'Scientific Data Layer',
    description: 'Composable chart system with log/linear axis toggle, box zoom, and dt-normalized lerp scrolling for frame-rate independence.',
    specs: ['FluxChart compositor', 'Box zoom + pan', 'Log/linear Y-axis', 'Viewport slicing'],
    color: 'rgba(251, 191, 36, 0.12)',
    borderColor: 'rgba(251, 191, 36, 0.20)',
  },
];

// Animated counter hook
function useCounter(target: number, decimals: number, active: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    const duration = 1800;
    const steps = 60;
    const step = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(timer); return; }
      setCount(parseFloat(current.toFixed(decimals)));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [active, target, decimals]);
  return count;
}

function StatCounter({ value, suffix, label, decimals, active }: typeof STATS[0] & { active: boolean }) {
  const count = useCounter(value, decimals, active);
  return (
    <div className="flex flex-col gap-1">
      <div className="font-mono font-bold text-white" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)' }}>
        {decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString()}
        <span className="text-white/40 text-lg ml-1">{suffix}</span>
      </div>
      <p className="font-mono text-white/30 text-[9px] tracking-[0.25em] uppercase">{label}</p>
    </div>
  );
}

export function CapabilitiesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [statsActive, setStatsActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Trigger counter when section enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsActive(true); },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-void border-t border-white/5 overflow-hidden"
      style={{ paddingTop: 'var(--section-pad-y)', paddingBottom: 'var(--section-pad-y)' }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />
      {/* Cyan glow — top left */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20%', left: '-10%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)',
        }}
      />

      {/* ── Section Header ── */}
      <div
        className="relative flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16"
        style={{ paddingLeft: 'var(--section-pad-x)', paddingRight: 'var(--section-pad-x)' }}
      >
        <div className="flex flex-col gap-2">
          <p className="font-mono text-white/25 text-[10px] tracking-[0.3em] uppercase">
            ASTROFLUX · ARCHITECTURE
          </p>
          <h2 className="font-sans font-bold text-white text-2xl md:text-3xl tracking-tight uppercase">
            Engine Capabilities
          </h2>
        </div>

        {/* How it works link */}
        <a
          href="/docs/architecture"
          className="group inline-flex items-center gap-2 border border-white/15 px-5 py-2.5 hover:border-white/40 transition-colors duration-300 w-fit"
        >
          <span className="font-mono text-white/50 text-[10px] tracking-[0.2em] uppercase group-hover:text-white/80 transition-colors">
            HOW IT WORKS
          </span>
          <ArrowRight className="w-3 h-3 text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-all duration-200" />
        </a>
      </div>

      {/* ── Stats Row ── */}
      <div
        className="relative grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 pb-16 border-b border-white/5"
        style={{ paddingLeft: 'var(--section-pad-x)', paddingRight: 'var(--section-pad-x)' }}
      >
        {STATS.map((stat) => (
          <StatCounter key={stat.label} {...stat} active={statsActive} />
        ))}
      </div>

      {/* ── Horizontal Module Track ── */}
      <div
        ref={scrollRef}
        className="relative flex gap-4 overflow-x-auto pb-4"
        style={{
          paddingLeft: 'var(--section-pad-x)',
          paddingRight: 'var(--section-pad-x)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {MODULES.map((mod) => (
          <div
            key={mod.id}
            className="flex-shrink-0 flex flex-col gap-5 p-6 w-72 md:w-80"
            style={{
              background: mod.color,
              border: `1px solid ${mod.borderColor}`,
            }}
          >
            {/* Module ID */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-white/20 text-[9px] tracking-[0.3em]">
                MODULE {mod.id}
              </span>
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: mod.borderColor.replace('0.20', '0.80') }}
              />
            </div>

            {/* Name */}
            <div className="flex flex-col gap-1">
              <h3 className="font-sans font-black text-white text-2xl tracking-tight uppercase leading-none">
                {mod.name}
              </h3>
              <p className="font-mono text-white/40 text-[10px] tracking-[0.15em] uppercase">
                {mod.subtitle}
              </p>
            </div>

            {/* Divider */}
            <div className="w-full h-px" style={{ background: mod.borderColor }} />

            {/* Description */}
            <p className="font-sans text-white/50 text-xs leading-relaxed">
              {mod.description}
            </p>

            {/* Specs list */}
            <div className="flex flex-col gap-2 mt-auto">
              {mod.specs.map((spec) => (
                <div key={spec} className="flex items-center gap-2">
                  <div
                    className="w-1 h-1 rounded-full flex-shrink-0"
                    style={{ background: mod.borderColor.replace('0.20', '0.60') }}
                  />
                  <span className="font-mono text-white/35 text-[10px] tracking-wider">
                    {spec}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Scroll hint */}
      <div
        className="relative mt-6 flex items-center gap-2"
        style={{ paddingLeft: 'var(--section-pad-x)' }}
      >
        <div className="w-8 h-px bg-white/10" />
        <span className="font-mono text-white/20 text-[9px] tracking-[0.2em] uppercase">
          SCROLL TO EXPLORE MODULES
        </span>
      </div>
    </section>
  );
}
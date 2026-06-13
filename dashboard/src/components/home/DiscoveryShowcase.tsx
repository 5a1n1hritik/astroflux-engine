'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Pause, Play } from 'lucide-react';

const DISCOVERIES = [
  {
    id: 'kepler-1649c',
    name: 'Kepler-1649c',
    tag: 'NEW DISCOVERY',
    subtitle: 'Most Earth-like exoplanet ever found',
    description:
      'Orbiting within its star\'s habitable zone, Kepler-1649c is 1.06 times Earth\'s size with similar estimated temperatures. Located 300 light-years away, it represents our closest analog to a second Earth discovered by the Kepler mission.',
    hasData: true,
    mediaType: 'image' as const,
    mediaSrc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Kepler452b-artwork.jpg/1280px-Kepler452b-artwork.jpg',
    distance: '300 ly',
    type: 'SUPER-EARTH',
  },
  {
    id: 'toi-700d',
    name: 'TOI 700d',
    tag: 'HABITABLE ZONE',
    subtitle: 'TESS mission\'s first Earth-size habitable-zone world',
    description:
      'TOI 700d is the first Earth-sized planet in the habitable zone discovered by NASA\'s TESS satellite. Its host star, TOI 700, is a small M-dwarf 101 light-years away, making this system a prime candidate for atmospheric characterization.',
    hasData: true,
    mediaType: 'image' as const,
    mediaSrc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/TRAPPIST-1_Artist_Impression.jpg/1280px-TRAPPIST-1_Artist_Impression.jpg',
    distance: '101 ly',
    type: 'EARTH-SIZED',
  },
  {
    id: 'gj-1132b',
    name: 'GJ 1132b',
    tag: 'ATMOSPHERIC DATA',
    subtitle: 'Secondary atmosphere detected on rocky world',
    description:
      'GJ 1132b may have developed a secondary atmosphere through volcanic activity — a first for a rocky exoplanet. Hubble Space Telescope observations suggest a thick atmosphere of hydrogen, methane, and hydrogen cyanide surrounds this 1.4 Earth-radius world.',
    hasData: false,
    mediaType: 'image' as const,
    mediaSrc: 'https://www.nasa.gov/wp-content/uploads/2023/01/webb-tarantula-neb.png?resize=2000,1561',
    distance: '41 ly',
    type: 'ROCKY',
  },
  {
    id: 'proxima-cen-b',
    name: 'Proxima Cen b',
    tag: 'PRIORITY TARGET',
    subtitle: 'Nearest known exoplanet to our solar system',
    description:
      'At just 4.2 light-years away, Proxima Centauri b is the closest confirmed exoplanet to Earth. It orbits within the habitable zone of Proxima Centauri and is a primary target for future direct imaging missions and potential interstellar probes.',
    hasData: true,
    mediaType: 'image' as const,
    mediaSrc: 'https://www.nasa.gov/wp-content/uploads/2026/04/art002e009288orig.jpg',
    distance: '4.2 ly',
    type: 'TERRESTRIAL',
  },
];

const TIMER_MS = 8000;

export function DiscoveryShowcase() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (index: number) => {
    setActive(index);
    setProgress(0);
  };

  const clearTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
  };

  useEffect(() => {
    if (paused) { clearTimers(); return; }

    // Progress tick — every 80ms = 100 steps in 8s
    progressRef.current = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + (80 / TIMER_MS) * 100));
    }, 80);

    // Advance slide
    intervalRef.current = setInterval(() => {
      setActive((a) => (a + 1) % DISCOVERIES.length);
      setProgress(0);
    }, TIMER_MS);

    return clearTimers;
  }, [active, paused]);

  const current = DISCOVERIES[active];

  // SVG ring math
  const R = 20;
  const CIRC = 2 * Math.PI * R;
  const dash = (progress / 100) * CIRC;

  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: '80vh' }}>

      {/* ── Background ── */}
      {/* Base image */}
      <div className="absolute inset-0 transition-opacity duration-1000">
        <img
          src={current.mediaSrc}
          alt={current.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Gradient overlay — bottom heavy for text */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(2,4,9,0.97) 0%, rgba(2,4,9,0.55) 45%, rgba(2,4,9,0.20) 100%)',
        }}
      />
      {/* Left edge fade */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to right, rgba(2,4,9,0.80) 0%, transparent 60%)',
        }}
      />

      {/* ── Main Content ── */}
      <div
        className="relative z-10 flex flex-col justify-end" // className="relative z-10 flex flex-col justify-between pt-32"
        style={{
          minHeight: '80vh',
          paddingLeft: 'var(--section-pad-x)',
          paddingRight: 'var(--section-pad-x)',
          paddingBottom: '0',
        }}
      >
        {/* Top content block */}
        <div className="flex flex-col gap-5 max-w-2xl pb-10">

          {/* Tag */}
          <span className="font-mono text-white/50 text-[10px] tracking-[0.3em] uppercase border border-white/15 px-3 py-1 w-fit">
            {current.tag}
          </span>

          {/* Heading */}
          <h2 className="font-sans font-black text-white uppercase leading-none tracking-tight"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
          >
            {current.name}
          </h2>

          {/* Subtitle */}
          <p className="font-mono text-white/60 text-sm tracking-wider uppercase">
            {current.subtitle}
          </p>

          {/* Description */}
          <p className="font-sans text-white/50 text-sm leading-relaxed max-w-xl">
            {current.description}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-white/25 text-[9px] tracking-[0.2em] uppercase">DISTANCE</span>
              <span className="font-mono text-white/60 text-xs tracking-wider">{current.distance}</span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-white/25 text-[9px] tracking-[0.2em] uppercase">CLASS</span>
              <span className="font-mono text-white/60 text-xs tracking-wider">{current.type}</span>
            </div>
          </div>

          {/* CTA — conditional */}
          {current.hasData && (
            <div className="pt-2">
              <button className="group inline-flex items-center gap-3 border border-white/30 px-6 py-3 hover:border-white hover:bg-white/5 transition-all duration-300">
                <span className="font-mono text-white text-xs tracking-widest uppercase">
                  VIEW RESEARCH DATA
                </span>
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>
          )}
        </div>

        {/* ── Bottom Strip ── */}
        <div className="border-t border-white/10">
          <div className="flex items-stretch">

            {/* Discovery tabs */}
            {DISCOVERIES.map((d, i) => (
              <button
                key={d.id}
                onClick={() => { goTo(i); setPaused(false); }}
                className={`
                  flex-1 flex flex-col gap-1 px-4 py-5 text-left
                  border-r border-white/5
                  transition-colors duration-200
                  ${i === active ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}
                `}
              >
                <span className="font-mono text-white/25 text-[8px] tracking-[0.2em] uppercase">
                  {d.tag}
                </span>
                <span className={`font-sans font-bold text-sm uppercase tracking-tight transition-colors duration-200 ${i === active ? 'text-white' : 'text-white/40'}`}>
                  {d.name}
                </span>
                <span className="font-mono text-white/25 text-[9px] tracking-wider">
                  {d.distance}
                </span>

                {/* Active indicator line */}
                {i === active && (
                  <div className="mt-2 w-full h-px bg-white/30" />
                )}
              </button>
            ))}

            {/* Progress ring + pause */}
            <div className="flex items-center justify-center px-6 border-l border-white/5">
              <div className="relative flex items-center justify-center">
                <svg width="48" height="48" className="-rotate-90">
                  {/* Track */}
                  <circle
                    cx="24" cy="24" r={R}
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1.5"
                  />
                  {/* Progress */}
                  <circle
                    cx="24" cy="24" r={R}
                    fill="none"
                    stroke="rgba(255,255,255,0.60)"
                    strokeWidth="1.5"
                    strokeDasharray={`${dash} ${CIRC}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.08s linear' }}
                  />
                </svg>
                {/* Pause/Play button */}
                <button
                  onClick={() => setPaused((p) => !p)}
                  className="absolute inset-0 flex items-center justify-center text-white/40 hover:text-white transition-colors duration-200"
                >
                  {paused
                    ? <Play className="w-3 h-3 fill-current" />
                    : <Pause className="w-3 h-3 fill-current" />
                  }
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
'use client';

const ACTIVE_OBSERVATIONS = [
  {
    id: 'OBS-2847',
    target: 'TRAPPIST-1e',
    system: 'TRAPPIST-1',
    type: 'TRANSIT EVENT',
    telescope: 'JWST · NIRCam',
    status: 'LIVE' as const,
    flux: '0.9987',
    distance: '39.5 ly',
    duration: '01:42:09',
  },
  {
    id: 'OBS-2901',
    target: 'Kepler-452b',
    system: 'Kepler-452',
    type: 'RADIAL VELOCITY',
    telescope: 'Keck · HIRES',
    status: 'SCHEDULED' as const,
    flux: '—',
    distance: '1,402 ly',
    duration: '03:15:00',
  },
  {
    id: 'OBS-2923',
    target: 'HD 209458b',
    system: 'HD 209458',
    type: 'ATMOSPHERIC SPEC',
    telescope: 'HST · STIS',
    status: 'PROCESSING' as const,
    flux: '0.9941',
    distance: '159 ly',
    duration: '00:28:44',
  },
];

const STATUS_STYLE = {
  LIVE:       { dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-400', border: 'border-emerald-400/20' },
  SCHEDULED:  { dot: 'bg-white/20',                  text: 'text-white/30',    border: 'border-white/5'         },
  PROCESSING: { dot: 'bg-amber-400',                  text: 'text-amber-400',   border: 'border-amber-400/20'    },
};

export function LiveMissionStatus() {
  return (
    <section
      className="relative w-full bg-void border-t border-white/5 py-24 overflow-hidden"
      style={{ paddingLeft: 'clamp(24px, 10%, 160px)', paddingRight: 'clamp(24px, 10%, 160px)' }}
    >
      {/* Background — subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Background — radial fade so grid doesn't hit edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, #020409 80%)',
        }}
      />

      {/* Section Header */}
      <div className="relative flex items-end justify-between mb-16">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-white/25 text-[10px] tracking-[0.3em] uppercase">
            ASTROFLUX · LIVE FEED
          </p>
          <h2 className="font-sans font-bold text-white text-2xl md:text-3xl tracking-tight uppercase">
            Active Observations
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-emerald-400 text-[10px] tracking-[0.2em] uppercase">
            3 streams active
          </span>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
        {ACTIVE_OBSERVATIONS.map((obs) => {
          const s = STATUS_STYLE[obs.status];
          return (
            <div
              key={obs.id}
              className={`
                group relative flex flex-col gap-5 p-6
                border ${s.border}
                bg-white/[0.08] hover:bg-white/[0.06]
                backdrop-blur-sm
                transition-all duration-300 cursor-pointer
              `}
            >
              {/* Card Top — ID + Status */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-white/50 text-[9px] tracking-[0.25em]">
                  {obs.id}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  <span className={`font-mono text-[9px] tracking-[0.2em] ${s.text}`}>
                    {obs.status}
                  </span>
                </div>
              </div>

              {/* Target Name */}
              <div>
                <p className="font-sans font-bold text-white text-xl tracking-tight uppercase leading-none">
                  {obs.target}
                </p>
                <p className="font-mono text-white/30 text-[10px] tracking-wider mt-1">
                  {obs.system}
                </p>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-white/5" />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'TYPE',       value: obs.type      },
                  { label: 'TELESCOPE',  value: obs.telescope },
                  { label: 'FLUX Δ',     value: obs.flux      },
                  { label: 'DISTANCE',   value: obs.distance  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <p className="font-mono text-white/20 text-[8px] tracking-[0.2em] uppercase">
                      {label}
                    </p>
                    <p className="font-mono text-white/60 text-[11px] tracking-wide">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Duration — bottom */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                <span className="font-mono text-white/20 text-[9px] tracking-[0.15em] uppercase">
                  ELAPSED
                </span>
                <span className="font-mono text-white/40 text-[11px] tracking-widest">
                  {obs.duration}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="relative mt-10 flex justify-end">
        <p className="font-mono text-white/20 text-[10px] tracking-[0.2em] uppercase hover:text-white/40 cursor-pointer transition-colors">
          VIEW ALL OBSERVATIONS →
        </p>
      </div>
    </section>
  );
}
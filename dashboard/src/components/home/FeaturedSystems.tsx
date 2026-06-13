'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const SYSTEMS = [
  {
    id: 'trappist-1',
    name: 'TRAPPIST-1',
    subtitle: '7 Earth-sized planets',
    tag: 'HABITABLE ZONE',
    distance: '39.5 ly',
    planets: 7,
    imageSrc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/TRAPPIST-1_Artist_Impression.jpg/1280px-TRAPPIST-1_Artist_Impression.jpg',
    href: '/exoplanets/trappist-1',
  },
  {
    id: 'kepler-452',
    name: 'KEPLER-452b',
    subtitle: "Earth's older cousin",
    tag: 'CONFIRMED',
    distance: '1,402 ly',
    planets: 1,
    imageSrc: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Kepler452b-artwork.jpg/1280px-Kepler452b-artwork.jpg',
    href: '/exoplanets/kepler-452b',
  },
  {
    id: 'hd-209458',
    name: 'HD 209458b',
    subtitle: 'Hot Jupiter archetype',
    tag: 'ATMOSPHERIC DATA',
    distance: '159 ly',
    planets: 1,
    imageSrc: 'https://www.nasa.gov/wp-content/uploads/2023/01/webb-tarantula-neb.png?resize=2000,1561',
    href: '/exoplanets/hd-209458b',
  },
  {
    id: 'proxima-cen',
    name: 'PROXIMA CEN b',
    subtitle: 'Nearest known exoplanet',
    tag: 'PRIORITY TARGET',
    distance: '4.2 ly',
    planets: 1,
    imageSrc: 'https://www.nasa.gov/wp-content/uploads/2026/04/art002e009288orig.jpg',
    href: '/exoplanets/proxima-centauri-b',
  },
];

export function FeaturedSystems() {
  return (
    <section
      className="relative w-full bg-void border-t border-white/5 py-24 overflow-hidden"
      style={{
        paddingLeft: 'var(--section-pad-x)',
        paddingRight: 'var(--section-pad-x)',
        paddingTop: 'var(--section-pad-y)',
        paddingBottom: 'var(--section-pad-y)',
      }}
    >
      {/* Section Header */}
      <div className="flex items-end justify-between mb-12">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-white/25 text-[10px] tracking-[0.3em] uppercase">
            ASTROFLUX · CATALOG
          </p>
          <h2 className="font-sans font-bold text-white text-2xl md:text-3xl tracking-tight uppercase">
            Featured Systems
          </h2>
        </div>
        <p className="hidden md:block font-mono text-white/25 text-[10px] tracking-[0.2em] uppercase hover:text-white/50 cursor-pointer transition-colors">
          FULL CATALOG →
        </p>
      </div>

      {/* Cards Grid — NASA style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SYSTEMS.map((sys) => (
          <Link
            key={sys.id}
            href={sys.href}
            className="group relative overflow-hidden aspect-[3/4] block"
            style={{ border: '1px solid var(--card-border)' }}
          >
            {/* Background Image */}
            <Image
              src={sys.imageSrc}
              alt={sys.name}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />

            {/* Gradient Overlay */}
            <div
              className="absolute inset-0"
              style={{ background: 'var(--card-overlay)' }}
            />

            {/* Top Tag */}
            <div className="absolute top-4 left-4">
              <span className="font-mono text-white/60 text-[9px] tracking-[0.2em] uppercase border border-white/15 px-2 py-1">
                {sys.tag}
              </span>
            </div>

            {/* Bottom Content */}
            <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col gap-1">
              <p className="font-mono text-white/40 text-[9px] tracking-[0.2em] uppercase">
                {sys.distance} · {sys.planets}P
              </p>
              <h3 className="font-sans font-bold text-white text-xl tracking-tight uppercase leading-none">
                {sys.name}
              </h3>
              <p className="font-mono text-white/50 text-[10px] tracking-wider">
                {sys.subtitle}
              </p>

              {/* Arrow — visible on hover */}
              <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="font-mono text-white text-[10px] tracking-widest uppercase">
                  EXPLORE
                </span>
                <ArrowRight className="w-3 h-3 text-white group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            </div>

            {/* Hover border glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ border: '1px solid var(--card-border-hover)' }}
            />
          </Link>
        ))}
      </div>

      {/* Mobile — full catalog link */}
      <div className="mt-8 flex justify-end md:hidden">
        <p className="font-mono text-white/25 text-[10px] tracking-[0.2em] uppercase">
          FULL CATALOG →
        </p>
      </div>
    </section>
  );
}
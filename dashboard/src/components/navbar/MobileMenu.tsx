"use client";

import Link from "next/link";
import { X } from "lucide-react";

const navLinks = [
  { label: "EXOPLANETS", href: "/exoplanets" },
  { label: "STAR SYSTEMS", href: "/star-systems" },
  { label: "TELESCOPES", href: "/telescopes" },
  { label: "RESEARCH", href: "/research" },
  { label: "DOCS", href: "/docs" },
  { label: "ABOUT", href: "/about" },
];

// const upcomingLaunches = [
//   {
//     id: 1,
//     name: "Starlink Mission",
//     date: "May 22, 2026",
//     time: "10:30 UTC",
//     image: "https://www.nasa.gov/wp-content/uploads/2023/01/webb-tarantula-neb.png?resize=2000,1561",
//   },
//   {
//     id: 2,
//     name: "Starlink Mission",
//     date: "May 25, 2026",
//     time: "12:03 UTC",
//     image: "https://www.nasa.gov/wp-content/uploads/2023/01/webb-tarantula-neb.png?resize=2000,1561",
//   },
// ];

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Menu */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-full max-w-sm bg-black z-50 lg:hidden transition-all duration-300 ease-out transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex flex-col gap-0.5">
              <span className="text-white font-bold text-sm tracking-[0.2em] uppercase">
                ASTROFLUX
              </span>
              <span className="font-mono text-white/30 text-[9px] tracking-[0.2em] uppercase">
                TRANSIT OBSERVATORY
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:opacity-75 transition-opacity"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 px-6 py-8">
            <nav className="space-y-6">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block text-white text-sm font-light tracking-wide hover:opacity-75 transition-opacity"
                  onClick={onClose}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            
            {/* Divider */}
            <div className="border-t border-white/10 my-8" />
            
            <div className="space-y-3">
              <h3 className="text-white/30 text-[9px] font-mono tracking-[0.25em] uppercase">
                ACTIVE MISSIONS
              </h3>
              <p className="text-white/20 text-[10px] font-mono tracking-wider">
                TRAPPIST-1 · 7 PLANETS
              </p>
              <p className="text-white/20 text-[10px] font-mono tracking-wider">
                KEPLER-452b · HABITABLE ZONE
              </p>
              <p className="text-white/20 text-[10px] font-mono tracking-wider">
                HD 209458b · HOT JUPITER
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// "use client";

// import { useState } from "react";

// const NAV_LINKS = [
//   "SOLAR SYSTEM",
//   "ASTEROIDS",
//   "EARTH",
//   "EXOPLANETS",
// ] as const;

// export default function Navbar() {
//   const [menuOpen, setMenuOpen] = useState(false);

//   return (
//     // FIX: Container forced to be pointer-events-none so Three.js camera interactions pass through black empty zones perfectly
//     <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-12 py-[26px] bg-transparent pointer-events-none select-none">

//       {/* Brand Token - Transformed to sleek sans-serif tracking weights */}
//       <div className="pointer-events-auto cursor-pointer font-sans text-xs tracking-[0.25em] font-bold text-white uppercase">
//         VEIL<span className="font-light text-slate-500 font-mono text-[10px] ml-1.5">//&nbsp;01</span>
//       </div>

//       {/* Navigation Array: SpaceX Font-Sans Integration Matrix */}
//       <nav className="hidden md:flex items-center gap-9 pointer-events-auto">
//         {NAV_LINKS.map((link) => (
//           <NavLink key={link} label={link} />
//         ))}
//       </nav>

//       {/* Hamburger Icon Trigger */}
//       <button
//         aria-label="Open menu"
//         onClick={() => setMenuOpen((prev) => !prev)}
//         className="flex flex-col justify-center items-end gap-[5px] w-6 h-6 cursor-pointer pointer-events-auto group focus:outline-none"
//       >
//         <span
//           className={`block h-[1px] bg-white transition-all duration-300 ease-in-out ${
//             menuOpen ? "w-6 rotate-45 translate-y-[6px]" : "w-5 group-hover:w-6"
//           }`}
//         />
//         <span
//           className={`block h-[1px] bg-white transition-all duration-300 ease-in-out ${
//             menuOpen ? "w-0 opacity-0" : "w-6"
//           }`}
//         />
//         <span
//           className={`block h-[1px] bg-white transition-all duration-300 ease-in-out ${
//             menuOpen ? "w-6 -rotate-45 -translate-y-[6px]" : "w-4 group-hover:w-6"
//           }`}
//         />
//       </button>

//       {/* Mobile Drawer Overlay Layer */}
//       {menuOpen && (
//         <div className="fixed inset-0 top-0 bg-black/95 backdrop-blur-md z-40 flex flex-col items-start justify-center px-12 gap-8 md:hidden pointer-events-auto">
//           {NAV_LINKS.map((link) => (
//             <a
//               key={link}
//               href="#"
//               onClick={() => setMenuOpen(false)}
//               className="font-sans text-sm tracking-[0.2em] uppercase text-white font-medium opacity-70 hover:opacity-100 transition-opacity duration-150"
//             >
//               {link}
//             </a>
//           ))}
//         </div>
//       )}
//     </header>
//   );
// }

// /* ── Refactored SpaceX Custom Underline-scale NavLink ── */
// function NavLink({ label }: { label: string }) {
//   return (
//     <a
//       href="#"
//       // FIX: font-sans, custom tracking-[0.18em], font-medium, and explicit bottom spacing padding container bounds
//       className="relative font-sans text-[13px] tracking-[0.18em] font-medium uppercase text-white pb-[6px] group transition-colors duration-200"
//     >
//       {label}
//       <span
//         className="
//           absolute left-0 bottom-0
//           h-[1px] w-full bg-white
//           origin-left
//           scale-x-0
//           group-hover:scale-x-100
//           transition-transform duration-300 ease-out
//         "
//       />
//     </a>
//   );
// }

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { MobileMenu } from "./navbar/MobileMenu";
import TelemetryClock from "./navbar/TelemetryClock";

const navLinks = [
  { label: "EXOPLANETS", href: "/exoplanets" },
  { label: "STAR SYSTEMS", href: "/star-systems" },
  { label: "TELESCOPES", href: "/telescopes" },
  { label: "RESEARCH", href: "/research" },
  { label: "DOCS", href: "/docs" },
  { label: "ABOUT", href: "/about" },
];

// Is individual component ko Navbar ke standard tree se upar declare kar sakte hain
function AnimatedDigit({ char }: { char: string }) {
  const [displayChar, setDisplayChar] = useState(char);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (char !== displayChar) {
      setAnimate(true);
      setDisplayChar(char);
      const timer = setTimeout(() => setAnimate(false), 250);
      return () => clearTimeout(timer);
    }
  }, [char, displayChar]);

  return (
    <span
      className={`inline-block min-w-[10px] text-center font-mono transition-transform ${
        animate ? "animate-num-change text-cyan-bright" : ""
      }`}
    >
      {displayChar}
    </span>
  );
}

export default function Navbar() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [timeString, setTimeString] = useState("00:00:00");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const scrollDifference = currentScrollY - lastScrollY;

          // Show navbar when scrolling up, hide when scrolling down
          if (scrollDifference < -10) {
            setIsVisible(true);
          } else if (scrollDifference > 10 && currentScrollY > 100) {
            setIsVisible(false);
          }

          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setTimeString(`${hours}:${minutes}:${seconds}`);
    };

    updateClock(); // Initial run
    const intervalId = setInterval(updateClock, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 bg-transparent transition-all duration-500 ease-out h-[3rem] ${
          isVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0"
        }`}
      >
        <div className="mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <div className="flex flex-col gap-0.5">
              <div className="text-white font-bold text-sm tracking-[0.2em] uppercase leading-none">
                ASTROFLUX
              </div>
              <div
                className="font-mono text-white/45 text-[9px] tracking-[0.15em] leading-none"
                style={{ fontVariant: "normal" }}
              >
                RA 05h 34m · DEC +22° 01′
              </div>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <div className="hidden lg:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="relative text-white/70 text-xs font-light tracking-widest uppercase hover:text-white transition-colors duration-200 after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-px after:bg-white after:transition-all after:duration-300 hover:after:w-full"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side - Telemetry Clock & Mobile Menu */}
          <div className="ml-auto flex items-center gap-4 md:gap-6">
            {/* Telemetry Clock - Hidden on small mobile */}
            <div className="hidden sm:block border border-white/20 hover:border-white/40 transition-colors duration-300">
              <TelemetryClock />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-white hover:opacity-75 transition-opacity p-2"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>
      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}

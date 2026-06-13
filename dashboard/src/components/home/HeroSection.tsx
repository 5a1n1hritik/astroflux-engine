// "use client";

// export default function HeroSection() {
//   return (
//     /*
//       Full-screen viewport panel.
//       Position context for the bottom-left content anchor.
//       Background is intentionally transparent — the cinematic void
//       is rendered by a global fixed canvas or body background.
//     */
//     <section className="relative w-full h-screen overflow-hidden">

//       {/* ── Ambient vignette — edges deepen toward pure black ── */}
//       <div
//         className="absolute inset-0 pointer-events-none z-10"
//         style={{
//           background:
//             "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.72) 100%)",
//         }}
//       />

//       {/* ── Bottom-left content anchor: 80px from bottom, 48px from left ── */}
//       <div
//         className="absolute z-20"
//         style={{ bottom: "80px", left: "48px" }}
//       >
//         {/* Eyebrow label */}
//         <p className="font-mono text-[10px] tracking-widest uppercase text-slate-500 mb-4">
//           DATASTELLAR // VEIL-01 &nbsp;·&nbsp; DEEP SPACE PLATFORM
//         </p>

//         {/* Primary headline */}
//         <h1
//           className="
//             font-sans font-black uppercase tracking-wider text-white
//             text-4xl sm:text-5xl md:text-[3.5rem] lg:text-[4rem]
//             leading-[1.05]
//             max-w-[700px]
//             mb-5
//           "
//         >
//           EXPLORE THE<br />
//           EXOPLANETARY<br />
//           VOID
//         </h1>

//         {/* Sub-descriptor */}
//         <p
//           className="
//             font-mono text-[11px] tracking-widest uppercase
//             text-slate-400
//             max-w-[380px]
//             leading-relaxed
//             mb-8
//           "
//         >
//           Real-time mathematical telemetry synced with active deep space
//           telescope arrays.
//         </p>

//         {/* SpaceX-signature CTA button */}
//         <CTAButton />
//       </div>

//       {/* ── Subtle bottom-left corner rule ── */}
//       <div
//         className="absolute z-20 pointer-events-none"
//         style={{ bottom: "76px", left: "48px", width: "32px", height: "1px" }}
//       >
//         {/* intentionally empty — structural spacer for rhythm */}
//       </div>
//     </section>
//   );
// }

// /* ──────────────────────────────────────────────
//    SpaceX-signature transparent border button.
//    Hover: instant fill to #ffffff, text to #000000.
//    CSS transition is kept ultra-short (150ms) for
//    the "snap" feel rather than a soft fade.
// ────────────────────────────────────────────── */
// function CTAButton() {
//   return (
//     <a
//       href="#"
//       className="
//         group
//         inline-block
//         font-mono text-[11px] tracking-widest uppercase
//         text-white
//         border border-white
//         py-3 px-8
//         cursor-pointer
//         select-none
//         transition-colors duration-150 ease-in-out
//         hover:bg-white hover:text-black
//       "
//     >
//       <span className="flex items-center gap-3">
//         INITIALIZE MISSION
//         {/* Right-arrow glyph — shifts right on hover */}
//         <span
//           className="
//             inline-block
//             transition-transform duration-150 ease-in-out
//             group-hover:translate-x-1
//           "
//           aria-hidden
//         >
//           →
//         </span>
//       </span>
//     </a>
//   );
// }

"use client";

import { ArrowRight } from "lucide-react";
import { MediaBackground } from "./MediaBackground";
import ClientDate from "./ClientDate";

interface HeroSectionProps {
  videoUrl?: string;
  imageSrc?: string;
  imageAlt?: string;
  date?: string;
  title: string;
  titleHighlight?: string;
  buttonText?: string;
}

export default function HeroSection({
  videoUrl,
  // imageSrc = 'https://image.lexica.art/full_webp/28ba1e33-39b2-442d-b142-bdd5575808a8',
  imageSrc = "https://www.nasa.gov/wp-content/uploads/2023/01/webb-tarantula-neb.png?resize=2000,1561",
  imageAlt = "Hero background",
  date = "MAY 22, 2026",
  title = "Explore the Universe from your Inbox",
  titleHighlight,
  buttonText = "Watch",
}: HeroSectionProps) {
  return (
    <>
      <MediaBackground
        videoUrl={videoUrl}
        imageSrc={imageSrc}
        imageAlt={imageAlt}
      >
        {/* Cockpit HUD Layout */}
        <div
          className="h-full flex flex-col justify-end pb-20 md:pb-24 lg:pb-32"
          style={{
            paddingLeft: "clamp(24px, 10%, 160px)",
            paddingRight: "clamp(24px, 5%, 80px)",
          }}
        >
          <div className="flex flex-col gap-6">
            {/* Live Date — dynamic, not static */}
            <ClientDate />

            {/* Primary Heading */}
            <h1 className="text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.0] tracking-tight uppercase">
              {title}
            </h1>

            {/* Scientific Descriptor — the real identity line */}
            <div className="flex flex-col gap-1">
              <p className="font-mono text-white/40 text-[10px] tracking-[0.18em] uppercase leading-relaxed">
                High-fidelity exoplanetary transit simulation
                <span className="text-white/15 mx-2">·</span>
                Rust WASM orbital mechanics
              </p>
              <p className="font-mono text-white/25 text-[10px] tracking-[0.18em] uppercase leading-relaxed">
                Three.js WebGL rendering
                <span className="text-white/15 mx-2">·</span>
                Real-time photometric analysis
                <span className="text-white/15 mx-2">·</span>
                Python worker pipeline
              </p>
            </div>

            {/* CTA Button — clear action */}
            <div className="pt-2">
              <button className="group inline-flex items-center gap-3 border border-white/40 px-8 py-4 hover:border-white hover:bg-white/5 transition-all duration-300">
                <span className="text-white text-xs font-light tracking-widest uppercase">
                  LAUNCH SIMULATOR
                </span>
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>
          </div>
        </div>
      </MediaBackground>
    </>
  );
}

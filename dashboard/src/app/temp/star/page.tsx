"use client";

import { useState } from "react";
import StarGlViewport from "@/components/temp/star/StarGlViewport";
import PlanetGlViewport from "@/components/universe/graphics/planets/PlanetGlViewport";

// Is baseline registry configuration map ko page.tsx me overwrite kar lijiye
const STELLAR_CATALOG = {
  "M-Dwarf (Proxima Centauri analog)": {
    preset: {
      core: "#ff5522",
      limb: "#cc1100",
      corona: "#ff3333",
      temperature: 3000,
    },
    radius: 0.65,
    temp: "3100 K",
    description:
      "Cool convective profile. Cellular granulation cells compressed under high magnetic fields.",
  },
  "G-Type (Solar Standard baseline)": {
    preset: {
      core: "#fffef0",
      limb: "#ffd060",
      corona: "#ffb830",
      temperature: 5778,
    },
    radius: 1.0,
    temp: "5778 K",
    description:
      "Standard organic yellow-white photosphere. Dynamic boiling granulation lanes fully volatile.",
  },
  "O-Type Blue Giant (Hyper-Massive node)": {
    preset: {
      core: "#e8f4ff",
      limb: "#80c0ff",
      corona: "#0066ff",
      temperature: 12000,
    },
    radius: 2.1,
    temp: "12000 K",
    description:
      "Blinding ultraviolet ionization energy field. Violent nested domain warping velocity bounds.",
  },
};

const PLANET_CATALOG = [
  {
    target_name: "Kepler-10b Analog (Lava World)",
    data: {
      temperature: 550,
      radius: 1.4,
      planetmass: 1.4,
      color: "#111",
      atmoColor: "#ff4400",
    },
  },
  {
    target_name: "Kepler-7b Analog (Gas Giant)",
    data: {
      temperature: 280,
      radius: 4.2,
      planetmass: 4.2,
      color: "#d2b48c",
      atmoColor: "#3a8cf5",
    },
  },
  {
    target_name: "Glacial Ice World",
    data: {
      temperature: 120,
      radius: 0.8,
      planetmass: 0.8,
      color: "#93c5fd",
      atmoColor: "#a78bfa",
    },
  },
];

// ✅ INJECT THIS HASHING FUNCTION AT THE TOP LEVEL OF YOUR APP LAYER
function generatePlanetSeed(name: string): number {
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 33) ^ name.charCodeAt(i);
  }
  // Standardize integer into a clean floating-point offset interval [0.0, 1000.0]
  return Math.abs(hash % 10000) / 10.0;
}

export default function Home() {
  const [selectedKey, setSelectedKey] = useState<keyof typeof STELLAR_CATALOG>(
    "G-Type (Solar Standard baseline)",
  );

  const [pselectedKey, psetSelectedKey] = useState<number>(0);

  const currentStar = STELLAR_CATALOG[selectedKey];
  const currentPlanet = PLANET_CATALOG[pselectedKey];

  const currentSeed = generatePlanetSeed(currentPlanet.target_name);

  return (
    <main className="min-h-screen bg-[#020409] text-white font-mono p-8 flex flex-col gap-6">
      {/* HUD Header Marking */}
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-cyan-400 font-bold text-sm tracking-[0.25em]">
          ASTROFLUX // VIEWPORT_SANDBOX
        </h1>
        <p className="text-[9px] text-zinc-500 uppercase mt-1">
          Pillar 1 Operational Verification Unit — Pure Static Hydration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Dynamic WebGL Canvas Viewport Graphics */}
        <div className="lg:col-span-2 aspect-video bg-black rounded-2xl relative">
          {/* <StarGlViewport
            preset={currentStar.preset}
            starRadius={currentStar.radius}
          /> */}
          <PlanetGlViewport
            atmoColor={currentPlanet.data.atmoColor}
            temperature={currentPlanet.data.temperature}
            color={currentPlanet.data.color}
            radius={currentPlanet.data.radius}
            planetMass={currentPlanet.data.planetmass}
            planetSeed={currentSeed}
          />
          <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded border border-white/10 text-[9px]">
            <span className="text-cyan-400">SPECTRUM CORE STATUS:</span> ONLINE
            // TEMP: {currentStar.temp}
          </div>
        </div>

        {/* Right Side: Navigation ConsoleHUD Parameter Matrix */}
        <div className="border border-white/10 p-6 bg-zinc-950/50 rounded-2xl flex flex-col gap-4">
          <span className="text-[10px] uppercase text-zinc-500 tracking-widest">
            Select Star Classification
          </span>

          {/* <div className="flex flex-col gap-2">
            {Object.keys(STELLAR_CATALOG).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedKey(key as any)}
                className={`text-left text-xs px-4 py-3 rounded border transition-all duration-200 ${
                  selectedKey === key
                    ? "border-cyan-400 bg-cyan-950/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                    : "border-white/5 bg-white/[0.02] text-zinc-400 hover:border-white/20"
                }`}
              >
                🎮 {key}
              </button>
            ))}
          </div> */}

          <div className="flex flex-col gap-2">
            {PLANET_CATALOG.map((planet, index) => (
              <button
                key={planet.target_name}
                onClick={() => psetSelectedKey(index)} // ✅ Bind to index number
                className={`text-left text-xs px-4 py-3 rounded border transition-all duration-200 ${
                  pselectedKey === index
                    ? "border-cyan-400 bg-cyan-950/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                    : "border-white/5 bg-white/[0.02] text-zinc-400 hover:border-white/20"
                }`}
              >
                🎮 {planet.target_name}
              </button>
            ))}
          </div>

          {/* HUD Parameter Diagnostics Display Logs */}
          <div className="border-t border-white/5 pt-4 mt-2 space-y-2 text-[10px] text-zinc-400">
            <span className="text-[9px] text-zinc-600 uppercase">
              GPU Uniform Data Maps:
            </span>
            <p>
              <span className="text-white">Radius Scale Ratio:</span>{" "}
              {currentStar.radius} R_sun
            </p>
            <p>
              <span className="text-white">Classification Vector:</span>{" "}
              {currentStar.temp}
            </p>
            <p className="text-zinc-500 leading-relaxed bg-black/40 p-2.5 border border-white/5 rounded mt-2">
              {currentStar.description}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

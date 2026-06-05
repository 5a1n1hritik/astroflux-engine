"use client";

import { useEffect, useRef, useState } from "react";

interface OrbitSimulatorProps {
  targetMetadata: {
    star_mass_solar: number;
    star_radius_solar: number;
    orbital_period_days: number;
    semi_major_axis_au: number;
    eccentricity: number;
  };
  currentFrameTime: number;
  onFrameUpdate: (phaseAngle: number) => void;
}

export default function OrbitSimulator({ targetMetadata, currentFrameTime, onFrameUpdate }: OrbitSimulatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wasmEngine, setWasmEngine] = useState<any>(null);

  // 1. DYNAMIC WASM MODULE ASYNC LOADING BOUNDARY WITH EXPLICIT INITIALIZATION
  useEffect(() => {
    // Dynamic import to comply with Next.js client-side module hydration bounds
    import("@/core-simulator-wasm").then(async (module) => {
      try {
        // --- FIXED LAYER: Triggering explicit WASM instance initialization ---
        // Kyunki humne --target web use kiya hai, hume core initialization method await karna hoga
        await module.default(); 
        // --- FIXED LAYER END ---

        setWasmEngine(module);
        
        // Verification Handshake execution check inside browser logs
        const handshakePayload = {
          star_mass_solar: targetMetadata.star_mass_solar,
          star_radius_solar: targetMetadata.star_radius_solar,
          orbital_period_days: targetMetadata.orbital_period_days,
          semi_major_axis_au: targetMetadata.semi_major_axis_au,
          eccentricity: targetMetadata.eccentricity,
        };
        
        const confirmMsg = module.astroflux_handshake(handshakePayload);
        console.log(`[WASM Core Handshake]: ${confirmMsg}`);
      } catch (initErr) {
        console.error("Error during WASM Engine Binary Instance Initialization:", initErr);
      }
    }).catch(err => console.error("Failed to load Rust WASM Engine Wrapper:", err));
  }, [targetMetadata]);

  // 2. THE 60 FPS CANVAS RENDERING LOOP MATRIX
  useEffect(() => {
    // Safety guard add kiya taaki jab tak engine fully initialized na ho, tab tak loop access na kare
    if (!wasmEngine || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Config contracts configuration
    const configPayload = {
      star_mass_solar: targetMetadata.star_mass_solar,
      star_radius_solar: targetMetadata.star_radius_solar,
      orbital_period_days: targetMetadata.orbital_period_days,
      semi_major_axis_au: targetMetadata.semi_major_axis_au,
      eccentricity: targetMetadata.eccentricity,
    };

    // Calculate next coordinate positions using the compiled Rust optimization engine
    try {
      const frameState = wasmEngine.compute_orbital_frame(configPayload, currentFrameTime);
      
      if (frameState) {
        // Clear canvas context frame viewport bounds
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Scaling astronomical units into pixel metrics context (1 AU = 150px layout scale)
        const scaleFactor = 150;
        
        const planetX = centerX + frameState.position_x * scaleFactor;
        const planetY = centerY + frameState.position_y * scaleFactor;

        // Draw Elliptical Orbit Track Guidelines
        ctx.beginPath();
        ctx.ellipse(
          centerX - targetMetadata.eccentricity * targetMetadata.semi_major_axis_au * scaleFactor,
          centerY,
          targetMetadata.semi_major_axis_au * scaleFactor,
          targetMetadata.semi_major_axis_au * Math.sqrt(1 - targetMetadata.eccentricity ** 2) * scaleFactor,
          0, 0, 2 * Math.PI
        );
        ctx.strokeStyle = "rgba(0, 168, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Render Center Host Star (Solar Radius Metrics Dynamic Mapping)
        ctx.beginPath();
        ctx.arc(centerX, centerY, Math.max(10, targetMetadata.star_radius_solar * 15), 0, 2 * Math.PI);
        ctx.fillStyle = "#ffdf00";
        ctx.shadowBlur = 30;
        ctx.shadowColor = "#ffdf00";
        ctx.fill();
        ctx.shadowBlur = 0; // Reset glow boundaries for subsequent renders

        // Render Exoplanet Body Target Tracker Location
        ctx.beginPath();
        ctx.arc(planetX, planetY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = "#00a8ff";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00a8ff";
        ctx.fill();
        ctx.shadowBlur = 0;

        // Callback trigger to synchronize temporal phase drop metrics on the parallel graph tracking
        onFrameUpdate(frameState.current_phase_angle);
      }
    } catch (error) {
      console.error("WASM Physics Calculation Engine Crash Loop:", error);
    }

  }, [wasmEngine, currentFrameTime, targetMetadata, onFrameUpdate]);

  return (
    <div className="relative border border-slate-800 bg-slate-950 rounded-xl p-4 flex flex-col items-center">
      <span className="text-xs text-slate-500 font-mono absolute top-3 left-4">ENGINE TARGET: RUST_WASM_CORE (60FPS)</span>
      <canvas ref={canvasRef} width={500} height={450} className="w-full max-w-[500px] h-[450px]" />
    </div>
  );
}
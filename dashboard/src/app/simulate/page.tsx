"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import OrbitSimulator from "@/components/universe/OrbitSimulator";
import FluxChart, {
  type FluxChartHandle,
} from "@/components/charts/flux/index";

// ── CRITICAL: RUST WASM INGESTION INITIALIZATION ───────────────────────────
import initWasm, {
  astroflux_handshake,
  compute_orbital_frame,
} from "@/core-simulator-wasm/core_simulator";

// ── IMPORT MODULAR HUD COMPONENTS (SRP COMPLIANT) ───────────────────────────
import HeaderToken from "@/components/universe/hud/HeaderToken";
import TargetConsole from "@/components/universe/hud/TargetConsole";
import TelemetryPanel from "@/components/universe/hud/TelemetryPanel";

function telescopeToMission(telescope: string): string {
  const map: Record<string, string> = {
    JWST: "JWST",
    TESS: "TESS",
    KEPLER: "Kepler",
    HUBBLE: "HST",
  };
  return map[telescope.toUpperCase()] ?? "Kepler";
}

function SimulatorInner() {
  const searchParams = useSearchParams();
  const initialSystem = searchParams.get("system") ?? "Kepler-452 b";
  const initialTelescope = searchParams.get("telescope") ?? "Kepler";

  const [targetName, setTargetName] = useState(initialSystem);
  const [loading, setLoading] = useState(false);
  const [systemData, setSystemData] = useState<any>(null);

  // High-performance state hooks driven by Rust bindings
  const [timeCounter, setTimeCounter] = useState(0.0);
  const [livePhaseAngle, setLivePhaseAngle] = useState(0.0);
  const [isPlaying, setIsPlaying] = useState(true);

  // New State for 3D Positions Vectors returned by WASM Core Engine
  const [spatialPositions, setSpatialPositions] = useState({
    x: 0,
    y: 0,
    z: 0,
  });
  const [wasmReady, setWasmReady] = useState(false);

  const fluxChartRef = useRef<FluxChartHandle>(null);
  const animationFrameId = useRef<number>(0);
  const timerRef = useRef<number>(0); // Mutable ticker for stable physics frame updates

  // 1. DATA ACQUISITION FROM NEXT GATEWAY ROUTE
  const triggerSpacePipeline = async (targetOverride?: string) => {
    const activeTarget = targetOverride || targetName;
    setLoading(true);
    try {
      const mission = telescopeToMission(initialTelescope);
      const res = await fetch(
        `/api/v1/flux/process?target=${encodeURIComponent(activeTarget)}`,
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSystemData(data);
    } catch (err) {
      console.error("Dashboard Core fetch abort:", err);
    } finally {
      setLoading(false);
    }
  };

  // Automatically fetch baseline dataset on load initialization
  useEffect(() => {
    triggerSpacePipeline(initialSystem);
  }, []);

  // PHASE 1: Asynchronously mount Rust WebAssembly Module into Browser Context
  useEffect(() => {
    async function bootWasmBinary() {
      try {
        console.log(
          "[WASM BOOT] Mounting compiled core-simulator binary space...",
        );
        await initWasm();
        setWasmReady(true);
        console.log("[WASM BOOT] Core Space Solver: ONLINE");
      } catch (err) {
        console.error("[WASM BOOT CRASH] WebAssembly allocation error:", err);
      }
    }
    bootWasmBinary();

    return () => cancelAnimationFrame(animationFrameId.current);
  }, []);

  // PHASE 3: High-Speed 60fps Physics Solver Frame Loop
  useEffect(() => {
    if (!wasmReady || !systemData || !isPlaying) return;

    // Standard Configuration Matrix derived from our upgraded 20-keys database fields
    const rustConfig = {
      star_mass: systemData.metadata.star_mass ?? 1.0,
      star_radius: systemData.metadata.star_radius ?? 1.0,
      orbital_period_days: systemData.metadata.orbital_period ?? 365.25,
      semi_major_axis_au: systemData.metadata.semi_major_axis ?? 1.0,
      eccentricity: systemData.metadata.eccentricity ?? 0.0,
      orbital_inclination_deg: systemData.metadata.orbital_inclination ?? 0.0,
    };

    const renderLoopTicker = () => {
      // Step A: Stable progressive timestamp ticking increments
      timerRef.current += 0.1;
      setTimeCounter(timerRef.current);

      try {
        // Step B: Quantum compute exact coordinates inside compiled Rust thread
        const frameState = compute_orbital_frame(rustConfig, timerRef.current);

        // Step C: Update localized state vectors for Three.js engine and Chart HUD elements
        setLivePhaseAngle(frameState.current_phase_angle);
        setSpatialPositions({
          x: frameState.position_x,
          y: frameState.position_y,
          z: frameState.position_z,
        });
      } catch (err) {
        console.error("[RENDER LOOP CRASH] Solver iteration failure:", err);
      }

      animationFrameId.current = requestAnimationFrame(renderLoopTicker);
    };

    animationFrameId.current = requestAnimationFrame(renderLoopTicker);
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [wasmReady, systemData, isPlaying]);

  return (
    <>
      <div className="hud-viewport bg-black text-white min-h-screen relative font-mono overflow-hidden select-none">
        {/* ── A. BACKGROUND 3D CANVAS LAYER ───────────────────────────────── */}
        <div className="absolute inset-0 z-0 pointer-events-auto">
          {systemData && (
            <OrbitSimulator
              systemData={systemData}
              currentFrameTime={timeCounter}
              onFrameUpdate={(phase) => {
                fluxChartRef.current?.setPhase(phase);
                setLivePhaseAngle(phase);
              }}
            />
          )}
        </div>

        {/* ── B. TOP LAYER: SYSTEM TOKENS & ACTION CONSOLES ────────────────── */}
        <div className="absolute top-[var(--hud-margin)] left-[var(--hud-margin)] z-10 pointer-events-none flex flex-col gap-4">
          <HeaderToken isLive={isPlaying} version="v2.4" />

          <TargetConsole
            defaultTarget={targetName}
            onLoad={async (name) => {
              setTargetName(name);
              await triggerSpacePipeline(name);
            }}
          />
        </div>

        {/* ── C. RIGHT LAYER: QUANTUM SPECTRAL TELEMETRY ───────────────────── */}
        {systemData && (
          <TelemetryPanel
            data={{
              targetName: systemData.metadata.target_name,
              mission: systemData.metadata.host_name ?? "TAP",
              starMassSolar: systemData.metadata.star_mass ?? 1.0,
              starRadiusSolar: systemData.metadata.star_radius ?? 1.0,
              totalDataPoints: systemData.scientific_arrays.time.length,
              phaseAngleRad: livePhaseAngle,
            }}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
          />
        )}

        {/* ── D. BOTTOM-CENTER: FLUX LIGHT CURVE CHART ───────────────────── */}
        {/* {systemData && (
          <div
            className="absolute left-1/2 -translate-x-1/2 w-[calc(100%-56px)] max-w-[860px] pointer-events-auto"
            style={{ bottom: "var(--hud-margin)" }}
          >
            <FluxChart
              ref={fluxChartRef}
              timeArray={systemData.scientific_arrays.time}
              fluxArray={systemData.scientific_arrays.flux}
              currentPhaseAngle={livePhaseAngle}
            />
          </div>
        )} */}

        {/* ── E. LOADING VEIL ─────────────────────────────────────────────── */}
        {(!systemData || !wasmReady) && (
          <div className="loading-veil">
            <div className="spinner" />
            <div className="flex flex-col items-center gap-1.5">
              <span className="wordmark">AstroFlux // Engine</span>
              <span className="wordmark-sub">
                {!wasmReady
                  ? "Booting WebAssembly Physics Layers..."
                  : "Connecting to pipeline..."}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function EXOPLANETARY() {
  return (
    <Suspense
      fallback={
        <div className="loading-veil">
          <div className="spinner" />
        </div>
      }
    >
      <SimulatorInner />
    </Suspense>
  );
}

import { Suspense } from "react";

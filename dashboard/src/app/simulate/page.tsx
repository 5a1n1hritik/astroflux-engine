"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import OrbitSimulator from "@/components/universe/OrbitSimulator";

// ── IMPORT MODULAR HUD COMPONENTS (SRP COMPLIANT) ───────────────────────────
import HeaderToken from "@/components/universe/hud/HeaderToken";
import TargetConsole from "@/components/universe/hud/TargetConsole";
import TelemetryPanel from "@/components/universe/hud/TelemetryPanel";

function generatePlanetSeed(name: string): number {
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 33) ^ name.charCodeAt(i);
  }
  return Math.abs(hash % 10000) / 10.0;
}

function SimulatorInner() {
  const searchParams = useSearchParams();
  const initialSystem = searchParams.get("system") ?? "Kepler-90 e"; // Updated default to test 8-planet system

  const [targetName, setTargetName] = useState(initialSystem);
  const [loading, setLoading] = useState(false);
  const [systemData, setSystemData] = useState<any>(null);

  // Core high-performance frame clocks
  const [timeCounter, setTimeCounter] = useState(0.0);
  const [livePhaseAngle, setLivePhaseAngle] = useState(0.0);
  const [isPlaying, setIsPlaying] = useState(true);

  const timerRef = useRef<number>(0);
  const animationFrameId = useRef<number>(0);

  // 1. DATA ACQUISITION LAYER FROM MULTI-BODY SYNC BROKER
  const triggerSpacePipeline = async (targetOverride?: string) => {
    const activeTarget = targetOverride || targetName;
    setLoading(true);
    try {
      console.log(`[Ingestion Broker] Dispatching sync thread for target: "${activeTarget}"`);
      const res = await fetch(
        `/api/v1/flux/process?target=${encodeURIComponent(activeTarget)}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSystemData(data);
    } catch (err) {
      console.error("Dashboard Observatory fetch abort:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    triggerSpacePipeline(initialSystem);
  }, []);

  // 2. MONOTONIC TIME CLOCK TICKER FOR WASM SIMULATOR
  useEffect(() => {
    if (!systemData || !isPlaying) return;

    const renderLoopTicker = () => {
      // Step A: Progressive stepping multiplier (1 sec runtime = 0.4 days acceleration)
      timerRef.current += 0.4;
      setTimeCounter(timerRef.current);
      animationFrameId.current = requestAnimationFrame(renderLoopTicker);
    };

    animationFrameId.current = requestAnimationFrame(renderLoopTicker);
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [systemData, isPlaying]);

  return (
    <div className="hud-viewport bg-black text-white min-h-screen relative font-mono overflow-hidden select-none">
      {/* ── A. BACKGROUND 3D MULTI-BODY CANVAS LAYER ─────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        {systemData && (
          <OrbitSimulator
            systemData={systemData}
            currentFrameTime={timeCounter}
            planetSeed={generatePlanetSeed(systemData.system_id || "Unknown")}
            onFrameUpdate={(phase) => {
              setLivePhaseAngle(phase);
            }}
          />
        )}
      </div>

      {/* ── B. TOP LAYER: HUD NOTIFICATIONS & CONSOLES ───────────────────── */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-4">
        <HeaderToken isLive={isPlaying} version="v3.0.0" />

        <TargetConsole
          defaultTarget={targetName}
          onLoad={async (name) => {
            setTargetName(name);
            await triggerSpacePipeline(name);
          }}
        />
      </div>

      {/* ── C. RIGHT LAYER: UNIFIED QUANTUM SPECTRAL TELEMETRY ───────────── */}
      {systemData && systemData.star_parameters && (
        <TelemetryPanel
          data={{
            targetName: systemData.system_id,
            mission: systemData.star_parameters.canonical_name ?? "NASA TAP",
            starMassSolar: systemData.star_parameters.mass_solar ?? 1.0,
            starRadiusSolar: systemData.star_parameters.radius_solar ?? 1.0,
            totalDataPoints: systemData.simulation_grid?.length ?? 1,
            phaseAngleRad: livePhaseAngle,
          }}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
        />
      )}

      {/* ── D. INTERSTITIAL LOADING VEIL ────────────────────────────────── */}
      {(!systemData || loading) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 z-50">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-cyan-400 font-bold tracking-widest text-sm uppercase">AstroFlux Space Sector Observatory</span>
            <span className="text-slate-500 text-xs font-mono">Synchronizing multi-body telemetry arrays...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EXOPLANETARY() {
  return (
    <Suspense fallback={<div className="absolute inset-0 bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <SimulatorInner />
    </Suspense>
  );
}
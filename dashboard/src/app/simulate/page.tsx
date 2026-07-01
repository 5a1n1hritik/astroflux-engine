"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import OrbitSimulator from "@/components/universe/OrbitSimulator";

// ── IMPORT MODULAR HUD COMPONENTS (SRP COMPLIANT) ───────────────────────────
import ViewSwitcher, { ViewMode } from "@/components/universe/hud/ViewSwitcher";
import BottomInfoCard from "@/components/universe/hud/BottomInfoCard";
import DistanceOverlay from "@/components/universe/hud/DistanceOverlay";
import HabitableZoneToggle from "@/components/universe/hud/HabitableZoneToggle";
import BottomControlBar from "@/components/universe/hud/BottomControlBar";
import TopPanel from "@/components/universe/hud/TopPanel";
import { TIME_PRESETS } from "@/lib/timePresets";

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

  const [viewMode, setViewMode] = useState<ViewMode>("planet");
  const [selectedPlanet, setSelectedPlanet] = useState<string>("");
  const [habitableZone, setHabitableZone] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rateIndex, setRateIndex] = useState<number>(0);

  const timerRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);
  const animationFrameId = useRef<number>(0);
  const simRateRef = useRef<number>(1.0);

  // 1. DATA ACQUISITION LAYER FROM MULTI-BODY SYNC BROKER
  const triggerSpacePipeline = async (targetOverride?: string) => {
    const activeTarget = targetOverride || targetName;
    setLoading(true);
    try {
      console.log(
        `[Ingestion Broker] Dispatching sync thread for target: "${activeTarget}"`,
      );
      const res = await fetch(
        `/api/v1/flux/process?target=${encodeURIComponent(activeTarget)}`,
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

  useEffect(() => {
    simRateRef.current = TIME_PRESETS[rateIndex].factor;
  }, [rateIndex]);

  // 2. MONOTONIC TIME CLOCK TICKER FOR WASM SIMULATOR
  useEffect(() => {
    if (!systemData || !isPlaying) return;

    const renderLoopTicker = (timestamp: number) => {
      if (lastTimestampRef.current === 0) lastTimestampRef.current = timestamp;
      const dtReal = (timestamp - lastTimestampRef.current) / 1000; // real seconds elapsed
      lastTimestampRef.current = timestamp;
      // dtReal * factor = simulation seconds, / 86400 = simulation days
      timerRef.current += (dtReal * simRateRef.current) / 86_400;
      setTimeCounter(timerRef.current);

      animationFrameId.current = requestAnimationFrame(renderLoopTicker);
    };

    animationFrameId.current = requestAnimationFrame(renderLoopTicker);
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [systemData, isPlaying]);

  return (
    <div className="hud-viewport bg-black text-white min-h-screen relative font-mono overflow-hidden select-none">
      <TopPanel
        onTargetSelect={async (name) => {
          setTargetName(name);
          await triggerSpacePipeline(name);
        }}
      />

      {/* ── A. BACKGROUND 3D MULTI-BODY CANVAS LAYER ─────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        {systemData && (
          <OrbitSimulator
            systemData={systemData}
            currentFrameTime={timeCounter}
            planetSeed={generatePlanetSeed(systemData.system_id || "Unknown")}
            showHabitableZone={habitableZone}
            onFrameUpdate={(phase) => {
              setLivePhaseAngle(phase);
            }}
            viewMode={viewMode}
            selectedPlanet={selectedPlanet}
            onPlanetSelect={(name) => {
              setSelectedPlanet(name);
              setViewMode("planet");
            }}
          />
        )}
      </div>

      {/* ── C. HABITABLE ZONE TOGGLE — below HeaderToken, only system view ─ */}
      {viewMode === "system" && systemData && (
        <div style={{ position: "absolute", top: 220, left: 76, zIndex: 10 }}>
          <HabitableZoneToggle
            enabled={habitableZone}
            onChange={setHabitableZone}
          />
        </div>
      )}

      {/* ── D. DISTANCE OVERLAY — vertically centered left edge ─────────── */}
      {systemData && (
        <DistanceOverlay
          distanceLightYears={systemData.space_location?.distance_light_years}
        />
      )}

      {/* ── E. BOTTOM-LEFT: context info card — above BottomControlBar ───── */}
      {systemData && (
        <div className="absolute bottom-[72px] left-[36px] z-10 pointer-events-none">
          <BottomInfoCard viewMode={viewMode} systemData={systemData} />
        </div>
      )}

      {/* ── F. BOTTOM-RIGHT: VIEW switcher — above BottomControlBar ─────── */}
      <div className="absolute bottom-[72px] right-[36px] z-10">
        <ViewSwitcher activeView={viewMode} onViewChange={setViewMode} />
      </div>

      {/* ── G. BOTTOM CONTROL BAR ────────────────────────────────────────── */}
      <BottomControlBar
        rateIndex={rateIndex}
        onRateChange={setRateIndex}
        isFullscreen={isFullscreen}
        onFullscreen={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
          } else {
            document.exitFullscreen();
            setIsFullscreen(false);
          }
        }}
        viewMode={viewMode}
        systemData={systemData}
      />

      {/* ── H. LOADING VEIL ──────────────────────────────────────────────── */}
      {(!systemData || loading) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 z-50">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-cyan-400 font-bold tracking-widest text-sm uppercase">
              AstroFlux Space Sector Observatory
            </span>
            <span className="text-slate-500 text-xs font-mono">
              Synchronizing multi-body telemetry arrays...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EXOPLANETARY() {
  return (
    <Suspense
      fallback={
        <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SimulatorInner />
    </Suspense>
  );
}

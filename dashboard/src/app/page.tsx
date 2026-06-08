"use client";

import { useState, useEffect, useRef } from "react";
import OrbitSimulator from "@/components/OrbitSimulator";
import FluxChart, { type FluxChartHandle } from "@/components/charts/flux/index";

// ── IMPORT MODULAR HUD COMPONENTS (SRP COMPLIANT) ───────────────────────────
import HeaderToken from "@/components/hud/HeaderToken";
import TargetConsole from "@/components/hud/TargetConsole";
import TelemetryPanel from "@/components/hud/TelemetryPanel";

export default function Home() {
  const [targetName, setTargetName] = useState("Kepler-452");
  const [loading, setLoading] = useState(false);
  const [systemData, setSystemData] = useState<any>(null);
  const [timeCounter, setTimeCounter] = useState(0.0);
  const [livePhaseAngle, setLivePhaseAngle] = useState(0.0);
  const [isPlaying, setIsPlaying] = useState(true);
  const fluxChartRef = useRef<FluxChartHandle>(null);

  // 1. DATA ACQUISITION FROM NEXT GATEWAY ROUTE
  const triggerSpacePipeline = async (targetOverride?: string) => {
    const activeTarget = targetOverride || targetName;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/flux/process?target=${encodeURIComponent(activeTarget)}`
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
    triggerSpacePipeline();
  }, []);

  // 2. TIMELINE COUNTER AUTOMATION ENGINE (Frame ticker integration)
  useEffect(() => {
    if (!isPlaying || !systemData) return;

    let frameId: number;
    const tick = () => {
      setTimeCounter((prev) => prev + 0.05); // Standardized step value delta
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, systemData]);

  return (
    <>
      {/* ── LAYER 0: THREE.JS WEBGL CANVAS ROOT ───────────────────────────── */}
      <div id="canvas-root">
        {systemData && (
          <OrbitSimulator
            targetMetadata={{
              star_mass_solar: systemData.metadata.star_mass_solar,
              star_radius_solar: systemData.metadata.star_radius_solar,
              orbital_period_days: systemData.metadata.star_mass_solar * 365,
              semi_major_axis_au: 1.0,
              eccentricity: 0.15,
            }}
            currentFrameTime={timeCounter}
            onFrameUpdate={(phase) => {
              fluxChartRef.current?.setPhase(phase);
              setLivePhaseAngle(phase);
            }}
          />
        )}
      </div>

      {/* ── LAYER 1: HUD OVERLAY ROOT ──────────────────────────────────────── */}
      <div id="hud-root">
        
        {/* ── A. TOP-LEFT: BRANDING / WORDMARK (MODULARIZED) ───────────────── */}
        <HeaderToken isLive={isPlaying} version="v2.4" />

        {/* ── B. TOP-RIGHT: SYSTEM LOAD CONTROLS (MODULARIZED) ─────────────── */}
        <TargetConsole
          defaultTarget={targetName}
          onLoad={async (name) => {
            setTargetName(name);
            await triggerSpacePipeline(name);
          }}
        />

        {/* ── C. LEFT-CENTER: TELEMETRY PANEL (MODULARIZED & ANIMATED) ─────── */}
        {systemData && (
          <TelemetryPanel
            data={{
              targetName:      systemData.metadata.target_name,
              mission:         systemData.metadata.mission,
              starMassSolar:   systemData.metadata.star_mass_solar,
              starRadiusSolar: systemData.metadata.star_radius_solar,
              totalDataPoints: systemData.metadata.total_processed_points,
              phaseAngleRad:   livePhaseAngle,
            }}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
          />
        )}

        {/* ── D. BOTTOM-CENTER: FLUX LIGHT CURVE CHART ───────────────────── */}
        {systemData && (
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
        )}

        {/* ── E. LOADING VEIL ─────────────────────────────────────────────── */}
        {!systemData && (
          <div className="loading-veil">
            <div className="spinner" />
            <div className="flex flex-col items-center gap-1.5">
              <span className="wordmark">AstroFlux // Engine</span>
              <span className="wordmark-sub">
                Connecting to underground pipeline interfaces...
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
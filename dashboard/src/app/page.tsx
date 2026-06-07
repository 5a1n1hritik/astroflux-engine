"use client";

import { useState, useEffect, useRef } from "react";
import OrbitSimulator from "@/components/OrbitSimulator";
import FluxChart, { type FluxChartHandle } from "@/components/FluxChart";

export default function Home() {
  const [targetName, setTargetName] = useState("Kepler-452");
  const [loading, setLoading] = useState(false);
  const [systemData, setSystemData] = useState<any>(null);
  const [timeCounter, setTimeCounter] = useState(0.0);
  const [livePhaseAngle, setLivePhaseAngle] = useState(0.0);
  const [isPlaying, setIsPlaying] = useState(true);
  const fluxChartRef = useRef<FluxChartHandle>(null);

  // 1. DATA ACQUISITION FROM NEXT GATEWAY ROUTE
  const triggerSpacePipeline = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/flux/process?target=${encodeURIComponent(targetName)}`,
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
    const period = systemData.metadata.star_mass_solar * 10; // Scaled temporal acceleration parameter

    const tick = () => {
      setTimeCounter((prev) => prev + 0.05); // Standardized step value delta
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, systemData]);

  return (
    <>
      {/* ── LAYER 0: THREE.JS WEBGL CANVAS ROOT ─────────────────────────────
          The OrbitSimulator fills this div entirely.
          In Step 2, Three.js will appendChild its <canvas> inside #canvas-root
          via the containerRef inside OrbitSimulator.tsx.
          This div must remain position:fixed, inset:0 (handled in globals.css).
          ─────────────────────────────────────────────────────────────────── */}
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

      {/* ── LAYER 1: HUD OVERLAY ROOT ────────────────────────────────────────
          All panels below are absolute children of this fixed layer.
          pointer-events: none by default (globals.css), re-enabled per panel.
          ─────────────────────────────────────────────────────────────────── */}
      <div id="hud-root">
        {/* ── A. TOP-LEFT: BRANDING / WORDMARK ──────────────────────────────
            Positioned top-left. No interaction needed. Light footprint.
            ─────────────────────────────────────────────────────────────── */}
        <div
          className="absolute top-0 left-0 flex flex-col gap-1 p-[--hud-margin]"
          style={{ top: "var(--hud-margin)", left: "var(--hud-margin)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="status-dot" />
            <span className="wordmark">AstroFlux // Engine</span>
          </div>
          <span className="wordmark-sub pl-[18px]">
            Quantum Simulation Environment — Exoplanetary Transits
          </span>
        </div>

        {/* ── B. TOP-RIGHT: SYSTEM LOAD CONTROLS ───────────────────────────
            Target input + load button. Floats top-right.
            ─────────────────────────────────────────────────────────────── */}
        <div
          className="absolute glass-panel bracketed flex flex-col gap-3 p-4 w-[240px]"
          style={{ top: "var(--hud-margin)", right: "var(--hud-margin)" }}
        >
          <span className="hud-label">Target System</span>
          <input
            type="text"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && triggerSpacePipeline()}
            className="input-target"
            placeholder="e.g. Kepler-22b"
          />
          <button
            onClick={triggerSpacePipeline}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <>
                <span
                  className="spinner"
                  style={{ width: 10, height: 10, borderWidth: 1.5 }}
                />
                Processing
              </>
            ) : (
              "Load System"
            )}
          </button>
        </div>

        {/* ── C. LEFT-CENTER: TELEMETRY PANEL ──────────────────────────────
            Physics constants, stellar metadata, simulation controls.
            Only rendered once systemData is available.
            ─────────────────────────────────────────────────────────────── */}
        {systemData && (
          <div
            className="absolute glass-panel glass-panel--heavy bracketed flex flex-col gap-0 p-5 w-[230px]"
            style={{
              top: "50%",
              left: "var(--hud-margin)",
              transform: "translateY(-50%)",
            }}
          >
            {/* Panel header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="status-dot" />
              <span className="hud-label">System Telemetry</span>
            </div>

            <div className="hud-divider" />

            {/* Telemetry rows */}
            <div className="telemetry-row">
              <span className="telemetry-label">Identifier</span>
              <span className="telemetry-value telemetry-value--accent">
                {systemData.metadata.target_name}
              </span>
            </div>
            <div className="telemetry-row">
              <span className="telemetry-label">Mission</span>
              <span className="telemetry-value">
                {systemData.metadata.mission}
              </span>
            </div>
            <div className="telemetry-row">
              <span className="telemetry-label">Stellar Mass</span>
              <span className="telemetry-value telemetry-value--cyan">
                {systemData.metadata.star_mass_solar.toFixed(3)} M☉
              </span>
            </div>
            <div className="telemetry-row">
              <span className="telemetry-label">Stellar Radius</span>
              <span className="telemetry-value telemetry-value--cyan">
                {systemData.metadata.star_radius_solar.toFixed(3)} R☉
              </span>
            </div>
            <div className="telemetry-row">
              <span className="telemetry-label">Data Points</span>
              <span className="telemetry-value">
                {/* {systemData.metadata.total_processed_points.toLocaleString()} */}
                {systemData.metadata.total_processed_points} pts
                {/* {systemData?.metadata ? (
                  <span className="telemetry-value">
                    {Number(systemData?.metadata?.total_processed_points || 0).toLocaleString()}
                  </span>
                ) : (
                  <span className="telemetry-value animate-pulse text-sky-500/50">
                    CONNECTING...
                  </span>
                )} */}
              </span>
            </div>
            <div className="telemetry-row">
              <span className="telemetry-label">Phase Angle</span>
              <span className="telemetry-value">
                {(livePhaseAngle * (180 / Math.PI)).toFixed(2)}°
              </span>
            </div>

            <div className="hud-divider" style={{ marginTop: 14 }} />

            {/* Play / Pause control */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`btn-toggle ${isPlaying ? "btn-toggle--playing" : "btn-toggle--paused"}`}
            >
              {isPlaying ? "⏸  Pause Runtime" : "▶  Engage Runtime"}
            </button>
          </div>
        )}

        {/* ── D. BOTTOM-CENTER: FLUX LIGHT CURVE CHART ─────────────────────
            Spans a wide centered strip at the bottom.
            Uses .chart-panel from globals.css for absolute positioning.
            ─────────────────────────────────────────────────────────────── */}
        {systemData && (
          <div className="chart-panel glass-panel">
            <FluxChart
             ref={fluxChartRef}
             timeArray={systemData.scientific_arrays.time}
             fluxArray={systemData.scientific_arrays.flux}
             currentPhaseAngle={livePhaseAngle}
           />
          </div>
        )}

        {/* ── E. LOADING VEIL ───────────────────────────────────────────────
            Full-screen overlay shown during initial pipeline fetch.
            Disappears once systemData is set.
            ─────────────────────────────────────────────────────────────── */}
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

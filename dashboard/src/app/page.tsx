"use client";

import { useState, useEffect } from "react";
import OrbitSimulator from "@/components/OrbitSimulator";
import FluxChart from "@/components/FluxChart";

export default function Home() {
  const [targetName, setTargetName] = useState("Kepler-452");
  const [loading, setLoading] = useState(false);
  const [systemData, setSystemData] = useState<any>(null);
  const [timeCounter, setTimeCounter] = useState(0.0);
  const [livePhaseAngle, setLivePhaseAngle] = useState(0.0);
  const [isPlaying, setIsPlaying] = useState(true);

  // 1. DATA ACQUISITION FROM NEXT GATEWAY ROUTE
  const triggerSpacePipeline = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/flux/process?target=${encodeURIComponent(targetName)}`);
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
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans antialiased selection:bg-cyan-500/30">
      {/* Header Branding Control */}
      <header className="mb-8 border-b border-slate-800 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 font-mono">ASTROFLUX // ENGINE</h1>
          <p className="text-xs text-slate-400 font-mono">Quantum Simulation Environment for Exoplanetary Transits</p>
        </div>
        
        {/* Dynamic Control Panel */}
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-cyan-400 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400 font-mono"
            placeholder="Enter Star (e.g. Kepler-22)"
          />
          <button
            onClick={triggerSpacePipeline}
            disabled={loading}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-mono font-bold text-white px-4 py-2 rounded-lg hover:brightness-110 active:scale-95 disabled:opacity-50 transition"
          >
            {loading ? "PROCESSING..." : "LOAD DATA SYSTEM"}
          </button>
        </div>
      </header>

      {/* Main Dashboard Control Matrix Grid */}
      {systemData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Block: Physics Constants Readings Card */}
          <div className="border border-slate-800 bg-slate-900/40 rounded-xl p-5 flex flex-col justify-between font-mono">
            <div>
              <h3 className="text-sm text-cyan-400 font-bold mb-4 border-b border-slate-800 pb-2">// SYSTEM TELEMETRY</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">OBJECT IDENTIFIER:</span> <span className="text-emerald-400 font-bold">{systemData.metadata.target_name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">MISSION SOURCE:</span> <span>{systemData.metadata.mission} ARCHIVE</span></div>
                <div className="flex justify-between"><span className="text-slate-500">STELLAR MASS (M☉):</span> <span>{systemData.metadata.star_mass_solar.toFixed(2)} Solar Mass</span></div>
                <div className="flex justify-between"><span className="text-slate-500">STELLAR RADIUS (R☉):</span> <span>{systemData.metadata.star_radius_solar.toFixed(2)} Solar Radius</span></div>
                <div className="flex justify-between"><span className="text-slate-500">TOTAL DATA BUCKETS:</span> <span className="text-slate-400">{systemData.metadata.total_processed_points} pts</span></div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`w-full py-2.5 rounded-lg text-xs font-bold font-mono tracking-wider transition ${isPlaying ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}
              >
                {isPlaying ? "PAUSE SIMULATION RUNTIME" : "ENGAGE PHYSICS RUNTIME"}
              </button>
            </div>
          </div>

          {/* Right Block: Dynamic Render Pipeline Layout */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <OrbitSimulator
              targetMetadata={{
                star_mass_solar: systemData.metadata.star_mass_solar,
                star_radius_solar: systemData.metadata.star_radius_solar,
                orbital_period_days: systemData.metadata.star_mass_solar * 365, // Simulated normalized constraints period mapping
                semi_major_axis_au: 1.0, // Fixed unit vector for layout center scaling parameters
                eccentricity: 0.15 // Normalized elliptical tracking curve value standard bounds
              }}
              currentFrameTime={timeCounter}
              onFrameUpdate={(phase) => setLivePhaseAngle(phase)}
            />

            <FluxChart
              timeArray={systemData.scientific_arrays.time}
              fluxArray={systemData.scientific_arrays.flux}
              currentPhaseAngle={livePhaseAngle}
            />
          </div>
        </div>
      ) : (
        <div className="h-[60vh] flex flex-col items-center justify-center border border-slate-900 bg-slate-950 rounded-2xl">
          <div className="w-8 h-8 border-2 border-t-cyan-400 border-slate-800 rounded-full animate-spin mb-4" />
          <p className="text-xs text-slate-400 font-mono">CONNECTING TO ASTROFLUX UNDERGROUND SYSTEMS TUNNEL INTERFACES...</p>
        </div>
      )}
    </main>
  );
}

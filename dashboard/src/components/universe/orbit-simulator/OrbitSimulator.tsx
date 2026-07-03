"use client";

/**
 * OrbitSimulator.tsx
 * src/components/universe/orbit-simulator/OrbitSimulator.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Composition root — wires hooks together, owns the stable refs that bridge
 * React state → render loop without causing re-mounts.
 *
 * What lives here:
 *   - mount div ref
 *   - stable refs (viewModeRef, selectedPlanetRef, simulationTimeRef, wasmEngineRef)
 *   - useWasmOrbit (WASM singleton bridge)
 *   - useThreeScene (scene build lifecycle)
 *   - usePlanetRaycaster (click-to-select)
 *   - useRenderLoop (per-frame tick)
 *
 * What does NOT live here:
 *   - Any THREE.js object construction (scene/*)
 *   - Camera math (camera/*)
 *   - Physics (physics/*)
 *   - Labels (labels/*)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef } from "react";
import { useWasmOrbit } from "@/hooks/useWasmOrbit";
import { useThreeScene } from "./hooks/useThreeScene";
import { useRenderLoop } from "./hooks/useRenderLoop";
import { usePlanetRaycaster } from "./interaction/usePlanetRaycaster";
import type { OrbitSimulatorProps, ViewMode, WasmEngine } from "./types";

export default function OrbitSimulator({
  systemData,
  currentFrameTime,
  planetSeed,
  showHabitableZone = true,
  viewMode,
  selectedPlanet = "",
  onFrameUpdate,
  onPlanetSelect,
}: OrbitSimulatorProps) {

  const mountRef = useRef<HTMLDivElement>(null);

  // ── WASM singleton ──────────────────────────────────────────────────────
  const { engine: wasmEngine, isReady } = useWasmOrbit({
    system_id: systemData?.system_id ?? "Unknown",
  });

  // ── Stable refs — written every render, read inside tick (no re-mount) ─
  const viewModeRef        = useRef<ViewMode>(viewMode);
  const selectedPlanetRef  = useRef<string>(selectedPlanet);
  const simulationTimeRef  = useRef<number>(currentFrameTime);
  const wasmEngineRef      = useRef<WasmEngine | null>(wasmEngine);

  viewModeRef.current       = viewMode;
  selectedPlanetRef.current = selectedPlanet;
  simulationTimeRef.current = currentFrameTime;
  wasmEngineRef.current     = wasmEngine;

  // ── Scene lifecycle ─────────────────────────────────────────────────────
  const sceneRefs = useThreeScene(
    mountRef,
    systemData,
    planetSeed,
    showHabitableZone,
    isReady,
    (planetName) => onPlanetSelect?.(planetName),
    viewMode,
  );

  // ── Click-to-select (canvas raycasting) ────────────────────────────────
  usePlanetRaycaster({
    canvasEl: sceneRefs.rendererRef.current?.domElement ?? null,
    camera:   sceneRefs.cameraRef.current,
    planetMeshesRef: sceneRefs.planetMeshesRef,
    onPlanetSelect,
    enabled:  isReady && sceneRefs.rendererRef.current !== null,
  });

  // ── Per-frame render loop ───────────────────────────────────────────────
  useRenderLoop({
    ...sceneRefs,
    mountRef,
    viewModeRef,
    selectedPlanetRef,
    simulationTimeRef,
    wasmEngineRef,
    systemData,
    onFrameUpdate,
    isReady,
  });

  return <div ref={mountRef} className="w-full h-full display-block" />;
}
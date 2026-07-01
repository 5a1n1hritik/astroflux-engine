"use client";

/**
 * useRenderLoop.ts
 * src/components/universe/orbit-simulator/hooks/useRenderLoop.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Owns the requestAnimationFrame render loop. Each tick:
 *   1. controls.update()          (damping)
 *   2. applyCameraStrategy()      (planet/system/star view camera)
 *   3. runWasmFrameStep()         (Keplerian solver -> mesh positions)
 *   4. projectLabels()            (2D screen-space label positioning)
 *   5. star shader uniforms       (uTime on core + corona)
 *   6. corona billboard           (face camera)
 *   7. renderer.render()
 *
 * All refs are read inside the tick — changing viewMode, selectedPlanet, or
 * simulationTime does NOT re-mount this effect; it just writes the ref.
 * This is the critical design that keeps the loop stable at 60fps regardless
 * of React state churn.
 *
 * SRP: tick orchestration only. No mesh construction, no DOM creation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { applyCameraStrategy } from "../camera";
import { runWasmFrameStep } from "../physics/wasmFrameRequest";
import { projectLabels } from "../labels";

import type {
  ViewMode,
  WasmEngine,
  StarSystemNode,
  TrackedPlanetMesh,
  CameraVectorPool,
  CameraContext,
} from "../types";
import type { StarBuildResult } from "../scene/buildStar";

export interface UseRenderLoopParams {
  // Scene refs (populated by useThreeScene)
  sceneRef: React.RefObject<THREE.Scene | null>;
  rendererRef: React.RefObject<THREE.WebGLRenderer | null>;
  cameraRef: React.RefObject<THREE.PerspectiveCamera | null>;
  controlsRef: React.RefObject<OrbitControls | null>;
  planetMeshesRef: React.RefObject<TrackedPlanetMesh[]>;
  labelsRef: React.RefObject<Map<string, HTMLDivElement>>;
  starBuildRef: React.RefObject<StarBuildResult | null>;
  vectorPoolRef: React.RefObject<CameraVectorPool | null>;
  outerOrbitRadiusWSRef: React.RefObject<number>;
  mountRef: React.RefObject<HTMLDivElement | null>;

  // Live simulation inputs (written as refs to avoid re-mounting the loop)
  viewModeRef: React.RefObject<ViewMode>;
  selectedPlanetRef: React.RefObject<string>;
  simulationTimeRef: React.RefObject<number>;
  wasmEngineRef: React.RefObject<WasmEngine | null>;

  // System data (stable for a given target — changes trigger scene rebuild, not loop remount)
  systemData: StarSystemNode | null;

  // Callbacks
  onFrameUpdate: (phaseAngle: number) => void;

  // Gate
  isReady: boolean;
}

export function useRenderLoop(params: UseRenderLoopParams): void {
  const {
    sceneRef,
    rendererRef,
    cameraRef,
    controlsRef,
    planetMeshesRef,
    labelsRef,
    starBuildRef,
    vectorPoolRef,
    outerOrbitRadiusWSRef,
    mountRef,
    viewModeRef,
    selectedPlanetRef,
    simulationTimeRef,
    wasmEngineRef,
    systemData,
    onFrameUpdate,
    isReady,
  } = params;

  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!systemData || !isReady) return;

    const clock = new THREE.Clock();

    function tick() {
      rafRef.current = requestAnimationFrame(tick);

      const scene = sceneRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      const controls = controlsRef.current;

      if (!scene || !renderer || !camera || !controls) return;

      const elapsed = clock.getElapsedTime();
      const vectors = vectorPoolRef.current;
      const starBuild = starBuildRef.current;

      // ── 1. Controls damping ─────────────────────────────────────────────
      controls.update();

      // ── 2. Camera strategy ──────────────────────────────────────────────
      if (vectors) {
        const selectedName = selectedPlanetRef.current;
        const selectedNode =
          planetMeshesRef.current?.find((p) => p.name === selectedName) ??
          planetMeshesRef.current?.[0];

        const ctx: CameraContext = {
          camera,
          controls,
          vectors,
          elapsed,
          selectedNode,
          outerOrbitRadiusWS: outerOrbitRadiusWSRef.current,
          starSphereRadiusWS: starBuild?.sphereRadiusWS ?? 1.2,
        };

        applyCameraStrategy(viewModeRef.current, ctx);
      }

      // ── 3. Star shader uniforms ─────────────────────────────────────────
      if (starBuild) {
        starBuild.coreMat.uniforms.uTime.value = elapsed;
        starBuild.coronaMat.uniforms.uTime.value = elapsed;

        // Keep corona billboard facing camera
        const coronaMesh = scene.getObjectByName("starCorona") as
          | THREE.Mesh
          | undefined;
        if (coronaMesh) coronaMesh.quaternion.copy(camera.quaternion);
      }

      // ── 4. WASM Keplerian solver + mesh position update ─────────────────
      const wasm = wasmEngineRef.current;
      if (!systemData) return;
      const grid = systemData.simulation_grid ?? [];

      if (wasm && grid.length > 0) {
        const phaseAngle = runWasmFrameStep(
          scene,
          wasm,
          planetMeshesRef.current ?? [],
          {
            systemId: systemData.system_id,
            simulationTimeDays: simulationTimeRef.current,
            starMassSolar: systemData.star_parameters.mass_solar ?? 1.0,
            starRotationDays:
              systemData.star_parameters.rotation_period_days ?? 25.0,
            systemDistancePc:
              systemData.space_location.distance_parsecs ?? 10.0,
            planets: grid,
          },
          elapsed,
        );

        if (phaseAngle !== null) onFrameUpdate(phaseAngle);
      }

      // ── 5. Label screen-space projection ───────────────────────────────
      const container = mountRef.current;
      if (vectors && labelsRef.current.size > 0 && container) {
        projectLabels(
          planetMeshesRef.current ?? [],
          labelsRef.current,
          camera,
          vectors.screenPos,
          container.clientWidth,
          container.clientHeight,
        );
      }

      // ── 6. Render ───────────────────────────────────────────────────────
      renderer.render(scene, camera);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [systemData, isReady]);
}

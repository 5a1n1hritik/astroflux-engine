/**
 * wasmFrameRequest.ts
 * src/components/universe/orbit-simulator/physics/wasmFrameRequest.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Bridges the per-frame WASM Keplerian solver call: builds the batch request
 * payload from current system data + simulation time, then applies the
 * solved position/rotation frame back onto the tracked THREE meshes.
 *
 * Coordinate mapping (WASM -> THREE world space):
 *   position_x -> THREE.x
 *   position_z -> THREE.y   (matches buildOrbitPath's y_raw*sin(inc) mapping)
 *   position_y -> THREE.z   (matches buildOrbitPath's y_raw*cos(inc) mapping)
 * This mapping MUST stay identical to scene/buildOrbitPath.ts — if one
 * changes without the other, orbit lines and planet meshes desync.
 *
 * SRP: only request-building + frame-application. No camera, no scene
 * construction, no React state.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from "three";
import type {
  WasmEngine,
  PlanetConfig,
  TrackedPlanetMesh,
  SolvedSystemFrame,
} from "../types";
import { AU_TO_WS } from "../constants";

export interface WasmFrameInputs {
  systemId:           string;
  simulationTimeDays: number;
  starMassSolar:      number;
  starRotationDays:   number;
  systemDistancePc:   number;
  planets:            PlanetConfig[];
}

/**
 * Builds the batch request object sent to the WASM solver.
 * Pure data transform — no side effects.
 */
export function buildWasmRequest(inputs: WasmFrameInputs): Record<string, unknown> {
  return {
    system_id:             inputs.systemId,
    simulation_time_days:  inputs.simulationTimeDays,
    star_mass_solar:       inputs.starMassSolar,
    star_rotation_days:    inputs.starRotationDays,
    system_distance_pc:    inputs.systemDistancePc,
    planets:               inputs.planets,
  };
}

/**
 * Applies a solved WASM frame onto the scene:
 *  - rotates the star core mesh per star_rotation_angle_rad
 *  - positions each tracked planet mesh per its solved x/y/z
 *  - advances each planet's shader uTime uniform (if present)
 *  - returns the first planet's phase_angle for HUD telemetry callback
 *
 * Returns null if the frame had no usable simulation_grid (solver error
 * or empty payload) — caller should skip telemetry callback that frame.
 */
export function applySolvedFrame(
  scene: THREE.Scene,
  planetMeshes: TrackedPlanetMesh[],
  solvedFrame: SolvedSystemFrame | null,
  elapsed: number,
): number | null {
  if (!solvedFrame || !solvedFrame.simulation_grid) return null;

  const coreMeshObj = scene.getObjectByName("starCore") as THREE.Mesh | undefined;
  if (coreMeshObj) {
    coreMeshObj.rotation.y = solvedFrame.star_rotation_angle_rad;
  }

  for (const solvedPlanet of solvedFrame.simulation_grid) {
    const tracked = planetMeshes.find((p) => p.name === solvedPlanet.planet_name);
    if (!tracked) continue;

    tracked.mesh.position.set(
      solvedPlanet.position_x * AU_TO_WS,
      solvedPlanet.position_z * AU_TO_WS, // matches buildOrbitPath y-mapping
      solvedPlanet.position_y * AU_TO_WS, // matches buildOrbitPath z-mapping
    );

    // tracked.mesh.rotation.y += 0.01;

    const mat = tracked.mesh.material as THREE.ShaderMaterial;
    if (mat?.uniforms?.uTime) {
      mat.uniforms.uTime.value = elapsed;
    }
  }

  return solvedFrame.simulation_grid.length > 0
    ? solvedFrame.simulation_grid[0].phase_angle
    : null;
}

/**
 * Convenience wrapper: builds request, calls the WASM engine, applies the
 * result. Returns the phase angle for telemetry, or null on any failure.
 * Errors are caught internally — a single bad frame must never crash the
 * render loop.
 */
export function runWasmFrameStep(
  scene: THREE.Scene,
  wasmEngine: WasmEngine,
  planetMeshes: TrackedPlanetMesh[],
  inputs: WasmFrameInputs,
  elapsed: number,
): number | null {
  try {
    const request = buildWasmRequest(inputs);
    const solved  = wasmEngine.compute_system_orbital_frame(request);
    return applySolvedFrame(scene, planetMeshes, solved, elapsed);
  } catch (err) {
    console.error("[WASM Frame Step Error]", err);
    return null;
  }
}
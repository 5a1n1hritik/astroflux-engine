/**
 * types.ts
 * src/components/universe/orbit-simulator/types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared type contracts for the orbit-simulator module.
 * No React, no THREE — pure data shapes only.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ── View mode (re-exported here so this module is self-contained) ──────────
export type ViewMode = "planet" | "system" | "star";

// ── API data shapes ──────────────────────────────────────────────────────────

export interface PlanetConfig {
  planet_name: string;
  classification_type: string;
  radius_earth: number;
  mass_earth: number;
  semi_major_axis_au: number;
  eccentricity: number;
  orbital_period_days: number;
  inclination_degrees: number;
  equilibrium_temperature_k: number;
  transit_depth_percent: number;
}

export interface StarSystemNode {
  system_id: string;
  space_location: {
    distance_parsecs: number;
    distance_light_years: number;
    right_ascension_deg: number;
    declination_deg: number;
    unit_sky_vector: { x: number; y: number; z: number };
    total_planets_in_system: number;
  };
  star_parameters: {
    canonical_name: string;
    spectral_type: string;
    mass_solar: number;
    radius_solar: number;
    temperature_kelvin: number;
    rotation_period_days: number;
    luminosity_log: number;
  };
  simulation_grid: PlanetConfig[];
}

// ── Public component props ───────────────────────────────────────────────────

export interface OrbitSimulatorProps {
  systemData: StarSystemNode;
  currentFrameTime: number;
  planetSeed: number;
  showHabitableZone?: boolean;
  viewMode: ViewMode;
  selectedPlanet?: string;
  onFrameUpdate: (phaseAngle: number) => void;
  onPlanetSelect?: (planetName: string) => void;
}

// ── Internal tracked mesh reference ──────────────────────────────────────────

export interface TrackedPlanetMesh {
  name: string;
  mesh: THREE.Mesh;
}

// ── Three.js scene bundle — passed between build*/camera/hook modules ───────

export interface SceneBundle {
  scene:    THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera:   THREE.PerspectiveCamera;
  controls: OrbitControls;
}

// ── WASM solved frame shapes (mirrors lib.rs serde output) ──────────────────

export interface SolvedPlanetFrame {
  planet_name: string;
  position_x: number;
  position_y: number;
  position_z: number;
  velocity_x: number;
  velocity_y: number;
  velocity_z: number;
  phase_angle: number;
  relativistic_factor: number;
  phase_illumination: number;
  thermal_velocity_scale: number;
}

export interface SolvedSystemFrame {
  system_id: string;
  simulation_time_days: number;
  star_rotation_angle_rad: number;
  base_parallax_arcsec: number;
  simulation_grid: SolvedPlanetFrame[];
}

export interface WasmEngine {
  compute_system_orbital_frame: (jsRequest: unknown) => SolvedSystemFrame | null;
}

// ── Pre-allocated vector pool shape (zero-GC render loop) ────────────────────

export interface CameraVectorPool {
  planetPos:    THREE.Vector3;
  direction:    THREE.Vector3;
  targetCamPos: THREE.Vector3;
  barycenter:   THREE.Vector3;
  starTarget:   THREE.Vector3;
  screenPos:    THREE.Vector3;
}

// ── Camera strategy context — what each camera/*.ts function receives ───────

export interface CameraContext {
  camera:           THREE.PerspectiveCamera;
  controls:         OrbitControls;
  vectors:          CameraVectorPool;
  elapsed:          number;
  selectedNode:     TrackedPlanetMesh | undefined;
  outerOrbitRadiusWS: number;     // largest semi_major_axis_au * AU_TO_WS
  starSphereRadiusWS: number;     // current star mesh radius in world units
}
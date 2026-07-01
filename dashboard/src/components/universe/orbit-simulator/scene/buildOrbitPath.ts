/**
 * buildOrbitPath.ts
 * src/components/universe/orbit-simulator/scene/buildOrbitPath.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds a single planet's orbit ellipse as a dashed LineLoop.
 *
 * FIX (orbit overlap issue): planets with near-identical semi-major-axis and
 * inclination (e.g. Kepler-90 g/h) render visually indistinguishable orbits
 * when every path shares the same color/dash pattern. We accept a
 * `planetIndex` and derive a unique hue + dash variation per planet so
 * adjacent orbits remain visually separable even when geometrically close.
 *
 * Coordinate mapping matches the WASM solved-frame convention used when
 * positioning planet meshes: (x_orbital, y_orbital*sin(inc), y_orbital*cos(inc))
 * so the drawn ellipse always passes exactly through the planet's solved
 * position — no axis-mapping drift between orbit line and planet mesh.
 *
 * SRP: pure geometry/material construction. No planet-mesh logic here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from "three";
import {
  AU_TO_WS,
  ORBIT_PATH_SEGMENTS,
  ORBIT_BASE_OPACITY,
  ORBIT_BASE_DASH,
  ORBIT_BASE_GAP,
  ORBIT_HUE_STEP,
  ORBIT_HUE_BASE,
} from "../constants";

export interface OrbitPathParams {
  semiMajorAu:    number;
  eccentricity:   number;
  inclinationDeg: number;
  planetIndex:    number; // 0-based index in simulation_grid — drives unique styling
}

/**
 * Builds and attaches a single orbit ellipse line to the scene.
 * Returns the created Line so callers can name/track it if needed.
 */
export function buildOrbitPath(scene: THREE.Scene, params: OrbitPathParams): THREE.LineLoop {
  const { semiMajorAu, eccentricity, inclinationDeg, planetIndex } = params;

  const a = semiMajorAu * AU_TO_WS;
  const b = a * Math.sqrt(1 - eccentricity ** 2);
  const c = a * eccentricity;
  const inclinationRad = (inclinationDeg * Math.PI) / 180;

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= ORBIT_PATH_SEGMENTS; i++) {
    const theta = (i / ORBIT_PATH_SEGMENTS) * Math.PI * 2;
    const x_raw = a * Math.cos(theta) - c;
    const y_raw = b * Math.sin(theta);

    points.push(new THREE.Vector3(
      x_raw,
      y_raw * Math.sin(inclinationRad), // matches WASM position_z mapping
      y_raw * Math.cos(inclinationRad), // matches WASM position_y mapping
    ));
  }

  const geo = new THREE.BufferGeometry().setFromPoints(points);

  // ── Index-aware unique styling — prevents overlapping-orbit invisibility ──
  const hue = (ORBIT_HUE_BASE + planetIndex * ORBIT_HUE_STEP) % 360;
  const color = new THREE.Color(`hsl(${hue}, 65%, 42%)`);
  const dashSize = ORBIT_BASE_DASH + (planetIndex % 4) * 0.06;

  const mat = new THREE.LineDashedMaterial({
    color,
    dashSize,
    gapSize: ORBIT_BASE_GAP,
    transparent: true,
    opacity: ORBIT_BASE_OPACITY,
    depthWrite: false,
  });

  const line = new THREE.LineLoop(geo, mat);
  line.name = `orbitPath_${planetIndex}`;
  line.computeLineDistances();
  scene.add(line);

  return line;
}
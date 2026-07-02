/**
 * buildHabitableZone.ts
 * src/components/universe/orbit-simulator/scene/buildHabitableZone.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds the habitable-zone torus mesh based on stellar luminosity.
 * Named 'habitableZone' so visibility can be toggled later via
 * scene.getObjectByName without rebuilding the scene.
 *
 * SRP: pure mesh construction, no visibility/toggle logic here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from "three";
import { AU_TO_WS } from "../constants";
import {
  HABITABLE_ZONE_INNER_LUM_DIVISOR,
  HABITABLE_ZONE_OUTER_LUM_DIVISOR,
  HABITABLE_ZONE_MAX_TUBE_RADIUS,
  HABITABLE_ZONE_MAX_MID_RADIUS,
  HABITABLE_ZONE_OPACITY,
} from "../constants";

/**
 * Builds and attaches the habitable-zone torus to the scene.
 * Returns null (and skips attaching) if computed geometry would be degenerate
 * or absurdly large — guards against bad luminosity data.
 */
export function buildHabitableZone(parent: THREE.Object3D, luminosityLog: number): THREE.Mesh | null {
  const L = Math.pow(10, luminosityLog);
  const innerAU = Math.sqrt(L / HABITABLE_ZONE_INNER_LUM_DIVISOR) * AU_TO_WS;
  const outerAU = Math.sqrt(L / HABITABLE_ZONE_OUTER_LUM_DIVISOR) * AU_TO_WS;
  const midAU   = (innerAU + outerAU) / 2;
  const tubeR   = Math.min((outerAU - innerAU) / 2, HABITABLE_ZONE_MAX_TUBE_RADIUS);

  if (tubeR <= 0 || midAU <= 0 || midAU > HABITABLE_ZONE_MAX_MID_RADIUS) {
    return null;
  }

  const geo = new THREE.TorusGeometry(midAU, tubeR, 2, 128);
  const mat = new THREE.MeshBasicMaterial({
    color: "#00ff88",
    transparent: true,
    opacity: HABITABLE_ZONE_OPACITY,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const torus = new THREE.Mesh(geo, mat);
  torus.name = "habitableZone";
  torus.rotation.x = Math.PI / 2;
  parent.add(torus);

  return torus;
}
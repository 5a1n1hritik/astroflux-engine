/**
 * buildStarfield.ts
 * src/components/universe/orbit-simulator/scene/buildStarfield.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Adds deep-space background dust point layers to the scene.
 * SRP: only creates and attaches starfield Points meshes. No state, no return.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from "three";
import { STARFIELD_LAYERS } from "../constants";

function buildStarfieldLayer(
  scene: THREE.Scene,
  count: number,
  size: number,
  spread: number,
  opacity: number,
): void {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: "#e8f4ff",
    size,
    transparent: true,
    opacity,
    sizeAttenuation: true,
    depthWrite: false,
  });

  scene.add(new THREE.Points(geo, mat));
}

/**
 * Builds all configured starfield layers (near + far dust) into the scene.
 */
export function buildStarfield(scene: THREE.Scene): void {
  for (const layer of STARFIELD_LAYERS) {
    buildStarfieldLayer(scene, layer.count, layer.size, layer.spread, layer.opacity);
  }
}
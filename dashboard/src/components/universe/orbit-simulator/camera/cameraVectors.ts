/**
 * cameraVectors.ts
 * src/components/universe/orbit-simulator/camera/cameraVectors.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Factory for a pre-allocated THREE.Vector3 pool, created once per scene
 * mount and reused every frame via .set()/.copy()/.lerp() — never `new`
 * inside the render loop. Prevents V8 GC thrashing at 60-120fps.
 *
 * SRP: allocation only. No camera math lives here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from "three";
import type { CameraVectorPool } from "../types";

export function createCameraVectorPool(): CameraVectorPool {
  return {
    planetPos:    new THREE.Vector3(),
    direction:    new THREE.Vector3(),
    targetCamPos: new THREE.Vector3(),
    barycenter:   new THREE.Vector3(),
    starTarget:   new THREE.Vector3(0, 0, 0),
    screenPos:    new THREE.Vector3(),
  };
}
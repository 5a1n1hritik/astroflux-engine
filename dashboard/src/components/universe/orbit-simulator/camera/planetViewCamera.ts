/**
 * planetViewCamera.ts
 * src/components/universe/orbit-simulator/camera/planetViewCamera.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Planet View camera strategy: locks onto the selected (or first) planet,
 * positioning the camera on the star-facing (illuminated) side.
 *
 * FIX (radius-relative zoom): previously used a fixed 8-world-unit offset
 * regardless of planet size — Earth-like planets felt too close, Gas Giants
 * felt too far. Zoom distance is now derived from the mesh's own geometry
 * radius, so framing stays visually consistent across all planet sizes.
 *
 * FIX (quadrant-jump jerk): direction vector is computed via explicit
 * divideScalar with a minimum-distance guard (skips update if planet is
 * within 0.1 units of origin) rather than .normalize(), and a slightly
 * slower lerp factor smooths sudden direction flips when a planet crosses
 * a coordinate quadrant boundary.
 *
 * SRP: pure function — receives context, mutates camera/controls. No THREE
 * object creation, no scene traversal.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from "three";
import type { CameraContext } from "../types";
import {
  PLANET_VIEW_ZOOM_RADIUS_MULT,
  PLANET_VIEW_MIN_ZOOM,
  PLANET_VIEW_CAM_LERP,
  PLANET_VIEW_TARGET_LERP,
} from "../constants";

const MIN_SAFE_DISTANCE = 0.1; // avoid divide-by-zero when planet is near origin

export function applyPlanetViewCamera(ctx: CameraContext): void {
  const { camera, controls, vectors, selectedNode } = ctx;
  if (!selectedNode) return;

  const { planetPos, direction, targetCamPos } = vectors;

  selectedNode.mesh.getWorldPosition(planetPos);

  const dist = planetPos.length();
  if (dist <= MIN_SAFE_DISTANCE) return; // planet at/near origin — skip this frame, no jerk

  direction.copy(planetPos).divideScalar(dist);

  const geometry = selectedNode.mesh.geometry as THREE.SphereGeometry;
  const meshRadius = geometry.parameters?.radius ?? 0.5;
  const zoomDistance = Math.max(meshRadius * PLANET_VIEW_ZOOM_RADIUS_MULT, PLANET_VIEW_MIN_ZOOM);

  targetCamPos.copy(planetPos).addScaledVector(direction, -zoomDistance);

  controls.minDistance = meshRadius * 1.5;
  controls.maxDistance = zoomDistance * 1.2;

  camera.position.lerp(targetCamPos, PLANET_VIEW_CAM_LERP);
  controls.target.lerp(planetPos, PLANET_VIEW_TARGET_LERP);
}
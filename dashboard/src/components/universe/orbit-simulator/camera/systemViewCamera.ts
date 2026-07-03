/**
 * systemViewCamera.ts
 * src/components/universe/orbit-simulator/camera/systemViewCamera.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * System View camera strategy: frames the entire planetary system using the
 * outermost planet's orbit radius, with a subtle perpetual drift to simulate
 * the system sweeping through space (cosmic parallax feel).
 *
 * FIX (tight zoom / planets cut off): previously the camera's initial
 * position was fixed (0, 60, 110) regardless of system size — an 8-planet
 * system like Kepler-90 had its outer worlds pushed outside the frustum.
 * Camera Y/Z are now derived from `outerOrbitRadiusWS` (passed in via
 * CameraContext, computed once at scene-build time from the largest
 * semi_major_axis_au in the system).
 *
 * SRP: pure function — receives context, mutates camera/controls.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { CameraContext } from "../types";
import {
  SYSTEM_VIEW_HEIGHT_MULT,
  SYSTEM_VIEW_DEPTH_MULT,
  SYSTEM_VIEW_DRIFT_SPEED,
  SYSTEM_VIEW_DRIFT_RADIUS,
  SYSTEM_VIEW_TARGET_LERP,
  SYSTEM_VIEW_CAM_DRIFT_SPEED,
  SYSTEM_VIEW_CAM_DRIFT_MULT,
  SYSTEM_VIEW_CAM_LERP,
} from "../constants";

export function applySystemViewCamera(ctx: CameraContext): void {
  const { camera, controls, vectors, elapsed, outerOrbitRadiusWS } = ctx;
  const { barycenter, targetCamPos } = vectors;

  ctx.controls.minDistance = 0;
  ctx.controls.maxDistance = Infinity;

  // ── Target drift — subtle orbital sweep around system barycenter ──────
  const targetDriftTime = elapsed * SYSTEM_VIEW_DRIFT_SPEED;
  barycenter.set(
    Math.sin(targetDriftTime) * SYSTEM_VIEW_DRIFT_RADIUS,
    0,
    Math.cos(targetDriftTime) * SYSTEM_VIEW_DRIFT_RADIUS,
  );
  controls.target.lerp(barycenter, SYSTEM_VIEW_TARGET_LERP);

  // ── Camera position — framed to outer orbit radius, gentle parallax ───
  const camDriftTime = elapsed * SYSTEM_VIEW_CAM_DRIFT_SPEED;
  const driftAmount  = outerOrbitRadiusWS * SYSTEM_VIEW_CAM_DRIFT_MULT;

  targetCamPos.set(
    Math.sin(camDriftTime) * driftAmount,
    outerOrbitRadiusWS * SYSTEM_VIEW_HEIGHT_MULT,
    outerOrbitRadiusWS * SYSTEM_VIEW_DEPTH_MULT + Math.cos(camDriftTime) * driftAmount,
  );

  camera.position.lerp(targetCamPos, SYSTEM_VIEW_CAM_LERP);
}
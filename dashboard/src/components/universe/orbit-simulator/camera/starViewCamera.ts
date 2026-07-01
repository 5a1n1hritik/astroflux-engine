/**
 * starViewCamera.ts
 * src/components/universe/orbit-simulator/camera/starViewCamera.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Star View camera strategy: cinematic close-up framing of the host star,
 * scaled to the star's actual mesh radius so it never overfills or
 * underfills the frame regardless of stellar radius_solar value.
 *
 * FIX (star overfilling screen): previous fixed multiplier (r*7 depth) made
 * large-radius stars completely dominate the frame with no visible corona
 * edge. Multipliers tuned down (STAR_VIEW_DEPTH_MULT) for a more NASA-like
 * "dominant but bounded" framing where corona/flare detail stays visible.
 *
 * SRP: pure function — receives context, mutates camera/controls.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { CameraContext } from "../types";
import {
  STAR_VIEW_HEIGHT_MULT,
  STAR_VIEW_DEPTH_MULT,
  STAR_VIEW_CAM_LERP,
  STAR_VIEW_TARGET_LERP,
} from "../constants";

export function applyStarViewCamera(ctx: CameraContext): void {
  const { camera, controls, vectors, starSphereRadiusWS } = ctx;
  const { targetCamPos, starTarget } = vectors;

  targetCamPos.set(
    0,
    starSphereRadiusWS * STAR_VIEW_HEIGHT_MULT,
    starSphereRadiusWS * STAR_VIEW_DEPTH_MULT,
  );

  camera.position.lerp(targetCamPos, STAR_VIEW_CAM_LERP);
  controls.target.lerp(starTarget, STAR_VIEW_TARGET_LERP);
}
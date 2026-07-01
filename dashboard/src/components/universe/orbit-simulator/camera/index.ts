/**
 * index.ts
 * src/components/universe/orbit-simulator/camera/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Public entry point for the camera module. Dispatches to the correct
 * view-mode strategy. Adding a 4th view mode later = one new strategy file
 * + one case here — useRenderLoop.ts never needs to change.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { CameraContext, ViewMode } from "../types";
import { applyPlanetViewCamera } from "./planetViewCamera";
import { applySystemViewCamera } from "./systemViewCamera";
import { applyStarViewCamera }   from "./starViewCamera";

export { createCameraVectorPool } from "./cameraVectors";

export function applyCameraStrategy(mode: ViewMode, ctx: CameraContext): void {
  switch (mode) {
    case "planet":
      applyPlanetViewCamera(ctx);
      break;
    case "system":
      applySystemViewCamera(ctx);
      break;
    case "star":
      applyStarViewCamera(ctx);
      break;
  }
}
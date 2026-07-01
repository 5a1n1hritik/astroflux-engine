/**
 * projectLabels.ts
 * src/components/universe/orbit-simulator/labels/projectLabels.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Projects tracked 3D mesh positions to 2D screen-space and updates each
 * label's CSS position every frame.
 *
 * FIX (overlapping labels — Kepler-90 system screenshot issue): when many
 * planets cluster near the star at small render scale, their screen-space
 * projections land within a few pixels of each other and text overlaps
 * illegibly. We track placed label rects this frame and nudge a label
 * downward in fixed increments if it collides with an already-placed one —
 * a simple greedy vertical-stack declutter, cheap enough for 8-12 labels
 * per frame with zero allocations (reuses a pre-sized array).
 *
 * SRP: pure positioning logic. No DOM creation (createLabelElement.ts),
 * no THREE scene mutation — only reads mesh.matrixWorld and writes
 * label.style.left/top/display.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from "three";
import type { TrackedPlanetMesh } from "../types";

const LABEL_OFFSET_X = 6;
const LABEL_OFFSET_Y = -4;
const COLLISION_Y_THRESHOLD = 14; // px — min vertical gap before we consider it a collision
const DECLUTTER_STEP_Y      = 13; // px — how far to nudge a colliding label down

interface PlacedRect {
  x: number;
  y: number;
}

/**
 * Updates every label's screen position for the current camera frame.
 * `screenPosVec` is a pre-allocated THREE.Vector3 from the camera vector
 * pool — reused here to avoid per-label allocation.
 */
export function projectLabels(
  planetMeshes: TrackedPlanetMesh[],
  labels: Map<string, HTMLDivElement>,
  camera: THREE.PerspectiveCamera,
  screenPosVec: THREE.Vector3,
  viewportWidth: number,
  viewportHeight: number,
): void {
  const placed: PlacedRect[] = [];

  for (const { name, mesh } of planetMeshes) {
    const label = labels.get(name);
    if (!label) continue;

    screenPosVec.setFromMatrixPosition(mesh.matrixWorld);
    screenPosVec.project(camera);

    // Behind camera — hide entirely
    if (screenPosVec.z > 1) {
      label.style.display = "none";
      continue;
    }

    label.style.display = "block";

    let x = (screenPosVec.x * 0.5 + 0.5) * viewportWidth + LABEL_OFFSET_X;
    let y = (1 - (screenPosVec.y * 0.5 + 0.5)) * viewportHeight + LABEL_OFFSET_Y;

    // ── Greedy declutter: nudge down if colliding with an already-placed label ──
    for (const rect of placed) {
      const dx = Math.abs(x - rect.x);
      const dy = Math.abs(y - rect.y);
      if (dx < 80 && dy < COLLISION_Y_THRESHOLD) {
        y = rect.y + DECLUTTER_STEP_Y;
      }
    }

    placed.push({ x, y });

    label.style.left = `${x}px`;
    label.style.top  = `${y}px`;
  }
}
"use client";

/**
 * usePlanetRaycaster.ts
 * src/components/universe/orbit-simulator/interaction/usePlanetRaycaster.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Click-to-select planet interaction. Casts a ray from the click point
 * through the camera, tests against tracked planet meshes (tagged with
 * userData.clickable in buildPlanet.ts), and fires onPlanetSelect with the
 * hit mesh's planetName.
 *
 * Designed to also work as the click target for the DOM labels built in
 * labels/index.ts — clicking a label re-dispatches a synthetic raycast
 * against that planet's mesh directly (no actual ray needed for label
 * clicks since we already know which planet was clicked).
 *
 * SRP: only owns the click listener + raycast logic. Camera/scene refs are
 * passed in, never created here. No React state — pure side-effect hook.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { TrackedPlanetMesh } from "../types";

export interface UsePlanetRaycasterParams {
  canvasEl:        HTMLCanvasElement | null;
  camera:          THREE.PerspectiveCamera | null;
  planetMeshesRef: React.RefObject<TrackedPlanetMesh[]>;
  onPlanetSelect?: (planetName: string) => void;
  /** Gate the listener — only active once scene is fully mounted */
  enabled: boolean;
}

export function usePlanetRaycaster({
  canvasEl,
  camera,
  planetMeshesRef,
  onPlanetSelect,
  enabled,
}: UsePlanetRaycasterParams): void {
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef     = useRef(new THREE.Vector2());

  useEffect(() => {
    if (!enabled || !canvasEl || !camera) return;

    const handleClick = (e: MouseEvent) => {
      const rect = canvasEl.getBoundingClientRect();
      mouseRef.current.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const meshes = planetMeshesRef.current?.map((p) => p.mesh) ?? [];
      const hits   = raycasterRef.current.intersectObjects(meshes, false);

      if (hits.length > 0) {
        const planetName = hits[0].object.userData.planetName as string | undefined;
        if (planetName) onPlanetSelect?.(planetName);
      }
    };

    canvasEl.addEventListener("click", handleClick);
    return () => canvasEl.removeEventListener("click", handleClick);
  }, [enabled, canvasEl, camera, planetMeshesRef, onPlanetSelect]);
}

/**
 * Direct selection helper for DOM label clicks — bypasses raycasting since
 * the label already identifies its planet unambiguously. Exported so
 * labels/index.ts (or the composing hook) can wire label click -> select
 * without duplicating the callback-invocation pattern.
 */
export function selectPlanetByName(
  planetName: string,
  onPlanetSelect?: (planetName: string) => void,
): void {
  onPlanetSelect?.(planetName);
}
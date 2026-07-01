"use client";

/**
 * useThreeScene.ts
 * src/components/universe/orbit-simulator/hooks/useThreeScene.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Owns the THREE.js mount lifecycle for a single scene instance:
 *   - Creates renderer, scene, camera, OrbitControls
 *   - Calls all scene/build* functions in the correct order
 *   - Tracks refs needed by useRenderLoop and usePlanetRaycaster
 *   - Handles resize observer
 *   - Cleans up completely on unmount (renderer dispose, label DOM teardown)
 *
 * Re-runs (full scene rebuild) only when systemData or isReady changes —
 * NOT on every viewMode/selectedPlanet change (those drive refs, not state).
 *
 * SRP: mount/unmount only. No per-frame logic here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { buildStarfield }      from "../scene/buildStarfield";
import { buildStar }           from "../scene/buildStar";
import type { StarBuildResult } from "../scene/buildStar";
import { buildHabitableZone }  from "../scene/buildHabitableZone";
import { buildOrbitPath }      from "../scene/buildOrbitPath";
import { buildPlanet }         from "../scene/buildPlanet";
import { buildLabels, destroyLabels } from "../labels";
import { createCameraVectorPool }     from "../camera";

import type {
  StarSystemNode,
  TrackedPlanetMesh,
  CameraVectorPool,
} from "../types";

import {
  AU_TO_WS,
  INITIAL_CAMERA_FOV,
  INITIAL_CAMERA_NEAR,
  INITIAL_CAMERA_FAR,
  SYSTEM_VIEW_HEIGHT_MULT,
  SYSTEM_VIEW_DEPTH_MULT,
} from "../constants";

export interface ThreeSceneRefs {
  sceneRef:         React.RefObject<THREE.Scene | null>;
  rendererRef:      React.RefObject<THREE.WebGLRenderer | null>;
  cameraRef:        React.RefObject<THREE.PerspectiveCamera | null>;
  controlsRef:      React.RefObject<OrbitControls | null>;
  planetMeshesRef:  React.RefObject<TrackedPlanetMesh[]>;
  labelsRef:        React.RefObject<Map<string, HTMLDivElement>>;
  starBuildRef:     React.RefObject<StarBuildResult | null>;
  vectorPoolRef:    React.RefObject<CameraVectorPool | null>;
  outerOrbitRadiusWSRef: React.RefObject<number>;
}

export function useThreeScene(
  mountRef: React.RefObject<HTMLDivElement | null>,
  systemData: StarSystemNode | null,
  planetSeed: number,
  showHabitableZone: boolean,
  isReady: boolean,
  onPlanetLabelClick: (name: string) => void,
): ThreeSceneRefs {

  const sceneRef         = useRef<THREE.Scene | null>(null);
  const rendererRef      = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef        = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef      = useRef<OrbitControls | null>(null);
  const planetMeshesRef  = useRef<TrackedPlanetMesh[]>([]);
  const labelsRef        = useRef<Map<string, HTMLDivElement>>(new Map());
  const starBuildRef     = useRef<StarBuildResult | null>(null);
  const vectorPoolRef    = useRef<CameraVectorPool | null>(null);
  const outerOrbitRadiusWSRef = useRef<number>(64);

  useEffect(() => {
    if (!mountRef.current || !systemData) return;

    const container = mountRef.current;
    const W = container.clientWidth  || window.innerWidth;
    const H = container.clientHeight || window.innerHeight;

    // ── Renderer ────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene ────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#020409");
    sceneRef.current = scene;

    // ── Camera ───────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
      INITIAL_CAMERA_FOV,
      W / H,
      INITIAL_CAMERA_NEAR,
      INITIAL_CAMERA_FAR,
    );

    // Compute outer orbit radius for initial camera placement
    const grid = systemData.simulation_grid ?? [];
    const maxAu = grid.length > 0
      ? Math.max(...grid.map((p) => p.semi_major_axis_au ?? 1))
      : 2;
    const outerR = maxAu * AU_TO_WS;
    outerOrbitRadiusWSRef.current = outerR;

    // Initial position — system view framing so all planets are visible
    camera.position.set(0, outerR * SYSTEM_VIEW_HEIGHT_MULT, outerR * SYSTEM_VIEW_DEPTH_MULT);
    cameraRef.current = camera;

    // ── OrbitControls ────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // ── Ambient light ────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight("#0d1a2e", 0.45));

    // ── Pre-allocate camera vector pool ──────────────────────────────────
    vectorPoolRef.current = createCameraVectorPool();

    // ── Background starfield ─────────────────────────────────────────────
    buildStarfield(scene);

    // ── Host star ────────────────────────────────────────────────────────
    const starBuild = buildStar(scene, systemData.star_parameters);
    starBuildRef.current = starBuild;

    // ── Habitable zone ───────────────────────────────────────────────────
    const hz = buildHabitableZone(scene, systemData.star_parameters.luminosity_log ?? 0.0);
    if (hz) hz.visible = showHabitableZone;

    // ── Orbit paths + planet meshes ──────────────────────────────────────
    planetMeshesRef.current = [];

    grid.forEach((planet, idx) => {
      buildOrbitPath(scene, {
        semiMajorAu:    planet.semi_major_axis_au,
        eccentricity:   planet.eccentricity,
        inclinationDeg: planet.inclination_degrees,
        planetIndex:    idx,
      });

      const mesh = buildPlanet(scene, planet, planetSeed);
      planetMeshesRef.current.push({ name: planet.planet_name, mesh });
    });

    // ── DOM labels ───────────────────────────────────────────────────────
    const starName = systemData.star_parameters.canonical_name ?? systemData.system_id;
    const labels   = buildLabels(container, grid, starName);

    // Wire label clicks -> planet selection callback
    for (const [name, el] of labels.entries()) {
      if (name === "__star__") continue;
      el.addEventListener("click", () => onPlanetLabelClick(name));
    }

    labelsRef.current = labels;

    // ── Resize handler ───────────────────────────────────────────────────
    const onResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // ── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      destroyLabels(labelsRef.current);
      sceneRef.current    = null;
      cameraRef.current   = null;
      rendererRef.current = null;
      controlsRef.current = null;
      starBuildRef.current = null;
      vectorPoolRef.current = null;
      planetMeshesRef.current = [];
    };
  }, [systemData, isReady, planetSeed]);

  // ── Habitable zone visibility toggle (no scene rebuild needed) ───────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const torus = scene.getObjectByName("habitableZone");
    if (torus) torus.visible = showHabitableZone;
  }, [showHabitableZone]);

  return {
    sceneRef,
    rendererRef,
    cameraRef,
    controlsRef,
    planetMeshesRef,
    labelsRef,
    starBuildRef,
    vectorPoolRef,
    outerOrbitRadiusWSRef,
  };
}
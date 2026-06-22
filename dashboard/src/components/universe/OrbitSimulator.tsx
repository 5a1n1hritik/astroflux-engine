"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useWasmOrbit } from "@/hooks/useWasmOrbit";
import {
  createStarCoreMaterial,
  createStarCoronaMaterial,
} from "./graphics/star/StarShaderMaterial";
import {
  createAtmosphereMaterial,
  createPlanetMaterial,
} from "../temp/planet/PlanetShaderMaterial";

const AU_TO_WS = 32.0; // Dynamic scale: 1 AU -> 32 WebGL Units to easily space out 8 planets

interface PlanetConfig {
  planet_name: string;
  classification_type: string;
  radius_earth: number;
  mass_earth: number;
  semi_major_axis_au: number;
  eccentricity: number;
  orbital_period_days: number;
  inclination_degrees: number;
  equilibrium_temperature_k: number;
  transit_depth_percent: number;
}

interface StarSystemNode {
  system_id: string;
  space_location: {
    distance_parsecs: number;
    distance_light_years: number;
    right_ascension_deg: number;
    declination_deg: number;
    unit_sky_vector: { x: number; y: number; z: number };
    total_planets_in_system: number;
  };
  star_parameters: {
    canonical_name: string;
    spectral_type: string;
    mass_solar: number;
    radius_solar: number;
    temperature_kelvin: number;
    rotation_period_days: number;
    luminosity_log: number;
  };
  simulation_grid: PlanetConfig[];
}

interface OrbitSimulatorProps {
  systemData: StarSystemNode;
  currentFrameTime: number;
  planetSeed: number;
  onFrameUpdate: (phaseAngle: number) => void;
}

export default function OrbitSimulator({
  systemData,
  currentFrameTime,
  planetSeed,
  onFrameUpdate,
}: OrbitSimulatorProps) {
  const simulationGrid = systemData?.simulation_grid || [];
  const starParams = systemData?.star_parameters || {};
  const spaceLoc = systemData?.space_location || {};

  // Mount the singleton batch-processed WebAssembly memory bridge hook
  const { engine: wasmEngine, isReady } = useWasmOrbit({
    system_id: systemData?.system_id || "Unknown",
  });

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rafRef = useRef<number>(0);

  const starMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const coronaMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const pointLightRef = useRef<THREE.PointLight | null>(null);

  // Reference track list array to map all recursive planet objects
  const planetMeshesRef = useRef<{ name: string; mesh: THREE.Mesh }[]>([]);

  const wasmRef = useRef(wasmEngine);
  const timeRef = useRef(currentFrameTime);
  const callbackRef = useRef(onFrameUpdate);

  wasmRef.current = wasmEngine;
  timeRef.current = currentFrameTime;
  callbackRef.current = onFrameUpdate;

  // ── ONE-TIME CANVAS VIEWPORT GL SCENE CONSTRUCTION ──────────────────────────
  useEffect(() => {
    if (!mountRef.current || !systemData) return;

    const container = mountRef.current;
    const W = container.clientWidth || window.innerWidth;
    const H = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#020409");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 1200);
    camera.position.set(0, 60, 110); // Elevated viewport standard to survey the entire flat disk plane
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    const ambient = new THREE.AmbientLight("#0d1a2e", 0.45);
    scene.add(ambient);

    // Deep space stellar dust starfields
    buildStarfield(scene, 2500, 0.025, 150, 0.6);
    buildStarfield(scene, 800, 0.045, 80, 0.8);

    // Setup host star core thermodynamic color parameters
    const starTemperature = starParams.temperature_kelvin ?? 5778;
    const starRadius = starParams.radius_solar ?? 1.0;

    const starPreset = {
      core:
        starTemperature < 3700
          ? "#ff5522"
          : starTemperature > 8000
            ? "#e8f4ff"
            : "#fffef0",
      limb:
        starTemperature < 3700
          ? "#cc1100"
          : starTemperature > 8000
            ? "#80c0ff"
            : "#ffd060",
      corona:
        starTemperature < 3700
          ? "#ff3333"
          : starTemperature > 8000
            ? "#0066ff"
            : "#ffb830",
      temperature: starTemperature,
    };

    const pointLight = new THREE.PointLight("#ffdf90", 4.0, 300, 0.5);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);
    pointLightRef.current = pointLight;

    const sphereR = Math.max(1.2, starRadius * 1.2);
    const coreGeo = new THREE.SphereGeometry(sphereR, 64, 64);
    const coreMat = createStarCoreMaterial(starPreset);
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.name = "starCore";
    scene.add(coreMesh);
    starMatRef.current = coreMat;

    const coronaSize = sphereR * 7.5;
    const coronaGeo = new THREE.PlaneGeometry(coronaSize, coronaSize);
    const coronaMat = createStarCoronaMaterial(starPreset);
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    coronaMesh.name = "starCorona";
    scene.add(coronaMesh);
    coronaMatRef.current = coronaMat;

    buildHabitableZone(scene, starParams.luminosity_log ?? 0.0);

    // Clear tracked meshes mapping node before population
    planetMeshesRef.current = [];

    // ── 🪐 SEQUENTIAL RECURSIVE MULTI-BODY SEEDING ────────────────────────────
    simulationGrid.forEach((planet: PlanetConfig) => {
      buildOrbitPath(
        scene,
        planet.semi_major_axis_au,
        planet.eccentricity,
        planet.inclination_degrees,
      );

      const eqTemp = planet.equilibrium_temperature_k ?? 250.0;
      const planetRad = planet.radius_earth || 1.0;
      const planetMass = planet.mass_earth ?? 1.0;

      const planetGeo = new THREE.SphereGeometry(
        Math.max(0.15, planetRad * 0.12),
        48,
        48,
      );

      let basePlanetHex = "#8b6344";
      let baseAtmoHex = "#3a8cf5";

      if (planetMass > 10.0) {
        basePlanetHex = "#c8a96e";
        baseAtmoHex = "#22d3ee";
      } else if (eqTemp > 450.0) {
        basePlanetHex = "#1a0800";
        baseAtmoHex = "#ef4444";
      } else if (eqTemp < 180.0) {
        basePlanetHex = "#cce8ff";
        baseAtmoHex = "#a78bfa";
      }

      const planetMat = createPlanetMaterial(
        eqTemp,
        planetRad,
        basePlanetHex,
        planetSeed,
        planetMass,
      );
      const planetMesh = new THREE.Mesh(planetGeo, planetMat);
      planetMesh.name = `planet_${planet.planet_name}`;
      scene.add(planetMesh);

      const atmoGeo = new THREE.SphereGeometry(
        Math.max(0.15, planetRad * 0.12) * 1.15,
        48,
        48,
      );
      const atmoMat = createAtmosphereMaterial(baseAtmoHex);
      const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
      planetMesh.add(atmoMesh);

      const glowSprite = buildPlanetGlow();
      planetMesh.add(glowSprite);

      planetMeshesRef.current.push({
        name: planet.planet_name,
        mesh: planetMesh,
      });
    });

    const onResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = container.clientWidth / container.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(
        container.clientWidth,
        container.clientHeight,
      );
    };
    window.addEventListener("resize", onResize);

    startRenderLoop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, [systemData, isReady]);

  // ── RENDER TICK TIMER AND QUANTUM BATCH EXTRACTION ─────────────────────────
  function startRenderLoop() {
    const clock = new THREE.Clock();

    function tick() {
      rafRef.current = requestAnimationFrame(tick);
      const elapsed = clock.getElapsedTime();

      const scene = sceneRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      const controls = controlsRef.current;

      if (!scene || !renderer || !camera) return;

      controls?.update();
      if (starMatRef.current) starMatRef.current.uniforms.uTime.value = elapsed;
      if (coronaMatRef.current)
        coronaMatRef.current.uniforms.uTime.value = elapsed;

      const coronaMeshObj = scene.getObjectByName("starCorona") as
        | THREE.Mesh
        | undefined;
      if (coronaMeshObj) coronaMeshObj.quaternion.copy(camera.quaternion);

      // ── HIGH SPEED MULTI-BODY WASM COMPUTATION LOOP SWEEP ──────────────────
      const wasm = wasmRef.current;
      if (wasm && isReady) {
        const systemBatchRequest = {
          system_id: systemData.system_id,
          simulation_time_days: timeRef.current,
          star_mass_solar: starParams.mass_solar ?? 1.0,
          star_rotation_days: starParams.rotation_period_days ?? 25.0,
          system_distance_pc: spaceLoc.distance_parsecs ?? 10.0,
          planets: simulationGrid,
        };

        const solvedSystemFrame =
          wasm.compute_system_orbital_frame(systemBatchRequest);

        if (solvedSystemFrame && solvedSystemFrame.simulation_grid) {
          // Sync live solar core corona rotation metrics dynamically
          const coreMeshObj = scene.getObjectByName("starCore") as
            | THREE.Mesh
            | undefined;
          if (coreMeshObj) {
            coreMeshObj.rotation.y = solvedSystemFrame.star_rotation_angle_rad;
          }

          solvedSystemFrame.simulation_grid.forEach((solvedPlanet: any) => {
            const meshNode = planetMeshesRef.current.find(
              (m) => m.name === solvedPlanet.planet_name,
            );
            if (meshNode) {
              meshNode.mesh.position.set(
                solvedPlanet.position_x * AU_TO_WS,
                solvedPlanet.position_z * AU_TO_WS, // Structural matrix vector alignments
                solvedPlanet.position_y * AU_TO_WS,
              );

              // Inject planet rotation and material uTime metrics safely
              meshNode.mesh.rotation.y += 0.01;
              const mat = meshNode.mesh.material as THREE.ShaderMaterial;
              if (mat && mat.uniforms && mat.uniforms.uTime) {
                mat.uniforms.uTime.value = elapsed;
              }
            }
          });

          if (solvedSystemFrame.simulation_grid.length > 0) {
            callbackRef.current(
              solvedSystemFrame.simulation_grid[0].phase_angle,
            );
          }
        }
      }
      renderer.render(scene, camera);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  return <div ref={mountRef} className="w-full h-full display-block" />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKGROUND & MATHEMATICAL PATH RENDER HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildStarfield(
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

function buildOrbitPath(
  scene: THREE.Scene,
  semiMajorAu: number,
  eccentricity: number,
  inclinationDeg: number,
): void {
  const a = semiMajorAu * AU_TO_WS;
  const b = a * Math.sqrt(1 - eccentricity ** 2);
  const c = a * eccentricity;
  const inclinationRad = (inclinationDeg * Math.PI) / 180;

  const SEGMENTS = 360;
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= SEGMENTS; i++) {
    const theta = (i / SEGMENTS) * Math.PI * 2;
    const x_raw = a * Math.cos(theta) - c;
    const y_raw = b * Math.sin(theta);

    points.push(
      new THREE.Vector3(
        x_raw,
        y_raw * Math.cos(inclinationRad),
        y_raw * Math.sin(inclinationRad),
      ),
    );
  }

  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineDashedMaterial({
    color: "#1e6080",
    dashSize: 0.3,
    gapSize: 0.2,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const line = new THREE.LineLoop(geo, mat);
  line.computeLineDistances();
  scene.add(line);
}

function buildPlanetGlow(): THREE.Sprite {
  const SIZE = 128;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(
    SIZE / 2,
    SIZE / 2,
    0,
    SIZE / 2,
    SIZE / 2,
    SIZE / 2,
  );
  gradient.addColorStop(0.0, "rgba(80, 140, 255, 0.45)");
  gradient.addColorStop(0.3, "rgba(50, 100, 220, 0.15)");
  gradient.addColorStop(1.0, "rgba(0,0,0,0.0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: 0.7,
    }),
  );
}

function buildHabitableZone(scene: THREE.Scene, lumLog: number): void {
  const L = Math.pow(10, lumLog);
  const innerAU = Math.sqrt(L / 1.1) * AU_TO_WS;
  const outerAU = Math.sqrt(L / 0.53) * AU_TO_WS;
  const midAU = (innerAU + outerAU) / 2;
  const tubeR = Math.min((outerAU - innerAU) / 2, 0.6);

  if (tubeR <= 0 || midAU <= 0 || midAU > 400) return;

  const geo = new THREE.TorusGeometry(midAU, tubeR, 2, 128);
  const mat = new THREE.MeshBasicMaterial({
    color: "#00ff88",
    transparent: true,
    opacity: 0.012,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const torus = new THREE.Mesh(geo, mat);
  torus.rotation.x = Math.PI / 2;
  scene.add(torus);
}

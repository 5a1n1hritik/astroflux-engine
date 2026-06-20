"use client";

/**
 * OrbitSimulator.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen Three.js WebGL scene mounted into #canvas-root.
 * Fully optimized for 3D Rust WASM state telemetry mapping and dynamic spectral colors.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useWasmOrbit, type OrbitalConfig } from "@/hooks/useWasmOrbit";
import {
  createStarCoreMaterial,
  createStarCoronaMaterial,
} from "./graphics/star/StarShaderMaterial";
import { createAtmosphereMaterial, createPlanetMaterial } from "../temp/planet/PlanetShaderMaterial";

// ── 1. EMBEDDED HIGH-PRECISION ASTRO TIMER ────────────────────────────────────
class CoreAstroTimer {
  private _previousTime: number = 0;
  private _currentTime: number = 0;
  private _startTime: number = performance.now();
  private _delta: number = 0;
  private _elapsed: number = 0;
  private _timescale: number = 1;

  constructor() {
    this.reset();
  }
  getDelta(): number {
    return this._delta / 1000;
  }
  getElapsed(): number {
    return this._elapsed / 1000;
  }
  reset(): this {
    this._currentTime = performance.now() - this._startTime;
    return this;
  }
  update(timestamp?: number): this {
    this._previousTime = this._currentTime;
    this._currentTime =
      (timestamp !== undefined ? timestamp : performance.now()) -
      this._startTime;
    this._delta = (this._currentTime - this._previousTime) * this._timescale;
    this._elapsed += this._delta;
    return this;
  }
}

const AU_TO_WS = 3.2; // Scaling factor: 1 AU → 3.2 WebGL Space Units

// ── Props Structure Aligned with the 20-Keys Hydration API ────────────────────
interface OrbitSimulatorProps {
  systemData: any; // Complete remote node payload containing metadata matrices
  currentFrameTime: number; // Monotonically increasing days clock ticker
  planetSeed: number;
  onFrameUpdate: (phaseAngle: number) => void;
}

export default function OrbitSimulator({
  systemData,
  currentFrameTime,
  planetSeed,
  onFrameUpdate,
}: OrbitSimulatorProps) {
  // ── WASM Hook Properties Extraction Guardrail ───────────────────────────────
  const orbitalConfig: OrbitalConfig = {
    star_mass: systemData?.metadata?.star_mass ?? 1.0,
    star_radius: systemData?.metadata?.star_radius ?? 1.0,
    orbital_period_days: systemData?.metadata?.orbital_period ?? 365.25,
    semi_major_axis_au: systemData?.metadata?.semi_major_axis ?? 1.0,
    eccentricity: systemData?.metadata?.eccentricity ?? 0.0,
    orbital_inclination_deg: systemData?.metadata?.orbital_inclination ?? 0.0, // New 3D vector axis tilt
  };

  const { engine: wasmEngine, isReady } = useWasmOrbit(orbitalConfig);

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const timerRef = useRef<CoreAstroTimer>(new CoreAstroTimer());
  const rafRef = useRef<number>(0);

  const starMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const coronaMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const planetRef = useRef<THREE.Mesh | null>(null);
  const planetMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const pointLightRef = useRef<THREE.PointLight | null>(null);

  const wasmRef = useRef(wasmEngine);
  const configRef = useRef(orbitalConfig);
  const timeRef = useRef(currentFrameTime);
  const callbackRef = useRef(onFrameUpdate);

  // Sync refs inside animation closure layers to eliminate stale render trees
  wasmRef.current = wasmEngine;
  configRef.current = orbitalConfig;
  timeRef.current = currentFrameTime;
  callbackRef.current = onFrameUpdate;

  // ── ONE-TIME CANVAS VIEWPORT GL SCENE CONSTRUCTION ──────────────────────────
  useEffect(() => {
    if (!mountRef.current || !systemData) return;

    const container = mountRef.current;
    const W = container.clientWidth || window.innerWidth;
    const H = container.clientHeight || window.innerHeight;

    // 1. WebGL Initialization Node
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
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

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.01, 500);
    camera.position.set(0, 5.5, 7.0);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controlsRef.current = controls;

    // 2. Physics Lighting Grid
    const ambient = new THREE.AmbientLight("#0d1a2e", 0.35);
    scene.add(ambient);

    // 3. Environment Particle Starfields
    buildStarfield(scene, 2200, 0.022, 80, 0.55);
    buildStarfield(scene, 600, 0.042, 40, 0.8);

    // =========================================================
    // new code
    // =========================================================
    const starTemperature = systemData.metadata.star_temperature ?? 5778;
    const starRadius = systemData.metadata.star_radius ?? 1.0;

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

    const pointLight = new THREE.PointLight("#ffdf90", 4.0, 30);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);
    pointLightRef.current = pointLight;

    // Core sphere
    const sphereR = Math.max(0.8, starRadius * 0.85);
    const coreGeo = new THREE.SphereGeometry(sphereR, 64, 64);
    const coreMat = createStarCoreMaterial(starPreset);
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);

    coreMesh.name = "starCore";
    scene.add(coreMesh);
    starMatRef.current = coreMat; // reuse existing ref

    // Corona billboard
    const coronaSize = sphereR * 6.5;
    const coronaGeo = new THREE.PlaneGeometry(coronaSize, coronaSize);
    const coronaMat = createStarCoronaMaterial(starPreset);
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);

    coronaMesh.name = "starCorona";
    scene.add(coronaMesh);
    coronaMatRef.current = coronaMat;

    // 5. 3D Oriented Analytical Orbit Path Wireframe Guide
    buildOrbitPath(
      scene,
      configRef.current.semi_major_axis_au,
      configRef.current.eccentricity,
      configRef.current.orbital_inclination_deg,
    );

    buildHabitableZone(scene, systemData.metadata.star_luminosity ?? 0.0);

    // ========================================================
    // new code of planet
    // ========================================================

    // 6. Terrestrial Planet Mesh Allocation
    const eqTemp = systemData.metadata.equilibrium_temperature ?? 250.0;
    const planetRad = systemData.metadata.planet_radius || 1.0;
    const planetMass = systemData.metadata.planet_mass ?? 1.0;
    const planetGeo = new THREE.SphereGeometry(
      Math.max(0.08, planetRad * 0.05),
      48,
      48,
    );

    // Dynamic Surface Color Shifting base calculation logic
    let basePlanetHex = "#8b6344"; // Default rocky grey
    let baseAtmoHex = "#3a8cf5";   // Default nitrogen scattering blue

    if (planetMass > 10.0) { 
      basePlanetHex = "#c8a96e"; // Jovian Gas Giant color
      baseAtmoHex = "#22d3ee";   // Thick methane wrap cyan
    } else if (eqTemp > 450.0) {
      basePlanetHex = "#1a0800"; // Lava crust dark base
      baseAtmoHex = "#ef4444";   // Volatile red sulfuric halo
    } else if (eqTemp < 180.0) {
      basePlanetHex = "#cce8ff"; // Ice world white sheen
      baseAtmoHex = "#a78bfa";   // Cold purple scattering haze
    }
    const planetMat = createPlanetMaterial(eqTemp, planetRad, basePlanetHex, planetSeed, // Passing seed seamlessly down to GLSL memory buffers
      systemData.metadata.planet_mass ?? 1.0
    );
    const planet = new THREE.Mesh(planetGeo, planetMat);
    scene.add(planet);
    planetRef.current = planet;
    planetMatRef.current = planetMat;

    const atmoColorHex = starTemperature < 3700 ? "#ff4400" : "#3a8cf5";
    const atmoGeo = new THREE.SphereGeometry(
      Math.max(0.08, planetRad * 0.05) * 1.15,
      48,
      48,
    );
    const atmoMat = createAtmosphereMaterial(baseAtmoHex);
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    planet.add(atmoMesh); // child of planet - moves with it seamlessly

    const glowSprite = buildPlanetGlow();
    planet.add(glowSprite);

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

    // Engage Render Loop Frame Controller
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

  // ── RENDER TICK LOGIC ───────────────────────────────────────────────────────
  function startRenderLoop() {
    const timer = timerRef.current;

    function tick(timestamp: number) {
      rafRef.current = requestAnimationFrame(tick);
      timer.update(timestamp);
      const elapsed = timer.getElapsed();

      const scene = sceneRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      const planet = planetRef.current;
      // const starMat = starMatRef.current;

      if (!scene || !renderer || !camera || !planet) return;

      controls?.update();
      if (starMatRef.current) starMatRef.current.uniforms.uTime.value = elapsed;

      if (coronaMatRef.current)
        coronaMatRef.current.uniforms.uTime.value = elapsed;

      const coronaMeshObj = scene.getObjectByName("starCorona") as
        | THREE.Mesh
        | undefined;

      if (coronaMeshObj) coronaMeshObj.quaternion.copy(camera.quaternion);

      const coreMeshObj = scene.getObjectByName("starCore") as
        | THREE.Mesh
        | undefined;

      if (coreMeshObj) coreMeshObj.rotation.y = elapsed * 0.05;
      
      // if (planetMatRef.current)
      //   planetMatRef.current.uniforms.uTime.value = elapsed;
      

      // WASM Quantum Compute Interface tracking exact 3D vector slots
      const wasm = wasmRef.current;
      if (wasm && isReady) {
        const frame = wasm.computeFrame(configRef.current, timeRef.current);
        if (frame) {
          // Direct 1:1 injection of 3D spatial values calculated inside the Rust stack
          planet.position.set(
            frame.position_x * AU_TO_WS,
            frame.position_y * AU_TO_WS,
            frame.position_z * AU_TO_WS,
          );

          planet.rotation.y += 0.008;

          if (pointLightRef.current) {
            pointLightRef.current.position.lerp(
              new THREE.Vector3(
                planet.position.x * 0.05,
                0.1,
                planet.position.z * 0.05,
              ),
              0.02,
            );
          }

          callbackRef.current(frame.current_phase_angle);
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
  const inclinationRad = (inclinationDeg * Math.PI) / 180; // Degrees to radians transform

  const SEGMENTS = 360;
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= SEGMENTS; i++) {
    const theta = (i / SEGMENTS) * Math.PI * 2;
    const x_raw = a * Math.cos(theta) - c;
    const y_raw = b * Math.sin(theta);

    // Aligned rotation projection calculation vectors tracking matching Rust lib.rs math structures
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
    dashSize: 0.12,
    gapSize: 0.06,
    transparent: true,
    opacity: 0.55,
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
  gradient.addColorStop(0.0, "rgba(80, 140, 255, 0.55)");
  gradient.addColorStop(0.3, "rgba(50, 100, 220, 0.20)");
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
      opacity: 0.8,
    }),
  );
}

// ── Planet Material — temperature + mass driven ────────────────────────────
function buildPlanetMaterial(
  massSolar: number,
  eqTemp: number,
): THREE.MeshStandardMaterial {
  // Gas giant threshold: > 10 Earth masses
  const isGasGiant = massSolar > 10;

  if (isGasGiant) {
    // Gas giant — banded stripes, blue-beige
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#c8a96e"),
      roughness: 0.4,
      metalness: 0.1,
      emissive: new THREE.Color("#3a2800"),
      emissiveIntensity: 0.15,
    });
  }

  // Rocky planet — temperature-based color
  if (eqTemp > 700) {
    // Lava world — dark with red glow
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1a0800"),
      roughness: 0.9,
      metalness: 0.0,
      emissive: new THREE.Color("#ff2200"),
      emissiveIntensity: 0.4,
    });
  } else if (eqTemp > 350) {
    // Hot rocky — brown-grey
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#8b6344"),
      roughness: 0.85,
      metalness: 0.05,
      emissive: new THREE.Color("#220800"),
      emissiveIntensity: 0.1,
    });
  } else if (eqTemp > 200 && eqTemp < 320) {
    // Habitable zone — blue-green (Earth-like)
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#3a6fd8"),
      roughness: 0.75,
      metalness: 0.05,
      emissive: new THREE.Color("#0a1a40"),
      emissiveIntensity: 0.2,
    });
  } else {
    // Ice world — white-blue
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#cce8ff"),
      roughness: 0.6,
      metalness: 0.1,
      emissive: new THREE.Color("#001833"),
      emissiveIntensity: 0.08,
    });
  }
}

// ── Habitable Zone Torus — st_lum driven ─────────────────────────────────────
function buildHabitableZone(scene: THREE.Scene, lumLog: number): void {
  // L = 10^lumLog (solar luminosities)
  const L = Math.pow(10, lumLog);

  // Conservative habitable zone boundaries (Kopparapu 2013)
  const innerAU = Math.sqrt(L / 1.1) * AU_TO_WS;
  const outerAU = Math.sqrt(L / 0.53) * AU_TO_WS;
  const midAU = (innerAU + outerAU) / 2;
  const tubeR = Math.min((outerAU - innerAU) / 2, 0.18); // cap tube thickness

  if (tubeR <= 0 || midAU <= 0 || midAU > 25) return; // guard: skip if out of range

  // Solid fill — very subtle
  const geo = new THREE.TorusGeometry(midAU, tubeR, 2, 128);
  const mat = new THREE.MeshBasicMaterial({
    color: "#00ff88",
    transparent: true,
    opacity: 0.025, // ← was 0.06, much more subtle now
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const torus = new THREE.Mesh(geo, mat);
  torus.rotation.x = Math.PI / 2;
  torus.name = "habitableZone";
  scene.add(torus);

  // Inner edge ring only — clean line
  const innerRingGeo = new THREE.TorusGeometry(innerAU, 0.015, 2, 128);
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: "#00ff88",
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  innerRing.rotation.x = Math.PI / 2;
  scene.add(innerRing);

  // Outer edge ring
  const outerRingGeo = new THREE.TorusGeometry(outerAU, 0.015, 2, 128);
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: "#00ff88",
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
  });
  const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
  outerRing.rotation.x = Math.PI / 2;
  scene.add(outerRing);
}

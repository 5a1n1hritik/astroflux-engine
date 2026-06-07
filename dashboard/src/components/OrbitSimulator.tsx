"use client";

/**
 * OrbitSimulator.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen Three.js WebGL scene mounted into #canvas-root.
 *
 * Scene hierarchy:
 *   Scene
 *   ├── Starfield         (BufferGeometry Points — 2000 procedural stars)
 *   ├── StarBillboard     (PlaneGeometry + custom GLSL ShaderMaterial)
 *   ├── OrbitLine         (EllipseCurve → TubeGeometry — antialiased path)
 *   ├── Planet            (SphereGeometry + MeshStandardMaterial)
 *   │   └── PlanetGlow    (Sprite + SpriteMaterial — soft halo)
 *   └── Lights            (AmbientLight + PointLight from star position)
 *
 * Render loop architecture:
 *   requestAnimationFrame drives everything. Each tick:
 *     1. clock.getDelta() → accumulate elapsed time
 *     2. wasmEngine.computeFrame(config, elapsed) → { position_x, position_y, phase }
 *     3. planet.position.set(x, 0, y)  (WASM X maps to Three.js X; WASM Y → Z)
 *     4. starMaterial.uTime → elapsed  (drives corona flicker)
 *     5. renderer.render(scene, camera)
 *     6. onFrameUpdate(phase) → syncs FluxChart cursor
 *
 * Camera:
 *   OrbitControls (from three/addons) — damped, no pan, polar angle locked
 *   so the researcher view stays in an elevated observational position.
 *   Smooth interpolation via dampingFactor: 0.07.
 *
 * Z-index: The renderer canvas is appended to #canvas-root (z-index: 0).
 *   The HUD overlays from Step 1 (z-index: 10) remain fully above it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useWasmOrbit, type OrbitalConfig } from "@/hooks/useWasmOrbit";
import { createStarMaterial, updateStarTime } from "@/components/StarMaterial";

// ── 1. EMBEDDED HIGH-PRECISION TIMER IMPLEMENTATION ───────────────────────────
// Directly inline to bypass Node/TypeScript module path mapping compiler limitations
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
    this._currentTime = (timestamp !== undefined ? timestamp : performance.now()) - this._startTime;
    this._delta = (this._currentTime - this._previousTime) * this._timescale;
    this._elapsed += this._delta;
    return this;
  }
}

// ── Scale constants ───────────────────────────────────────────────────────────
// 1 AU → N Three.js world-space units.
// Tuned so the orbit fills ~60% of the viewport at the default camera position.
const AU_TO_WS = 3.2;

// ── Props ─────────────────────────────────────────────────────────────────────
interface OrbitSimulatorProps {
  targetMetadata: {
    star_mass_solar:     number;
    star_radius_solar:   number;
    orbital_period_days: number;
    semi_major_axis_au:  number;
    eccentricity:        number;
  };
  currentFrameTime: number;          // monotonically increasing time in days (from page.tsx)
  onFrameUpdate:    (phaseAngle: number) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function OrbitSimulator({
  targetMetadata,
  currentFrameTime,
  onFrameUpdate,
}: OrbitSimulatorProps) {

  // ── WASM Bridge ─────────────────────────────────────────────────────────────
  const orbitalConfig: OrbitalConfig = {
    star_mass_solar:     targetMetadata.star_mass_solar,
    star_radius_solar:   targetMetadata.star_radius_solar,
    orbital_period_days: targetMetadata.orbital_period_days,
    semi_major_axis_au:  targetMetadata.semi_major_axis_au,
    eccentricity:        targetMetadata.eccentricity,
  };
  const { engine: wasmEngine, isReady } = useWasmOrbit(orbitalConfig);

  // ── DOM ref — mounts into #canvas-root, preserving Step 1 z-index stack ────
  const mountRef = useRef<HTMLDivElement>(null);

  // ── Scene object refs (survive re-renders without triggering effects) ────────
  const sceneRef    = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  // const clockRef    = useRef<THREE.Clock>(new THREE.Clock());
  const timerRef    = useRef<CoreAstroTimer>(new CoreAstroTimer()); // <-- Safe Embedded Class
  const rafRef      = useRef<number>(0);

  // Live mutable refs — updated each render so the rAF closure sees current values
  const planetRef    = useRef<THREE.Mesh | null>(null);
  const starMatRef   = useRef<THREE.ShaderMaterial | null>(null);
  const pointLightRef= useRef<THREE.PointLight | null>(null);

  // Props refs — avoids stale closure captures in the rAF loop
  const wasmRef      = useRef(wasmEngine);
  const configRef    = useRef(orbitalConfig);
  const timeRef      = useRef(currentFrameTime);
  const callbackRef  = useRef(onFrameUpdate);

  // Sync all mutable refs on every render
  wasmRef.current     = wasmEngine;
  configRef.current   = orbitalConfig;
  timeRef.current     = currentFrameTime;
  callbackRef.current = onFrameUpdate;

  // ── ONE-TIME SCENE CONSTRUCTION ─────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const W = container.clientWidth  || window.innerWidth;
    const H = container.clientHeight || window.innerHeight;

    // ── 1. Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias:  true,
      alpha:      false,           // Opaque canvas — void background from CSS
      powerPreference: "high-performance",
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── 2. Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#020409"); // --color-void
    sceneRef.current = scene;

    // ── 3. Camera ─────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.01, 500);
    // Elevated observational position: angled top-down, ~45° pitch
    camera.position.set(0, 5.5, 7.0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // ── 4. OrbitControls — damped, scientific observer mode ──────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping    = true;
    controls.dampingFactor    = 0.07;
    controls.enablePan        = false;           // No panning — keep star centered
    controls.minDistance      = 3.0;
    controls.maxDistance      = 18.0;
    controls.minPolarAngle    = Math.PI * 0.10;  // Can't go fully top-down
    controls.maxPolarAngle    = Math.PI * 0.55;  // Can't go below the orbital plane
    controls.autoRotate       = false;
    controlsRef.current = controls;

    // ── 5. Ambient + fill lights ──────────────────────────────────────────────
    const ambient = new THREE.AmbientLight("#0d1a2e", 0.35); // Deep space fill
    scene.add(ambient);

    // Point light positioned at the star — illuminates the planet realistically
    const pointLight = new THREE.PointLight("#ffdf90", 4.0, 30);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);
    pointLightRef.current = pointLight;

    // ── 6. Procedural Starfield ───────────────────────────────────────────────
    // Two layers at different depths and sizes give parallax depth perception
    buildStarfield(scene, 2200, 0.022, 80,  0.55); // Background layer
    buildStarfield(scene,  600, 0.042, 40,  0.80); // Foreground bright stars

    // ── 7. Host Star — billboard quad with GLSL corona shader ─────────────────
    // PlaneGeometry facing the camera (manually billboard in rAF loop)
    const starQuadSize = Math.max(2.0, targetMetadata.star_radius_solar * 1.4);
    const starGeo = new THREE.PlaneGeometry(starQuadSize, starQuadSize);
    const starMat = createStarMaterial({
      coreRadius:     0.09,
      corona1Falloff: 16,
      corona2Falloff: 4.5,
      intensity:      1.3,
    });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    starMesh.name = "starBillboard";   // ← Referenced in rAF loop for billboarding
    starMesh.position.set(0, 0, 0);
    scene.add(starMesh);
    starMatRef.current = starMat;

    // ── 8. Orbit Path — EllipseCurve → tube ──────────────────────────────────
    buildOrbitPath(scene, targetMetadata.semi_major_axis_au, targetMetadata.eccentricity);

    // ── 9. Planet mesh ────────────────────────────────────────────────────────
    const planetGeo = new THREE.SphereGeometry(0.10, 48, 48);
    const planetMat = new THREE.MeshStandardMaterial({
      color:     "#3a6fd8",   // Blue-grey — generic terrestrial profile
      roughness: 0.75,
      metalness: 0.05,
      emissive:  new THREE.Color("#0a1a40"),
      emissiveIntensity: 0.25,
    });
    const planet = new THREE.Mesh(planetGeo, planetMat);
    planet.castShadow    = true;
    planet.receiveShadow = false;
    scene.add(planet);
    planetRef.current = planet;

    // Planet atmospheric glow sprite (cheap, effective)
    const glowSprite = buildPlanetGlow();
    planet.add(glowSprite); // child of planet — moves with it automatically

    // ── 10. Resize handler ────────────────────────────────────────────────────
    const onResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // ── 11. Start render loop ─────────────────────────────────────────────────
    startRenderLoop();

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current    = null;
      rendererRef.current = null;
      cameraRef.current   = null;
      controlsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Strict: scene is built once. Props are read via refs inside the rAF loop.

  // ── Billboard effect: keep star quad facing the camera ──────────────────────
  // This runs in the render loop (see startRenderLoop) via ref access.
  // Not a separate effect — we avoid adding/removing rAF callbacks.

  // ── RENDER LOOP ─────────────────────────────────────────────────────────────
  function startRenderLoop() {
    // const clock = clockRef.current;
    // clock.start();
    const timer = timerRef.current;

    function tick(timestamp: number) {
      rafRef.current = requestAnimationFrame(tick);

      // Core deterministic timestamp updates
      timer.update(timestamp);

      // const elapsed = clock.getElapsedTime(); // seconds
      const elapsed = timer.getElapsed();

      const scene    = sceneRef.current;
      const renderer = rendererRef.current;
      const camera   = cameraRef.current;
      const controls = controlsRef.current;
      const planet   = planetRef.current;
      const starMat  = starMatRef.current;

      if (!scene || !renderer || !camera || !planet) return;

      // ── A. Update OrbitControls damping ─────────────────────────────────────
      controls?.update();

      // ── B. Update star corona time uniform (drives flicker) ─────────────────
      if (starMat) updateStarTime(starMat, elapsed);

      // ── C. Billboard: rotate star quad to face camera ────────────────────────
      // Find the star mesh by name set at construction
      const starMesh = scene.getObjectByName("starBillboard") as THREE.Mesh | undefined;
      if (starMesh) starMesh.quaternion.copy(camera.quaternion);

      // ── D. WASM frame compute → planet position ──────────────────────────────
      const wasm   = wasmRef.current;
      const config = configRef.current;
      const t      = timeRef.current;

      if (wasm) {
        const frame = wasm.computeFrame(config, t);
        if (frame) {
          // WASM returns orbital-plane X, Y (2D ecliptic).
          // Map to Three.js: X stays X; Y maps to Z (flat plane).
          // Scale from AU to world-space units.
          planet.position.set(
            frame.position_x * AU_TO_WS,
            0,
            frame.position_y * AU_TO_WS,
          );

          // Axial self-rotation — slow, scientific
          planet.rotation.y += 0.008;

          // Move point light slightly toward planet for sub-stellar highlights
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

          // ── E. Sync FluxChart cursor ─────────────────────────────────────────
          callbackRef.current(frame.current_phase_angle);
        }
      }

      // ── F. Render ────────────────────────────────────────────────────────────
      renderer.render(scene, camera);
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  // The outer div fills #canvas-root entirely (position:fixed, inset:0 from CSS).
  // This component's div is the mount point — it must be full-bleed.
  return (
    <div
      ref={mountRef}
      style={{ width: "100%", height: "100%", display: "block" }}
      aria-label="3D orbital simulation viewport"
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE BUILDER HELPERS
// Pure functions — take scene and params, mutate scene. No React involvement.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * buildStarfield
 * Creates a Points cloud of procedurally scattered stars.
 * Two calls with different params give foreground/background depth layers.
 */
function buildStarfield(
  scene:    THREE.Scene,
  count:    number,
  size:     number,
  spread:   number,
  opacity:  number,
): void {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // Uniform distribution in a cube, then we rely on distance to give
    // the impression of a sphere. Simple and fast.
    positions[i * 3 + 0] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color:       "#e8f4ff",
    size,
    transparent: true,
    opacity,
    sizeAttenuation: true,   // Stars shrink with distance — correct perspective
    depthWrite:  false,
  });

  scene.add(new THREE.Points(geo, mat));
}

/**
 * buildOrbitPath
 * Renders a sharp, sub-pixel antialiased elliptical orbit trace.
 *
 * Uses a LineLoop (closed loop) from 360 computed points — no TubeGeometry
 * which would add unnecessary polygon count. Three.js's LineLoop with
 * antialiased rendering gives the cleanest scientific wireframe aesthetic.
 */
function buildOrbitPath(
  scene:        THREE.Scene,
  semiMajorAu:  number,
  eccentricity: number,
): void {
  const a = semiMajorAu * AU_TO_WS;                 // Semi-major axis in world space
  const b = a * Math.sqrt(1 - eccentricity ** 2);   // Semi-minor axis
  const c = a * eccentricity;                        // Focus offset

  const SEGMENTS = 360;
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= SEGMENTS; i++) {
    const θ = (i / SEGMENTS) * Math.PI * 2;
    // Parametric ellipse centered at the focus (star position = origin)
    // Standard orbital mechanics: x = a·cos(θ) - c, z = b·sin(θ)
    points.push(new THREE.Vector3(
      a * Math.cos(θ) - c,
      0,
      b * Math.sin(θ),
    ));
  }

  const geo = new THREE.BufferGeometry().setFromPoints(points);

  // Dashed line for the trajectory — subtle but readable
  const mat = new THREE.LineDashedMaterial({
    color:     "#1e6080",
    linewidth: 1,             // Note: linewidth > 1 only works on some GPUs
    dashSize:  0.12,
    gapSize:   0.06,
    transparent: true,
    opacity:   0.55,
    depthWrite: false,
  });

  const line = new THREE.LineLoop(geo, mat);
  line.computeLineDistances(); // Required for LineDashedMaterial
  scene.add(line);

  // Second orbit trace — solid, dimmer, slightly wider visual weight
  // Two overlapping lines give a "double exposure" scientific chart feel
  const matSolid = new THREE.LineBasicMaterial({
    color:       "#0a3a52",
    transparent: true,
    opacity:     0.30,
    depthWrite:  false,
  });
  const lineSolid = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    matSolid,
  );
  scene.add(lineSolid);
}

/**
 * buildPlanetGlow
 * A Sprite (always faces camera) with a radial gradient canvas texture
 * baked at construction time. Gives the planet a soft atmospheric halo
 * without any shader cost.
 */
function buildPlanetGlow(): THREE.Sprite {
  // Bake a 128×128 radial gradient to a canvas, use as texture
  const SIZE = 128;
  const canvas  = document.createElement("canvas");
  canvas.width  = SIZE;
  canvas.height = SIZE;
  const ctx     = canvas.getContext("2d")!;

  const gradient = ctx.createRadialGradient(
    SIZE / 2, SIZE / 2, 0,
    SIZE / 2, SIZE / 2, SIZE / 2,
  );
  gradient.addColorStop(0.0, "rgba(80, 140, 255, 0.55)");
  gradient.addColorStop(0.3, "rgba(50, 100, 220, 0.20)");
  gradient.addColorStop(0.7, "rgba(20,  60, 160, 0.06)");
  gradient.addColorStop(1.0, "rgba( 0,  20,  80, 0.00)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const texture  = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map:         texture,
    blending:    THREE.AdditiveBlending,
    transparent: true,
    depthWrite:  false,
    opacity:     0.8,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.55, 0.55, 0.55);
  return sprite;
}


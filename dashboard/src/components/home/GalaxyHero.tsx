'use client';

/**
 * GalaxyHero.tsx
 * Responsibility: Renders a logarithmic-spiral galaxy (Milky-Way analog) as a
 * Three.js PointCloud on its own dedicated canvas, overlaid above StarfieldCanvas
 * but below HUD layers (z-index: 1).
 *
 * SRP: owns ONLY the galaxy mesh + camera scroll response.
 * Props: scrollOffset (0–1) → drives camera Z translation for depth immersion.
 *
 * Architecture notes
 * ──────────────────
 * • Separate WebGLRenderer from StarfieldCanvas (each canvas = one GL context).
 *   If you later want a shared context, lift both into a SceneCompositor.
 * • All hot-path work (rotation, camera move) is in the RAF; no React re-renders.
 * • scrollOffset is read from a ref, never causes re-render.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ─── tuneable constants ────────────────────────────────────────────────────────
const ARM_COUNT           = 5;          // number of spiral arms
const STARS_PER_ARM       = 1_800;      // particles per arm
const CORE_STARS          = 1_200;      // dense central bulge
const ARM_SPREAD          = 0.28;       // radial scatter around the ideal spiral
const HEIGHT_SCATTER      = 0.06;       // disk thickness (Y axis)
const SPIRAL_TIGHTNESS    = 0.38;       // b in r = a·e^(b·θ)
const MAX_RADIUS          = 160;        // galaxy outer radius (world units)
const ROTATION_SPEED      = 0.00018;    // radians per frame (slow majestic spin)

// Camera positions
const CAM_BASE_Z          = 280;        // default camera Z (full view)
const CAM_ZOOM_Z          = 60;         // camera Z when scrollOffset === 1 (close-up)
const CAM_BASE_Y          = 45;         // slight overhead angle
const CAM_SCROLL_Y_DROP   = 40;         // how much Y drops as user scrolls in

// Colour palette — core warm, outer cold blue-white
const COLOR_CORE_INNER    = new THREE.Color(0xffd580);  // warm amber
const COLOR_CORE_OUTER    = new THREE.Color(0xffffff);  // white
const COLOR_ARM_INNER     = new THREE.Color(0xaad4ff);  // ice blue
const COLOR_ARM_OUTER     = new THREE.Color(0x4466aa);  // deep blue
// ──────────────────────────────────────────────────────────────────────────────

interface GalaxyHeroProps {
  scrollOffset?: number; // 0 = default view, 1 = fully zoomed in
  zoomFactor?:   number; // alias — whichever the parent supplies
}

export default function GalaxyHero({
  scrollOffset = 0,
  zoomFactor   = 0,
}: GalaxyHeroProps): null {

  // scrollRef lets the RAF closure read the latest value without re-rendering
  const scrollRef = useRef<number>(Math.max(scrollOffset, zoomFactor));

  // Keep ref in sync with prop changes (no re-render needed)
  useEffect(() => {
    scrollRef.current = Math.max(scrollOffset, zoomFactor);
  }, [scrollOffset, zoomFactor]);

  useEffect(() => {
    // ── 1. Canvas ──────────────────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      pointer-events: none;
    `;
    document.body.appendChild(canvas);

    // ── 2. Renderer ────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,           // transparent so starfield shows through
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // fully transparent clear

    // ── 3. Scene & Camera ──────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      2_000,
    );
    camera.position.set(0, CAM_BASE_Y, CAM_BASE_Z);
    camera.lookAt(0, 0, 0);

    // ── 4. Galaxy geometry ─────────────────────────────────────────────────
    const totalStars   = CORE_STARS + ARM_COUNT * STARS_PER_ARM;
    const positions    = new Float32Array(totalStars * 3);
    const colors       = new Float32Array(totalStars * 3);
    const sizes        = new Float32Array(totalStars);

    let idx = 0;

    // Helper: lerp THREE.Color and write into Float32Array
    const writeColor = (
      arr: Float32Array,
      offset: number,
      a: THREE.Color,
      b: THREE.Color,
      t: number,
    ): void => {
      arr[offset]     = a.r + (b.r - a.r) * t;
      arr[offset + 1] = a.g + (b.g - a.g) * t;
      arr[offset + 2] = a.b + (b.b - a.b) * t;
    };

    // ── 4a. Central bulge (Gaussian radial distribution) ──────────────────
    for (let i = 0; i < CORE_STARS; i++) {
      // Box-Muller for Gaussian distribution on radius
      const u    = Math.random(), v = Math.random();
      const gauss = Math.sqrt(-2 * Math.log(u + 1e-9)) * Math.cos(2 * Math.PI * v);
      const r    = Math.abs(gauss) * (MAX_RADIUS * 0.12);
      const theta = Math.random() * Math.PI * 2;

      const i3 = idx * 3;
      positions[i3]     = r * Math.cos(theta);
      positions[i3 + 1] = (Math.random() - 0.5) * HEIGHT_SCATTER * MAX_RADIUS * 0.4;
      positions[i3 + 2] = r * Math.sin(theta);

      const t = Math.min(r / (MAX_RADIUS * 0.12), 1);
      writeColor(colors, i3, COLOR_CORE_INNER, COLOR_CORE_OUTER, t);
      sizes[idx] = 1.0 + Math.random() * 1.8;
      idx++;
    }

    // ── 4b. Logarithmic spiral arms ────────────────────────────────────────
    for (let arm = 0; arm < ARM_COUNT; arm++) {
      const armOffset = (arm / ARM_COUNT) * Math.PI * 2; // angular phase of arm

      for (let s = 0; s < STARS_PER_ARM; s++) {
        // t ∈ [0,1] drives how far along the arm we are
        const t     = s / STARS_PER_ARM;
        // Logarithmic spiral: r = a · e^(b · θ)
        const theta = t * Math.PI * 4;                          // 2 full turns
        const r     = (MAX_RADIUS * 0.04) * Math.exp(SPIRAL_TIGHTNESS * theta);
        const angle = theta + armOffset;

        // Scatter around the ideal spiral curve
        const scatter = (Math.random() - 0.5) * ARM_SPREAD * r;

        const i3 = idx * 3;
        positions[i3]     = r * Math.cos(angle) + scatter * Math.cos(angle + Math.PI * 0.5);
        positions[i3 + 1] = (Math.random() - 0.5) * HEIGHT_SCATTER * r;
        positions[i3 + 2] = r * Math.sin(angle) + scatter * Math.sin(angle + Math.PI * 0.5);

        // Colour: warm near core, cold/blue near tips
        writeColor(colors, i3, COLOR_ARM_INNER, COLOR_ARM_OUTER, t);
        sizes[idx] = 0.6 + Math.random() * 1.2;
        idx++;
      }
    }

    // ── 4c. BufferGeometry ─────────────────────────────────────────────────
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
    geometry.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

    // ── 5. Material ────────────────────────────────────────────────────────
    const material = new THREE.PointsMaterial({
      size:            1.4,
      sizeAttenuation: true,
      vertexColors:    true,
      transparent:     true,
      opacity:         0.92,
      depthWrite:      false,
      blending:        THREE.AdditiveBlending, // glow effect via additive
    });

    // ── 6. Galaxy mesh ─────────────────────────────────────────────────────
    const galaxy = new THREE.Points(geometry, material);
    // Tilt slightly so we see the disk from above-and-to-the-side
    galaxy.rotation.x = THREE.MathUtils.degToRad(12);
    scene.add(galaxy);

    // ── 7. Soft ambient nebula glow (additive plane behind galaxy) ─────────
    const glowGeo = new THREE.PlaneGeometry(260, 260);
    const glowMat = new THREE.MeshBasicMaterial({
      color:       0x0a0a2a,
      transparent: true,
      opacity:     0.55,
      depthWrite:  false,
      side:        THREE.DoubleSide,
    });
    const glowPlane = new THREE.Mesh(glowGeo, glowMat);
    glowPlane.rotation.x = THREE.MathUtils.degToRad(12 + 90);
    scene.add(glowPlane);

    // ── 8. Animation loop ──────────────────────────────────────────────────
    let rafId: number;

    const animate = (): void => {
      rafId = requestAnimationFrame(animate);

      // Continuous slow rotation on Y axis
      galaxy.rotation.y += ROTATION_SPEED;

      // Scroll-driven camera zoom — lerp for smoothness
      const t = Math.max(0, Math.min(1, scrollRef.current));
      const targetZ = CAM_BASE_Z + (CAM_ZOOM_Z - CAM_BASE_Z) * t;
      const targetY = CAM_BASE_Y - CAM_SCROLL_Y_DROP * t;

      // Ease: 8% toward target per frame (~60 fps → ~1 second settle)
      camera.position.z += (targetZ - camera.position.z) * 0.08;
      camera.position.y += (targetY - camera.position.y) * 0.08;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // ── 9. Resize handler ──────────────────────────────────────────────────
    const onResize = (): void => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // ── 10. Cleanup ────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);

      geometry.dispose();
      material.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      renderer.dispose();

      canvas.remove();
    };
  }, []); // intentionally empty — scroll is via ref, not re-mount

  return null;
}
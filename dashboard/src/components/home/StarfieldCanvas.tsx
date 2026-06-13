'use client';

/**
 * StarfieldCanvas.tsx
 * Responsibility: Fullscreen WebGL background layer rendering a procedural
 * 2000-point starfield with slow Z-axis drift (cosmic vacuum motion).
 *
 * SRP: owns ONLY the starfield — no galaxy, no HUD, no scene sharing.
 * Mount: initialises Three.js renderer + scene + camera + particles.
 * Unmount: disposes geometry, material, renderer; cancels RAF.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ─── tuneable constants ────────────────────────────────────────────────────────
const STAR_COUNT       = 2_400;
const SPREAD_XY        = 800;    // half-width/height of the spawn box (world units)
const SPREAD_Z_NEAR    = -600;   // closest Z a star can spawn
const SPREAD_Z_FAR     = -2_000; // farthest Z a star can spawn
const DRIFT_SPEED      = 0.18;   // world-units per frame along +Z
const RESET_Z          = 200;    // Z threshold at which a star wraps back to far end
const FOV              = 75;
const NEAR_CLIP        = 0.1;
const FAR_CLIP         = 3_000;
const CAMERA_Z         = 0;      // camera sits at origin; stars drift toward it
const POINT_SIZE       = 1.6;
// ──────────────────────────────────────────────────────────────────────────────

export default function StarfieldCanvas(): null {
  const mountRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // ── 1. Canvas element ────────────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
    `;
    document.body.appendChild(canvas);
    mountRef.current = canvas;

    // ── 2. Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,   // not needed for points; saves bandwidth
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000008, 1); // deep space near-black

    // ── 3. Scene & Camera ────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      FOV,
      window.innerWidth / window.innerHeight,
      NEAR_CLIP,
      FAR_CLIP,
    );
    camera.position.z = CAMERA_Z;

    // ── 4. Starfield geometry ────────────────────────────────────────────────
    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes     = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      positions[i3]     = (Math.random() - 0.5) * SPREAD_XY * 2;
      positions[i3 + 1] = (Math.random() - 0.5) * SPREAD_XY * 2;
      positions[i3 + 2] = SPREAD_Z_NEAR + Math.random() * (SPREAD_Z_NEAR - SPREAD_Z_FAR);
      // slight size variance for depth-of-field illusion
      sizes[i] = 0.4 + Math.random() * 1.4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

    // ── 5. Material ──────────────────────────────────────────────────────────
    // Soft circular sprite via alphaTest so no blending overdraw on 2 400 pts
    const material = new THREE.PointsMaterial({
      color:       0xd0e8ff,
      size:        POINT_SIZE,
      sizeAttenuation: true,
      transparent: true,
      opacity:     0.85,
      depthWrite:  false,
    });

    // ── 6. Points mesh ───────────────────────────────────────────────────────
    const stars = new THREE.Points(geometry, material);
    scene.add(stars);

    // ── 7. Animation loop ────────────────────────────────────────────────────
    let rafId: number;

    const posAttr = geometry.attributes.position as THREE.BufferAttribute;

    const animate = (): void => {
      rafId = requestAnimationFrame(animate);

      // Drift every star toward the camera along +Z
      for (let i = 0; i < STAR_COUNT; i++) {
        const i3 = i * 3;
        posAttr.array[i3 + 2] += DRIFT_SPEED;

        // Wrap around: once a star passes the camera, teleport to far end
        if ((posAttr.array as Float32Array)[i3 + 2] > RESET_Z) {
          (posAttr.array as Float32Array)[i3]     = (Math.random() - 0.5) * SPREAD_XY * 2;
          (posAttr.array as Float32Array)[i3 + 1] = (Math.random() - 0.5) * SPREAD_XY * 2;
          (posAttr.array as Float32Array)[i3 + 2] = SPREAD_Z_FAR + Math.random() * 100;
        }
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // ── 8. Resize handler ────────────────────────────────────────────────────
    const onResize = (): void => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // ── 9. Cleanup ───────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);

      geometry.dispose();
      material.dispose();
      renderer.dispose();

      canvas.remove();
      mountRef.current = null;
    };
  }, []);

  // This component renders nothing into the React tree — it owns the canvas
  return null;
}
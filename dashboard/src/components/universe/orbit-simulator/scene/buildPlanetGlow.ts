/**
 * buildPlanetGlow.ts
 * src/components/universe/orbit-simulator/scene/buildPlanetGlow.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds a soft radial-gradient glow sprite, attached as a child of a planet
 * mesh to simulate atmospheric bloom at small render scales.
 *
 * SRP: only builds the sprite. Caller is responsible for attaching it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from "three";

const GLOW_TEXTURE_SIZE = 128;

export function buildPlanetGlow(): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width  = GLOW_TEXTURE_SIZE;
  canvas.height = GLOW_TEXTURE_SIZE;

  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(
    GLOW_TEXTURE_SIZE / 2, GLOW_TEXTURE_SIZE / 2, 0,
    GLOW_TEXTURE_SIZE / 2, GLOW_TEXTURE_SIZE / 2, GLOW_TEXTURE_SIZE / 2,
  );
  gradient.addColorStop(0.0, "rgba(80, 140, 255, 0.45)");
  gradient.addColorStop(0.3, "rgba(50, 100, 220, 0.15)");
  gradient.addColorStop(1.0, "rgba(0,0,0,0.0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GLOW_TEXTURE_SIZE, GLOW_TEXTURE_SIZE);

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
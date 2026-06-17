/**
 * StarMaterial.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Factory for a custom Three.js ShaderMaterial that renders a physically-
 * motivated stellar corona.
 *
 * Shader model (simplified stellar atmosphere):
 *
 *   1. CORE  — Solid bright disc via smoothstep on UV distance from center.
 *              Color ramps from stellar-white at center to amber-yellow at limb
 *              (limb darkening — the real optical physics: we see deeper, hotter
 *              gas at disk center, cooler surface at limb).
 *
 *   2. CORONA — Two exponential falloff halos layered over each other:
 *               - Inner corona: tight, bright, warm chromatic halo
 *               - Outer corona: wide, dim, cold-blue scattered light
 *               These are additive-blended to the core.
 *
 *   3. FLICKER — A time-driven sin/cos noise modulates the outer corona
 *                amplitude by ±6%, simulating solar wind density fluctuations.
 *                Frequency is intentionally low (0.4 Hz equivalent) so it reads
 *                as atmospheric shimmer, not strobing.
 *
 *   4. CHROMATIC ABERRATION FRINGE — A thin ring at the core/corona boundary
 *                gets a slight cyan tint (reminiscent of real refraction arcs
 *                visible in coronagraph imagery).
 *
 * The mesh must be a PlaneGeometry (a flat billboard quad facing the camera).
 * Use Three.js AdditiveBlending so the halo adds light to the scene rather
 * than occluding stars behind it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from "three";

// ── Vertex Shader ─────────────────────────────────────────────────────────────
// Minimal pass-through. We only need UV coordinates in the fragment shader.
// modelViewMatrix and projectionMatrix are Three.js built-ins.
const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ── Fragment Shader ───────────────────────────────────────────────────────────
const fragmentShader = /* glsl */ `
  // ── Uniforms (set from JS, updated per-frame for time) ────────────────────
  uniform float uTime;          // Elapsed seconds — drives flicker animation
  uniform vec3  uCoreColor;     // RGB: stellar photosphere center color
  uniform vec3  uLimbColor;     // RGB: stellar limb color (darker, redder)
  uniform vec3  uCoronaInner;   // RGB: inner corona warm halo
  uniform vec3  uCoronaOuter;   // RGB: outer corona cool scatter
  uniform float uCoreRadius;    // [0–1] fraction of UV space the solid disc occupies
  uniform float uCorona1Falloff;// Controls how tight the inner corona halo is
  uniform float uCorona2Falloff;// Controls how wide the outer corona halo is
  uniform float uIntensity;     // Global brightness multiplier

  varying vec2 vUv;

  // ── Utility: smooth noise approximation (no texture lookup needed) ─────────
  // Two sin/cos waves at incommensurate frequencies → aperiodic "flicker"
  float flicker(float t) {
    return 0.94
      + 0.03 * sin(t * 2.71828 + 1.4142)
      + 0.03 * cos(t * 1.61803 + 0.5772);
  }

  void main() {
    // ── 1. Distance from center of the quad (UV center = 0.5, 0.5) ──────────
    vec2  centered = vUv - vec2(0.5);
    float dist     = length(centered);           // 0 at center, ~0.707 at corner

    // ── 2. STELLAR CORE ──────────────────────────────────────────────────────
    // smoothstep edge: disc is fully opaque inside uCoreRadius,
    // smoothly fades to transparent over a 0.01 penumbra.
    float coreMask    = 1.0 - smoothstep(uCoreRadius - 0.01, uCoreRadius + 0.005, dist);

    // Limb darkening: interpolate from center (white-hot) to limb (amber)
    // The exponent 0.4 gives a physically reasonable darkening curve.
    float limbFactor  = pow(1.0 - clamp(dist / uCoreRadius, 0.0, 1.0), 0.4);
    vec3  coreColor   = mix(uLimbColor, uCoreColor, limbFactor);

    // ── 3. INNER CORONA ──────────────────────────────────────────────────────
    // Exponential falloff starting from the core edge
    float innerCorona = exp(-uCorona1Falloff * max(dist - uCoreRadius, 0.0));
    innerCorona      *= (1.0 - coreMask); // don't double-add to the disc interior

    // ── 4. OUTER CORONA with flicker ────────────────────────────────────────
    float flk         = flicker(uTime);
    float outerCorona = exp(-uCorona2Falloff * max(dist - uCoreRadius * 0.5, 0.0));
    outerCorona      *= flk * (1.0 - coreMask * 0.8);

    // ── 5. CHROMATIC ABERRATION FRINGE ──────────────────────────────────────
    // A thin ring right at the core/corona boundary gets a cyan tint.
    float ringMask    = smoothstep(uCoreRadius - 0.015, uCoreRadius, dist)
                      * smoothstep(uCoreRadius + 0.02,  uCoreRadius, dist);
    vec3  ringColor   = vec3(0.4, 0.85, 1.0) * ringMask * 0.35;

    // ── 6. COMPOSITE ─────────────────────────────────────────────────────────
    vec3 color = vec3(0.0);
    color     += coreColor   * coreMask;
    color     += uCoronaInner * innerCorona * 0.7;
    color     += uCoronaOuter * outerCorona * 0.25;
    color     += ringColor;

    // Alpha: solid at core, exponential falloff in corona
    float alpha = coreMask + innerCorona * 0.6 + outerCorona * 0.18;
    alpha       = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(color * uIntensity, alpha);
  }
`;

// ── Factory function ──────────────────────────────────────────────────────────

export interface StarMaterialOptions {
  /** Radius of the photosphere disc in UV space. Default: 0.08 */
  coreRadius?: number;
  /** Inner corona exponential falloff tightness. Higher = tighter. Default: 18 */
  corona1Falloff?: number;
  /** Outer corona exponential falloff. Lower = wider halo. Default: 5 */
  corona2Falloff?: number;
  /** Overall brightness multiplier. Default: 1.2 */
  intensity?: number;
}

export function createStarMaterial(opts: StarMaterialOptions = {}): THREE.ShaderMaterial {
  const {
    coreRadius    = 0.08,
    corona1Falloff = 18,
    corona2Falloff = 5,
    intensity     = 1.2,
  } = opts;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,

    uniforms: {
      uTime:          { value: 0 },
      // Core: blue-white at center (T ~ 6000K analog)
      uCoreColor:     { value: new THREE.Color("#fffef0") },
      // Limb: amber-yellow (cooler outer photosphere)
      uLimbColor:     { value: new THREE.Color("#ffd060") },
      // Inner corona: warm orange-white
      uCoronaInner:   { value: new THREE.Color("#ffb830") },
      // Outer corona: dim blue-white scatter
      uCoronaOuter:   { value: new THREE.Color("#e8f4ff") },
      uCoreRadius:    { value: coreRadius },
      uCorona1Falloff:{ value: corona1Falloff },
      uCorona2Falloff:{ value: corona2Falloff },
      uIntensity:     { value: intensity },
    },

    // Additive blending: the glow ADDS light to whatever is behind it.
    // This is physically correct — a star's corona doesn't occlude distant stars.
    blending:     THREE.AdditiveBlending,
    transparent:  true,
    depthWrite:   false, // Corona pixels must not occlude other geometry in the depth buffer
    side:         THREE.FrontSide,
  });
}

// ── Uniform update helper (call inside rAF loop) ──────────────────────────────
export function updateStarTime(material: THREE.ShaderMaterial, elapsedSeconds: number): void {
  material.uniforms.uTime.value = elapsedSeconds;
}
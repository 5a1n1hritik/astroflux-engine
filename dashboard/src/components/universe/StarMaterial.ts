import * as THREE from "three";

// ── Temperature → Stellar Profile Mapping ────────────────────────────────────
export interface StellarProfile {
  coreColor:    string;
  limbColor:    string;
  coronaInner:  string;
  coronaOuter:  string;
  intensity:    number;
  corona1Falloff: number;
  corona2Falloff: number;
  pointLightColor: string;
  pointLightIntensity: number;
}

export function getStellarProfile(teff: number): StellarProfile {
  if (teff < 3500) {
    // M-Dwarf — Red/Crimson
    return {
      coreColor:    "#ff4400",
      limbColor:    "#cc2200",
      coronaInner:  "#ff3300",
      coronaOuter:  "#661100",
      intensity:    0.9,
      corona1Falloff: 22,
      corona2Falloff: 4,
      pointLightColor: "#ff4400",
      pointLightIntensity: 1.5,
    };
  } else if (teff < 5000) {
    // K-Type — Orange
    return {
      coreColor:    "#ffaa44",
      limbColor:    "#ff7700",
      coronaInner:  "#ff8800",
      coronaOuter:  "#ff4400",
      intensity:    1.0,
      corona1Falloff: 20,
      corona2Falloff: 4.5,
      pointLightColor: "#ffaa44",
      pointLightIntensity: 2.5,
    };
  } else if (teff < 6000) {
    // G-Type (Sun-like) — Yellow-White
    return {
      coreColor:    "#fffef0",
      limbColor:    "#ffd060",
      coronaInner:  "#ffb830",
      coronaOuter:  "#e8f4ff",
      intensity:    1.2,
      corona1Falloff: 18,
      corona2Falloff: 5,
      pointLightColor: "#ffdf90",
      pointLightIntensity: 4.0,
    };
  } else if (teff < 7500) {
    // F-Type — Yellow-White bright
    return {
      coreColor:    "#ffffff",
      limbColor:    "#ffe8aa",
      coronaInner:  "#fff0cc",
      coronaOuter:  "#e8f0ff",
      intensity:    1.5,
      corona1Falloff: 16,
      corona2Falloff: 5.5,
      pointLightColor: "#fff5cc",
      pointLightIntensity: 5.5,
    };
  } else if (teff < 10000) {
    // A-Type — White-Blue
    return {
      coreColor:    "#ffffff",
      limbColor:    "#cce0ff",
      coronaInner:  "#aad4ff",
      coronaOuter:  "#88aaff",
      intensity:    1.8,
      corona1Falloff: 14,
      corona2Falloff: 6,
      pointLightColor: "#aaccff",
      pointLightIntensity: 6.5,
    };
  } else {
    // O/B-Type — Electric Blue Giant
    return {
      coreColor:    "#eeeeff",
      limbColor:    "#8899ff",
      coronaInner:  "#6688ff",
      coronaOuter:  "#2244cc",
      intensity:    2.2,
      corona1Falloff: 12,
      corona2Falloff: 7,
      pointLightColor: "#6688ff",
      pointLightIntensity: 8.0,
    };
  }
}

// ── Vertex Shader ─────────────────────────────────────────────────────────────
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ── Fragment Shader ───────────────────────────────────────────────────────────
// const fragmentShader = /* glsl */ `
//   uniform float uTime;
//   uniform vec3  uCoreColor;
//   uniform vec3  uLimbColor;
//   uniform vec3  uCoronaInner;
//   uniform vec3  uCoronaOuter;
//   uniform float uCoreRadius;
//   uniform float uCorona1Falloff;
//   uniform float uCorona2Falloff;
//   uniform float uIntensity;

//   varying vec2 vUv;

//   float flicker(float t) {
//     return 0.94
//       + 0.03 * sin(t * 2.71828 + 1.4142)
//       + 0.03 * cos(t * 1.61803 + 0.5772);
//   }

//   // Perlin-style plasma noise
//   float hash(vec2 p) {
//     return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
//   }
//   float noise(vec2 p) {
//     vec2 i = floor(p);
//     vec2 f = fract(p);
//     vec2 u = f * f * (3.0 - 2.0 * f);
//     return mix(
//       mix(hash(i), hash(i + vec2(1,0)), u.x),
//       mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
//       u.y
//     );
//   }

//   void main() {
//     vec2  centered = vUv - vec2(0.5);
//     float dist     = length(centered);

//     // ── Core ──────────────────────────────────────────────────────────────────
//     float coreMask  = 1.0 - smoothstep(uCoreRadius - 0.01, uCoreRadius + 0.005, dist);
//     float limbFactor = pow(1.0 - clamp(dist / uCoreRadius, 0.0, 1.0), 0.4);

//     // Plasma noise on surface
//     vec2 noiseUv = centered * 8.0 + vec2(uTime * 0.08, uTime * 0.05);
//     float plasma  = noise(noiseUv) * 0.5 + noise(noiseUv * 2.1 + 1.7) * 0.3;
//     float plasmaStrength = coreMask * plasma * 0.18;

//     vec3 coreColor = mix(uLimbColor, uCoreColor, limbFactor + plasmaStrength);

//     // ── Coronas ───────────────────────────────────────────────────────────────
//     float flk        = flicker(uTime);
//     float innerCorona = exp(-uCorona1Falloff * max(dist - uCoreRadius, 0.0));
//     innerCorona      *= (1.0 - coreMask);

//     float outerCorona = exp(-uCorona2Falloff * max(dist - uCoreRadius * 0.5, 0.0));
//     outerCorona      *= flk * (1.0 - coreMask * 0.8);

//     // ── Chromatic fringe ──────────────────────────────────────────────────────
//     float ringMask = smoothstep(uCoreRadius - 0.015, uCoreRadius, dist)
//                    * smoothstep(uCoreRadius + 0.02,  uCoreRadius, dist);
//     vec3 ringColor = vec3(0.4, 0.85, 1.0) * ringMask * 0.35;

//     // ── Composite ─────────────────────────────────────────────────────────────
//     vec3 color = vec3(0.0);
//     color += coreColor    * coreMask;
//     color += uCoronaInner * innerCorona * 0.7;
//     color += uCoronaOuter * outerCorona * 0.25;
//     color += ringColor;

//     float alpha = coreMask + innerCorona * 0.6 + outerCorona * 0.18;
//     alpha = clamp(alpha, 0.0, 1.0);

//     gl_FragColor = vec4(color * uIntensity, alpha);
//   }
// `;
const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3  uCoreColor;
  uniform vec3  uLimbColor;
  uniform vec3  uCoronaInner;
  uniform vec3  uCoronaOuter;
  uniform float uCoreRadius;
  uniform float uCorona1Falloff;
  uniform float uCorona2Falloff;
  uniform float uIntensity;

  varying vec2 vUv;

  // ── Fast value noise ──────────────────────────────────────────────────────
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }

  // ── 3-octave fBm ─────────────────────────────────────────────────────────
  float fbm3(vec2 p) {
    float v = 0.0;
    v += 0.500 * vnoise(p);
    v += 0.250 * vnoise(p * 2.1 + vec2(3.7, 1.9));
    v += 0.125 * vnoise(p * 4.3 + vec2(1.2, 7.4));
    return v / 0.875;
  }

  // ── Domain warp (2-pass only) ─────────────────────────────────────────────
  float plasma(vec2 uv, float t) {
    float s = t * 0.06;
    vec2 q = vec2(fbm3(uv + vec2(s, s * 0.7)),
                  fbm3(uv + vec2(s * 0.8, 1.3 + s * 0.5)));
    return fbm3(uv + 1.8 * q + vec2(t * 0.03));
  }

  // ── Flicker ───────────────────────────────────────────────────────────────
  float flicker(float t) {
    return 0.93 + 0.04 * sin(t * 2.7 + 1.4) + 0.03 * cos(t * 1.6 + 0.6);
  }

  void main() {
    vec2  c    = vUv - 0.5;
    float dist = length(c);

    // ── Core mask & limb darkening ────────────────────────────────────────
    float coreMask   = 1.0 - smoothstep(uCoreRadius - 0.012,
                                         uCoreRadius + 0.006, dist);
    float limbFactor = pow(max(0.0, 1.0 - dist / uCoreRadius), 0.45);

    // ── Plasma turbulence on surface ──────────────────────────────────────
    vec2  puv     = c * 4.5;
    float p       = plasma(puv, uTime);          // [0..1]
    float pBright = coreMask * smoothstep(0.55, 1.0, p) * 0.35;
    float pDark   = coreMask * (1.0 - smoothstep(0.0, 0.4, p)) * 0.15;

    vec3 surfaceColor = mix(uLimbColor, uCoreColor, limbFactor + pBright - pDark);

    // Hot spot flares
    float flare = coreMask * smoothstep(0.78, 1.0, p);
    surfaceColor += uCoreColor * flare * 0.5;

    // ── Corona ────────────────────────────────────────────────────────────
    float flk  = flicker(uTime);
    float edgeDist = max(dist - uCoreRadius, 0.0);

    float inner = exp(-uCorona1Falloff * edgeDist) * (1.0 - coreMask);
    float outer = exp(-uCorona2Falloff * max(dist - uCoreRadius * 0.5, 0.0))
                * flk * (1.0 - coreMask * 0.75);

    // Animated corona wisps
    float wispAngle = atan(c.y, c.x) + uTime * 0.15;
    float wisp = 0.5 + 0.5 * sin(wispAngle * 6.0 + uTime * 0.4);
    outer *= (0.8 + 0.2 * wisp);

    // ── Chromatic ring ────────────────────────────────────────────────────
    float ring = smoothstep(uCoreRadius - 0.016, uCoreRadius,       dist)
               * smoothstep(uCoreRadius + 0.022, uCoreRadius,       dist);
    vec3 ringColor = vec3(0.4, 0.85, 1.0) * ring * 0.4;

    // ── Composite ─────────────────────────────────────────────────────────
    vec3 col = vec3(0.0);
    col += surfaceColor  * coreMask;
    col += uCoronaInner  * inner * 0.75;
    col += uCoronaOuter  * outer * 0.30;
    col += ringColor;

    float alpha = coreMask + inner * 0.65 + outer * 0.20;
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(col * uIntensity, alpha);
  }
`;

// ── Factory ───────────────────────────────────────────────────────────────────
export function createStarMaterial(teff: number = 5778): THREE.ShaderMaterial {
  const p = getStellarProfile(teff);

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime:           { value: 0 },
      uCoreColor:      { value: new THREE.Color(p.coreColor) },
      uLimbColor:      { value: new THREE.Color(p.limbColor) },
      uCoronaInner:    { value: new THREE.Color(p.coronaInner) },
      uCoronaOuter:    { value: new THREE.Color(p.coronaOuter) },
      uCoreRadius:     { value: 0.08 },
      uCorona1Falloff: { value: p.corona1Falloff },
      uCorona2Falloff: { value: p.corona2Falloff },
      uIntensity:      { value: p.intensity },
    },
    blending:    THREE.AdditiveBlending,
    transparent: true,
    depthWrite:  false,
    side:        THREE.DoubleSide,
  });
}

export function updateStarTime(mat: THREE.ShaderMaterial, t: number): void {
  mat.uniforms.uTime.value = t;
}
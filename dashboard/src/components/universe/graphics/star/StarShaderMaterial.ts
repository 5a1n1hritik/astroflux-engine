import * as THREE from "three";

// ── MODULE 1: THE CORE 3D PLASMA GEOMETRY SHADERS ───────────────────────────
const coreVertexShader = /* glsl */ `
  varying vec3 vPosition;
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position; // Pass true 3D local coordinates to fragment layer
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const coreFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uStarTemperature;
  uniform float uIntensity;

  varying vec3 vPosition;
  varying vec3 vNormal;

  // High-performance 3D spatial PRNG hash
  float hash3(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  // Pure 3D Value Noise to eliminate sphere pole pinching artefacts
  float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), u.x),
                   mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), u.x), u.y),
               mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), u.x),
                   mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), u.x), u.y), u.z);
  }

  float fbm3D(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 3; i++) {
      value += amplitude * noise3D(p);
      p *= 2.2;
      amplitude *= 0.5;
    }
    return value;
  }

  // 3D Blackbody Heat Distribution Generator
  vec3 getThermalColor(float intensityFactor, float tempType) {
    vec3 blackBody;
    if (tempType < 3700.0) {
      vec3 c1 = vec3(0.08, 0.00, 0.00); // Sinking magnetic dark zones
      vec3 c2 = vec3(0.72, 0.04, 0.00); 
      vec3 c3 = vec3(0.98, 0.32, 0.02); 
      vec3 c4 = vec3(1.00, 0.65, 0.08); 
      if (intensityFactor < 0.3)      blackBody = mix(c1, c2, intensityFactor / 0.3);
      else if (intensityFactor < 0.7) blackBody = mix(c2, c3, (intensityFactor - 0.3) / 0.4);
      else                            blackBody = mix(c3, c4, (intensityFactor - 0.7) / 0.3);
    } else if (tempType > 8000.0) {
      vec3 c1 = vec3(0.00, 0.01, 0.15);
      vec3 c2 = vec3(0.00, 0.20, 0.85);
      vec3 c3 = vec3(0.30, 0.70, 1.00);
      vec3 c4 = vec3(1.00, 1.00, 1.00);
      if (intensityFactor < 0.3)      blackBody = mix(c1, c2, intensityFactor / 0.3);
      else if (intensityFactor < 0.7) blackBody = mix(c2, c3, (intensityFactor - 0.3) / 0.4);
      else                            blackBody = mix(c3, c4, (intensityFactor - 0.7) / 0.3);
    } else {
      vec3 c1 = vec3(0.22, 0.02, 0.00); // Standard dark solar amber gaps
      vec3 c2 = vec3(0.88, 0.18, 0.00); 
      vec3 c3 = vec3(1.00, 0.68, 0.02); 
      vec3 c4 = vec3(1.00, 0.98, 0.90); 
      if (intensityFactor < 0.25)     blackBody = mix(c1, c2, intensityFactor / 0.25);
      else if (intensityFactor < 0.65) blackBody = mix(c2, c3, (intensityFactor - 0.25) / 0.40);
      else                            blackBody = mix(c3, c4, (intensityFactor - 0.65) / 0.35);
    }
    return blackBody;
  }

  void main() {
    // Real 3D physical viewing angle projection factor (Fresnel standard)
    // viewDirection is along Z axis in local coordinates context
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float mu = clamp(dot(vNormal, viewDir), 0.0, 1.0);

    // Standard Solar Quadratic Limb Darkening Equation law mapping
    float uCoef = 0.45;
    float vCoef = 0.22;
    float limbDarkening = 1.0 - uCoef * (1.0 - mu) - vCoef * (1.0 - mu) * (1.0 - mu);

    // Dynamic Differential Rotation Shear Math tracking altitude layers
    float latitudeFactor = abs(normalize(vPosition).y);
    float localTimeScale = uTime * (1.0 - latitudeFactor * 1.5);

    // =====================================================================
    // Apply double nested 3D coordinate domain warping vectors
    // vec3 p1 = vPosition * 3.0 + vec3(localTimeScale * 0.15, 0.0, localTimeScale * 0.08);
    // vec3 q = vec3(fbm3D(p1), fbm3D(p1 + vec3(2.3)), fbm3D(p1 + vec3(4.1)));
    // vec3 r = vec3(fbm3D(p1 + q * 1.8), fbm3D(p1 + q * 1.2), fbm3D(p1 + q * 1.5));
    
    // float surfaceTurbulence = fbm3D(p1 + r * 2.5);
    // =====================================================================

    // ── NYA HIGH-FIDELITY COUNTER-FLOW LAYOUT ─────────────────────────────────
    // Base Layer (p1): Iska primary drift forward X aur axis rotation set kiya
    vec3 p1 = vPosition * 3.0 + vec3(localTimeScale * 0.15, 0.0, localTimeScale * 0.08);

    // Layer 1 (q): Iske vertical aur depth flows ko invert kiya (-Y, -Z)
    vec3 q = vec3(
      fbm3D(p1),
      fbm3D(p1 - vec3(0.0, localTimeScale * 0.12, 0.0) + vec3(2.3)),
      fbm3D(p1 - vec3(0.0, 0.0, localTimeScale * 0.08) + vec3(4.1))
    );

    // Layer 2 (r): Iske vectors ko twist dekar complete cross-shearing loop banaya
    // Note: Isme hum q ke coefficients ko cross lookups de rahe hain (+X, -Y, +Z targets)
    vec3 r = vec3(
      fbm3D(p1 + q * 1.8 + vec3(-localTimeScale * 0.1, localTimeScale * 0.05, 0.0)),
      fbm3D(p1 + q.zyx * 1.2 + vec3(localTimeScale * 0.08, -localTimeScale * 0.12, 0.0)),
      fbm3D(p1 + q * 1.5 + vec3(0.0, localTimeScale * 0.04, -localTimeScale * 0.15))
    );

    // Final mix me turbulence ko fluid patterns me warp kiya
    float surfaceTurbulence = fbm3D(p1 + r * 2.5);

    // Magnetic low-frequency threshold masking filters for Sunspots allocation
    vec3 sunspotPos = vPosition * 1.2 - vec3(localTimeScale * 0.02, 0.0, 0.0);
    float sunspotNoise = fbm3D(sunspotPos);
    float sunspotMask = smoothstep(0.70, 0.82, sunspotNoise);

    // Composit mix scaling intensities overrides
    float finalCoreIntensity = surfaceTurbulence * limbDarkening * (1.0 - sunspotMask * 0.90);
    vec3 plasmaColor = getThermalColor(finalCoreIntensity, uStarTemperature);

    gl_FragColor = vec4(plasmaColor * uIntensity, 1.0); // Opaque core sphere
  }
`;

// ── MODULE 2: THE OUTER CORONA ATMOSPHERE SHADERS ─────────────────────────
const coronaVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const coronaFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3  uCoronaColor;
  uniform float uCoreRadius;
  varying vec2 vUv;

  void main() {
    vec2 centered = vUv - vec2(0.5);
    float dist = length(centered);

    // Exponential gas field falloffs tracking out bounds boundary lines
    float pulse1 = sin(uTime * 1.13) * cos(uTime * 2.71);
    float pulse2 = cos(uTime * 1.73) * sin(uTime * 2.11);

    float innerGlow = exp(-18.0 * max(dist - uCoreRadius, 0.0));
    float outerGlow = exp(-4.2 * max(dist - uCoreRadius * 0.4, 0.0));

    // Transparent mask context cut tracking the absolute center edge boundary
    float coreCut = smoothstep(uCoreRadius - 0.005, uCoreRadius + 0.002, dist);

    vec3 finalGlow = uCoronaColor * innerGlow * (0.90 + 0.05 * pulse1);
    finalGlow += uCoronaColor * outerGlow * (0.32 + 0.04 * pulse2);

    float alpha = innerGlow * 0.80 + outerGlow * 0.28;
    gl_FragColor = vec4(finalGlow, clamp(alpha * coreCut, 0.0, 1.0));
  }
`;

export interface ShaderPresetOptions {
  core: string;
  limb: string;
  corona: string;
  temperature: number;
}

export function createStarCoreMaterial(preset: ShaderPresetOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: coreVertexShader,
    fragmentShader: coreFragmentShader,
    uniforms: {
      uTime:             { value: 0.0 },
      uStarTemperature:  { value: preset.temperature },
      uIntensity:        { value: 2.35 },
    }
  });
}

export function createStarCoronaMaterial(preset: ShaderPresetOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: coronaVertexShader,
    fragmentShader: coronaFragmentShader,
    uniforms: {
      uTime:        { value: 0.0 },
      uCoronaColor: { value: new THREE.Color(preset.corona) },
      uCoreRadius:  { value: 0.12 }, // Scaled slightly to fit perfectly behind the outer sphere bounding box edge radius limits
    },
    blending:    THREE.AdditiveBlending,
    transparent: true,
    depthWrite:  false,
  });
}
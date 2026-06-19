
// ==========================
// simple
// ==========================

// import * as THREE from "three";

// // Vertex Shader: Pass-through layer forwarding texture spaces
// const vertexShader = /* glsl */ `
//   varying vec2 vUv;
//   void main() {
//     vUv = uv;
//     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//   }
// `;

// // Fragment Shader: High-Fidelity Thermonuclear Inversion Engine
// const fragmentShader = /* glsl */ `
//   uniform float uTime;
//   uniform vec3  uCoreColor;     // Base tracking anchors
//   uniform vec3  uLimbColor;     
//   uniform vec3  uCoronaColor;   
//   uniform float uCoreRadius;    
//   uniform float uIntensity;     
//   uniform float uStarTemperature; // Dynamic trigger index passed from JS

//   varying vec2 vUv;

//   // ── 1. MATHEMATICAL NOISE GRID PRIMITIVES ──────────────────────────────────
//   vec2 hash2(vec2 p) {
//     p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
//     return fract(sin(p) * 43758.5453123);
//   }

//   // Standard 2D Value Noise for fBm layers
//   float noise(vec2 p) {
//     vec2 i = floor(p);
//     vec2 f = fract(p);
//     vec2 u = f * f * (3.0 - 2.0 * f);
//     return mix(mix(fract(sin(dot(i + vec2(0.0,0.0), vec2(12.9898,78.233))) * 43758.5453),
//                    fract(sin(dot(i + vec2(1.0,0.0), vec2(12.9898,78.233))) * 43758.5453), u.x),
//                mix(fract(sin(dot(i + vec2(0.0,1.0), vec2(12.9898,78.233))) * 43758.5453),
//                    fract(sin(dot(i + vec2(1.0,1.0), vec2(12.9898,78.233))) * 43758.5453), u.x), u.y);
//   }

//   float fbm(vec2 p) {
//     float value = 0.0;
//     float amplitude = 0.5;
//     for (int i = 0; i < 3; i++) {
//       value += amplitude * noise(p);
//       p *= 2.0;
//       amplitude *= 0.5;
//     }
//     return value;
//   }

//   // ── 2. SECRET 2: CELLULAR VORONOI (SOLAR GRANULATION CELLS) ──────────────────
//   // Simulates convective cells where hot plasma rises at center and cools at boundaries
//   float voronoiGranulation(vec2 x) {
//     vec2 n = floor(x);
//     vec2 f = fract(x);

//     float minDist = 8.0;
//     for (int j = -1; j <= 1; j++) {
//       for (int i = -1; i <= 1; i++) {
//         vec2 g = vec2(float(i), float(j));
//         vec2 o = hash2(n + g);
        
//         // Animate cell anchor points over time to simulate cell morphing loops
//         o = 0.5 + 0.5 * sin(uTime * 0.8 + 6.2831 * o);
        
//         vec2 r = g + o - f;
//         float d = dot(r, r);
//         if (d < minDist) {
//           minDist = d;
//         }
//       }
//     }
//     return sqrt(minDist);
//   }

//   // ── 3. SECRET 3: NON-LINEAR BLACKBODY THERMAL COLOR RAMP ───────────────────
//   // Replaces linear blending with real physical multi-stage heat absorption gradients
//   vec3 getThermalColor(float intensityFactor, float tempType) {
//     vec3 blackBody;
    
//     if (tempType < 3700.0) {
//       // 🔴 COOL M-DWARF RAMP: Dark Magnetic Crimson -> Vivid Red -> Blazing Orange
//       vec3 c1 = vec3(0.12, 0.00, 0.00); // Deep Magnetic Abyss
//       vec3 c2 = vec3(0.75, 0.05, 0.00); // Solar Crimson
//       vec3 c3 = vec3(0.98, 0.35, 0.02); // Plasma Orange
//       vec3 c4 = vec3(1.00, 0.70, 0.10); // Heat Flash Peak
      
//       if (intensityFactor < 0.3)      blackBody = mix(c1, c2, intensityFactor / 0.3);
//       else if (intensityFactor < 0.7) blackBody = mix(c2, c3, (intensityFactor - 0.3) / 0.4);
//       else                            blackBody = mix(c3, c4, (intensityFactor - 0.7) / 0.3);
      
//     } else if (tempType > 8000.0) {
//       // 🔵 HOT O-GIANT RAMP: Cosmic Void Blue -> Ionized Cobalt -> Electric Cyan -> Pure White
//       vec3 c1 = vec3(0.00, 0.02, 0.15);
//       vec3 c2 = vec3(0.00, 0.25, 0.85);
//       vec3 c3 = vec3(0.35, 0.75, 1.00);
//       vec3 c4 = vec3(1.00, 1.00, 1.00);
      
//       if (intensityFactor < 0.3)      blackBody = mix(c1, c2, intensityFactor / 0.3);
//       else if (intensityFactor < 0.7) blackBody = mix(c2, c3, (intensityFactor - 0.3) / 0.4);
//       else                            blackBody = mix(c3, c4, (intensityFactor - 0.7) / 0.3);
      
//     } else {
//       // 🟡 STANDARD G-TYPE RAMP (OUR SUN Baseline): Dark Amber -> Burning Orange -> Solar Yellow -> White Hot Core
//       vec3 c1 = vec3(0.28, 0.04, 0.00); // Cold sink boundaries
//       vec3 c2 = vec3(0.92, 0.22, 0.00); // Churning plasma convection
//       vec3 c3 = vec3(1.00, 0.72, 0.05); // Energetic yellow flares
//       vec3 c4 = vec3(1.00, 1.00, 0.95); // Absolute thermal core peak
      
//       if (intensityFactor < 0.25)     blackBody = mix(c1, c2, intensityFactor / 0.25);
//       else if (intensityFactor < 0.65) blackBody = mix(c2, c3, (intensityFactor - 0.25) / 0.40);
//       else                            blackBody = mix(c3, c4, (intensityFactor - 0.65) / 0.35);
//     }
    
//     return blackBody;
//   }

//   void main() {
//     vec2 centered = vUv - vec2(0.5);
//     float dist = length(centered);

//     float coreMask = 1.0 - smoothstep(uCoreRadius - 0.01, uCoreRadius + 0.005, dist);
    
//     // ── THE REAL QUADRATIC LIMB DARKENING LAW ─────────────────────────────────
//     // mu represents the real line-of-sight cosine parameter mapping
//     float normalizedDist = clamp(dist / uCoreRadius, 0.0, 1.0);
//     float mu = sqrt(1.0 - normalizedDist * normalizedDist);
    
//     // Solar Coefficients matrix filters: I(mu) = 1 - u(1-mu) - v(1-mu)^2
//     float uCoef = 0.45;
//     float vCoef = 0.22;
//     float limbDarkeningFactor = 1.0 - uCoef * (1.0 - mu) - vCoef * (1.0 - mu) * (1.0 - mu);
    
//     // Apply soft edge falloff bounds safety limits
//     float limbFactor = coreMask * clamp(limbDarkeningFactor, 0.0, 1.0);

//     // Photometric limb darkening law multiplier
//     // float limbFactor = pow(1.0 - clamp(dist / uCoreRadius, 0.0, 1.0), 0.45);
    


//     // ── SECRET 1: DOUBLE NESTED DOMAIN WARPING (LIQUID TURBULENCE) ────────────
//     // Churns spatial vectors using noise structures inside noise layouts
//     vec2 q = vec2(fbm(vUv * 4.0 + vec2(uTime * 0.05)), fbm(vUv * 4.0 + vec2(uTime * 0.02)));
//     vec2 r = vec2(fbm(vUv * 5.0 + q * 2.0 + vec2(uTime * 0.03)), fbm(vUv * 5.0 + q * 1.5 - vec2(uTime * 0.04)));
    
//     // Inject warped coordinates directly down into the cellular granulation solver
//     float convectiveMix = voronoiGranulation(vUv * 24.0 + r * 4.0);
    
//     // Invert voronoi scalars so cell centers are white-hot and margins are dark gaps
//     float finalSurfaceMix = clamp(1.0 - convectiveMix, 0.0, 1.0);
    
//     // Overlay limb darkening onto surface matrix intensities
//     float coreFinalIntensity = finalSurfaceMix * limbFactor;

//     // Compute real multi-tiered blackbody color vectors
//     vec3 stellarSurface = getThermalColor(coreFinalIntensity, uStarTemperature);

//     // ── VOLUMETRIC CORONA ATMOSPHERE GLOW ────────────────────────────────────
//     // Uses dual prime frequency configurations to execute organic dynamic wind pulses
//     float pulse1 = sin(uTime * 1.13) * cos(uTime * 2.71);
//     float pulse2 = cos(uTime * 1.73) * sin(uTime * 2.11);
    
//     float innerCorona = exp(-15.0 * max(dist - uCoreRadius, 0.0)) * (1.0 - coreMask);
//     float outerCorona = exp(-4.0 * max(dist - uCoreRadius * 0.5, 0.0)) * (1.0 - coreMask * 0.7);

//     vec3 compositeColor = stellarSurface * coreMask;
//     compositeColor += uCoronaColor * innerCorona * (0.8 + 0.05 * pulse1);
//     compositeColor += uCoronaColor * outerCorona * (0.25 + 0.04 * pulse2);

//     float alpha = coreMask + innerCorona * 0.75 + outerCorona * 0.22;

//     gl_FragColor = vec4(compositeColor * uIntensity, clamp(alpha, 0.0, 1.0));
//   }
// `;

// export interface ShaderPresetOptions {
//   core: string;
//   limb: string;
//   corona: string;
//   temperature: number; // Added to feed the thermal physics calculator
// }

// export function createStellarShaderMaterial(preset: ShaderPresetOptions): THREE.ShaderMaterial {
//   return new THREE.ShaderMaterial({
//     vertexShader,
//     fragmentShader,
//     uniforms: {
//       uTime:             { value: 0.0 },
//       uCoreColor:        { value: new THREE.Color(preset.core) },
//       uLimbColor:        { value: new THREE.Color(preset.limb) },
//       uCoronaColor:      { value: new THREE.Color(preset.corona) },
//       uCoreRadius:       { value: 0.49 },
//       uIntensity:        { value: 1.3 },
//       uStarTemperature:  { value: preset.temperature }, // Synced parameter node
//     },
//     blending:    THREE.AdditiveBlending,
//     transparent: true,
//     depthWrite:  false,
//   });
// }


// ==========================
// deep add geomatic (wave added)
// ==========================


// import * as THREE from "three";

// // Vertex Shader: Upgraded to calculate 3D Geometric Flare Displacement (Solar Prominences)
// const vertexShader = /* glsl */ `
//   uniform float uTime;
//   varying vec2 vUv;
//   varying vec3 vNormal;
//   varying vec3 vPosition;

//   // Simple 3D Noise for Vertex Displacement
//   float hash3(vec3 p) {
//     p = fract(p * 0.1031);
//     p += dot(p, p.yzx + 33.33);
//     return fract((p.x + p.y) * p.z);
//   }

//   float noise3D(vec3 p) {
//     vec3 i = floor(p);
//     vec3 f = fract(p);
//     vec3 u = f * f * (3.0 - 2.0 * f);
//     return mix(mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), u.x),
//                    mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), u.x), u.y),
//                mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), u.x),
//                    mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), u.x), u.y), u.z);
//   }

//   void main() {
//     vUv = uv;
//     vNormal = normalMatrix * normal;
//     vPosition = position;

//     // Secret 2: Solar Flares Geometry - Deform vertices along their normals using high-frequency noise
//     float pulse = noise3D(position * 2.5 + vec3(uTime * 0.6));
//     vec3 displacedPosition = position + normal * pulse * 0.12; 

//     gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
//   }
// `;

// // Fragment Shader: Extreme Physics Engine adding Sunspots and Shearing Equators
// const fragmentShader = /* glsl */ `
//   uniform float uTime;
//   uniform vec3  uCoreColor;     
//   uniform vec3  uLimbColor;     
//   uniform vec3  uCoronaColor;   
//   uniform float uCoreRadius;    
//   uniform float uIntensity;     
//   uniform float uStarTemperature; 

//   varying vec2 vUv;
//   varying vec3 vNormal;
//   varying vec3 vPosition;

//   vec2 hash2(vec2 p) {
//     p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
//     return fract(sin(p) * 43758.5453123);
//   }

//   float noise(vec2 p) {
//     vec2 i = floor(p);
//     vec2 f = fract(p);
//     vec2 u = f * f * (3.0 - 2.0 * f);
//     return mix(mix(fract(sin(dot(i + vec2(0.0,0.0), vec2(12.9898,78.233))) * 43758.5453),
//                    fract(sin(dot(i + vec2(1.0,0.0), vec2(12.9898,78.233))) * 43758.5453), u.x),
//                mix(fract(sin(dot(i + vec2(0.0,1.0), vec2(12.9898,78.233))) * 43758.5453),
//                    fract(sin(dot(i + vec2(1.0,1.0), vec2(12.9898,78.233))) * 43758.5453), u.x), u.y);
//   }

//   float fbm(vec2 p) {
//     float value = 0.0;
//     float amplitude = 0.5;
//     for (int i = 0; i < 3; i++) {
//       value += amplitude * noise(p);
//       p *= 2.1;
//       amplitude *= 0.5;
//     }
//     return value;
//   }

//   float voronoiGranulation(vec2 x, float dynamicTime) {
//     vec2 n = floor(x);
//     vec2 f = fract(x);
//     float minDist = 8.0;
//     for (int j = -1; j <= 1; j++) {
//       for (int i = -1; i <= 1; i++) {
//         vec2 g = vec2(float(i), float(j));
//         vec2 o = hash2(n + g);
//         o = 0.5 + 0.5 * sin(dynamicTime * 0.7 + 6.2831 * o);
//         vec2 r = g + o - f;
//         float d = dot(r, r);
//         if (d < minDist) minDist = d;
//       }
//     }
//     return sqrt(minDist);
//   }

//   vec3 getThermalColor(float intensityFactor, float tempType) {
//     vec3 blackBody;
//     if (tempType < 3700.0) {
//       vec3 c1 = vec3(0.10, 0.00, 0.00); // Sunspot base gap
//       vec3 c2 = vec3(0.72, 0.03, 0.00); 
//       vec3 c3 = vec3(0.98, 0.28, 0.01); 
//       vec3 c4 = vec3(1.00, 0.60, 0.05); 
//       if (intensityFactor < 0.3)      blackBody = mix(c1, c2, intensityFactor / 0.3);
//       else if (intensityFactor < 0.7) blackBody = mix(c2, c3, (intensityFactor - 0.3) / 0.4);
//       else                            blackBody = mix(c3, c4, (intensityFactor - 0.7) / 0.3);
//     } else if (tempType > 8000.0) {
//       vec3 c1 = vec3(0.00, 0.01, 0.15);
//       vec3 c2 = vec3(0.00, 0.18, 0.85);
//       vec3 c3 = vec3(0.25, 0.65, 1.00);
//       vec3 c4 = vec3(1.00, 1.00, 1.00);
//       if (intensityFactor < 0.3)      blackBody = mix(c1, c2, intensityFactor / 0.3);
//       else if (intensityFactor < 0.7) blackBody = mix(c2, c3, (intensityFactor - 0.3) / 0.4);
//       else                            blackBody = mix(c3, c4, (intensityFactor - 0.7) / 0.3);
//     } else {
//       vec3 c1 = vec3(0.20, 0.02, 0.00); 
//       vec3 c2 = vec3(0.85, 0.18, 0.00); 
//       vec3 c3 = vec3(1.00, 0.70, 0.02); 
//       vec3 c4 = vec3(1.00, 1.00, 0.90); 
//       if (intensityFactor < 0.25)     blackBody = mix(c1, c2, intensityFactor / 0.25);
//       else if (intensityFactor < 0.65) blackBody = mix(c2, c3, (intensityFactor - 0.25) / 0.40);
//       else                            blackBody = mix(c3, c4, (intensityFactor - 0.65) / 0.35);
//     }
//     return blackBody;
//   }

//   void main() {
//     vec2 centered = vUv - vec2(0.5);
//     float dist = length(centered);

//     float coreMask = 1.0 - smoothstep(uCoreRadius - 0.01, uCoreRadius + 0.005, dist);
//     float normalizedDist = clamp(dist / uCoreRadius, 0.0, 1.0);
//     float mu = sqrt(1.0 - normalizedDist * normalizedDist);
    
//     float uCoef = 0.48;
//     float vCoef = 0.25;
//     float limbDarkeningFactor = 1.0 - uCoef * (1.0 - mu) - vCoef * (1.0 - mu) * (1.0 - mu);
//     float limbFactor = coreMask * clamp(limbDarkeningFactor, 0.0, 1.0);

//     // ── SECRET 3: DYNAMIC DIFFERENTIAL ROTATION MATH ──────────────────────────
//     // Height factor: abs(vUv.y - 0.5) ranges from 0.0 (Equator) to 0.5 (Poles)
//     float latitudeFactor = abs(vUv.y - 0.5);
//     // Equator shears faster than poles via vertical mapping modifiers
//     float localTimeScale = uTime * (1.0 - latitudeFactor * 1.6);

//     // Dynamic shifted coordinates grid based on sheared timescales
//     vec2 shearedUv = vUv + vec2(localTimeScale * 0.015, 0.0);

//     // ── DOUBLE NESTED DOMAIN WARPING WITH SHEARED CLOCK ───────────────────────
//     vec2 q = vec2(fbm(shearedUv * 3.5 + vec2(localTimeScale * 0.03)), fbm(shearedUv * 3.5 + vec2(localTimeScale * 0.01)));
//     vec2 r = vec2(fbm(shearedUv * 4.5 + q * 2.0 + vec2(localTimeScale * 0.02)), fbm(shearedUv * 4.5 + q * 1.5 - vec2(localTimeScale * 0.03)));
    
//     float convectiveMix = voronoiGranulation(shearedUv * 28.0 + r * 4.0, localTimeScale);
//     float finalSurfaceMix = clamp(1.0 - convectiveMix, 0.0, 1.0);

//     // ── SECRET 1: SUNSPOTS SUPPRESSION MASK ──────────────────────────────────
//     // Low-frequency threshold noise to carve out dark active magnetic fields
//     float sunspotNoise = fbm(shearedUv * 4.0 - vec2(localTimeScale * 0.008));
//     float sunspotMask = smoothstep(0.72, 0.82, sunspotNoise); // Sharp mask mapping threshold

//     // Suppress hot granulation layers inside sunspot patches
//     float finalCoreIntensity = finalSurfaceMix * limbFactor * (1.0 - sunspotMask * 0.92);

//     // Map finalized weights to multi-tier thermal color ramps
//     vec3 stellarSurface = getThermalColor(finalCoreIntensity, uStarTemperature);

//     // Dynamic aperiodic corona wind expansions
//     float pulse1 = sin(uTime * 1.13) * cos(uTime * 2.71);
//     float pulse2 = cos(uTime * 1.73) * sin(uTime * 2.11);
//     float innerCorona = exp(-16.0 * max(dist - uCoreRadius, 0.0)) * (1.0 - coreMask);
//     float outerCorona = exp(-4.2 * max(dist - uCoreRadius * 0.5, 0.0)) * (1.0 - coreMask * 0.7);

//     vec3 compositeColor = stellarSurface * coreMask;
//     compositeColor += uCoronaColor * innerCorona * (0.88 + 0.05 * pulse1);
//     compositeColor += uCoronaColor * outerCorona * (0.30 + 0.04 * pulse2);

//     float alpha = coreMask + innerCorona * 0.78 + outerCorona * 0.25;

//     gl_FragColor = vec4(compositeColor * uIntensity, clamp(alpha, 0.0, 1.0));
//   }
// `;

// export interface ShaderPresetOptions {
//   core: string;
//   limb: string;
//   corona: string;
//   temperature: number;
// }

// export function createStellarShaderMaterial(preset: ShaderPresetOptions): THREE.ShaderMaterial {
//   return new THREE.ShaderMaterial({
//     vertexShader,
//     fragmentShader,
//     uniforms: {
//       uTime:             { value: 0.0 },
//       uCoreColor:        { value: new THREE.Color(preset.core) },
//       uLimbColor:        { value: new THREE.Color(preset.limb) },
//       uCoronaColor:      { value: new THREE.Color(preset.corona) },
//       uCoreRadius:       { value: 0.09 },
//       uIntensity:        { value: 1.35 }, // Boosted slightly for intense sunspot contrast
//       uStarTemperature:  { value: preset.temperature },
//     },
//     blending:    THREE.AdditiveBlending,
//     transparent: true,
//     depthWrite:  false,
//   });
// }


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

    // Apply double nested 3D coordinate domain warping vectors
    // vec3 p1 = vPosition * 3.0 + vec3(localTimeScale * 0.15, 0.0, localTimeScale * 0.08);
    // vec3 q = vec3(fbm3D(p1), fbm3D(p1 + vec3(2.3)), fbm3D(p1 + vec3(4.1)));
    // vec3 r = vec3(fbm3D(p1 + q * 1.8), fbm3D(p1 + q * 1.2), fbm3D(p1 + q * 1.5));
    
    // float surfaceTurbulence = fbm3D(p1 + r * 2.5);

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
      uIntensity:        { value: 1.35 },
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
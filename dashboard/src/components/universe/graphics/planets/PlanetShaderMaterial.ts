import * as THREE from "three";

// Planet Surface Vertex Shader
const planetVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Planet Surface Fragment Shader (Thermodynamic Classifier)
const planetFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uEqTemperature; // pl_eqt constant node
  uniform float uPlanetRadius;   // pl_rade size mapping metric
  uniform vec3  uBaseColor;
  uniform float uPlanetSeed;
  uniform float uPlanetMass;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  // 3D Math hash primitives
  float hash(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), u.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), u.x), u.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), u.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), u.x), u.y), u.z);
  }

  // ✅ PLACE THIS RIGHT ABOVE THE main() FUNCTION
  float fbm3D(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) { // 4 Octaves for heavy NASA level detailing
       value += amplitude * noise3D(p);
       p *= 2.05; // Lacunarity
       amplitude *= 0.5; // Gain
    }
    return value;
  }

  void main() {
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float diffuse = clamp(dot(vNormal, viewDir), 0.1, 1.0); // Basic physical day/night shading

    // ✅ INJECT SEED OFFSET TO CREATE 100% UNIQUE CONTINENTS/PATTERNS PER PLANET NAME
    // vec3 seededPosition = vPosition + vec3(uPlanetSeed * 0.42, -uPlanetSeed * 0.18, uPlanetSeed * 0.25);
    vec3 seededPosition = vPosition * 4.0 + vec3(uPlanetSeed * 0.45, -uPlanetSeed * 0.22, uPlanetSeed * 0.18);

    vec3 finalSurfaceColor = uBaseColor;

    float continentNoise = noise3D(seededPosition + vec3(uTime * 0.03));

    if (uEqTemperature <= 450.0 &&
        uPlanetRadius <= 3.0)
    {
        float landMask =
            smoothstep(
                0.45,
                0.55,
                continentNoise
            );

        finalSurfaceColor = mix(
            uBaseColor,
            vec3(0.25,0.42,0.15),
            landMask
        );

        if (uEqTemperature < 273.0)
        {
            float polarMask =
                smoothstep(
                    0.65,
                    0.85,
                    abs(vPosition.y)
                );

            finalSurfaceColor = mix(
                finalSurfaceColor,
                vec3(0.95,0.98,1.0),
                polarMask *
                (1.0 - landMask * 0.3)
            );
        }
    }

    // ── CONFIGURATION A: MOLTEN LAVA WORLDS (pl_eqt > 450K) ──────────────────
    if (uEqTemperature > 450.0) {
        // Use 3D domain warping to break path patterns into continental sheets
        vec3 warp = vec3(fbm3D(seededPosition * 3.0), fbm3D(seededPosition * 3.5), 0.0);
        float crackNoise = fbm3D(seededPosition * 6.0 + warp * 2.0);
        
        float lines = smoothstep(0.45, 0.68, crackNoise);
        vec3 lavaColor = vec3(1.0, 0.28, 0.0) * (1.5 + sin(uTime * 1.5)); 
        
        finalSurfaceColor = mix(vec3(0.12, 0.09, 0.09), lavaColor, lines);
    }
    
    // ── CONFIGURATION B: GAS GIANTS JOVIAN BANDING (pl_rade > 3.0) ───────────
    else if (uPlanetRadius > 3.0) {
        // 1. Create a chaotic storm coordinate offset (Vector distortion)
        vec3 warpDir = vec3(fbm3D(seededPosition * 2.0), fbm3D(seededPosition * 2.5), 0.0);
        
        // 2. Distort the coordinates lookup vector before feeding it to bands math
        vec3 distortedPos = seededPosition + warpDir * 1.5;

        // 3. Multilayered Jovian Bands combining large belts with micro-noise cells
        float baseBands = sin(distortedPos.y * 14.0 + fbm3D(distortedPos * 4.0) * 3.0);
        float detailStorms = fbm3D(distortedPos * 12.0 + vec3(uTime * 0.05, 0.0, 0.0));
        
        // Combine base belts with micro chaotic hurricanes loops
        float finalMix = clamp(baseBands * 0.7 + detailStorms * 0.4, 0.0, 1.0);
        
        // 4. Color Interpolation mapping over authentic organic palettes
        vec3 darkBelt = mix(uBaseColor, vec3(0.32, 0.16, 0.10), 0.6); // Deep mahogany
        vec3 lightBelt = mix(uBaseColor, vec3(0.85, 0.75, 0.65), 0.5); // Cream white ammonia
        
        finalSurfaceColor = mix(lightBelt, darkBelt, finalMix);
    }

    float cloudNoise =
        noise3D(
            vPosition * 7.0 +
            vec3(
                uTime * 0.06,
                uTime * 0.02,
                0.0
            )
        );

    float cloudMask =
        smoothstep(
            0.55,
            0.75,
            cloudNoise
        ) * 0.65;

    finalSurfaceColor = mix(
        finalSurfaceColor,
        vec3(1.0),
        cloudMask
    );

    gl_FragColor = vec4(finalSurfaceColor * diffuse, 1.0);
  }
`;

// ── MODULE 2: HOLOGRAPHIC RIM GLOW (RAYLEIGH ATMOSPHERE) ───────────────────
const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uAtmosphereColor;
  varying vec3 vNormal;

  void main() {
    // Secret 3: Fresnel Rim Glow Equation Math
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float intensity = pow(1.0 - clamp(dot(vNormal, viewDir), 0.0, 1.0), 4.5);

    gl_FragColor = vec4(uAtmosphereColor, intensity);
  }
`;

export function createPlanetMaterial(
  eqt: number,
  rade: number,
  baseHex: string,
  seed: number,
  mass: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: planetVertexShader,
    fragmentShader: planetFragmentShader,
    uniforms: {
      uTime: { value: 0.0 },
      uEqTemperature: { value: eqt },
      uPlanetRadius: { value: rade },
      uBaseColor: { value: new THREE.Color(baseHex) },
      uPlanetSeed: { value: seed },
      uPlanetMass: { value: mass },
    },
  });
}

export function createAtmosphereMaterial(
  colorHex: string,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms: {
      uAtmosphereColor: { value: new THREE.Color(colorHex) },
    },
    blending: THREE.AdditiveBlending,
    transparent: true,
    side: THREE.BackSide, // Render shell over back faces to wrap planet edge boundary limits
    depthWrite: false,
  });
}

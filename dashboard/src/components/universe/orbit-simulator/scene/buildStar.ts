/**
 * buildStar.ts
 * src/components/universe/orbit-simulator/scene/buildStar.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds the host star: point light, core mesh (shader material), and corona
 * billboard. Returns refs the caller needs for per-frame uniform updates and
 * camera distance calculations (star view framing).
 *
 * SRP: only constructs star-related meshes. No render-loop logic here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from "three";
import {
  createStarCoreMaterial,
  createStarCoronaMaterial,
} from "../../graphics/star/StarShaderMaterial";
import {
  STAR_MIN_RADIUS,
  STAR_RADIUS_SCALE,
  STAR_SPHERE_SEGMENTS,
  CORONA_SIZE_SCALE,
} from "../constants";

export interface StarBuildResult {
  coreMesh:    THREE.Mesh;
  coronaMesh:  THREE.Mesh;
  coreMat:     THREE.ShaderMaterial;
  coronaMat:   THREE.ShaderMaterial;
  pointLight:  THREE.PointLight;
  sphereRadiusWS: number; // world-space star radius — used by star-view camera framing
}

export interface StarParams {
  temperature_kelvin?: number;
  radius_solar?: number;
}

function resolveStarPreset(temperatureK: number) {
  return {
    core:    temperatureK < 3700 ? "#ff5522" : temperatureK > 8000 ? "#e8f4ff" : "#fffef0",
    limb:    temperatureK < 3700 ? "#cc1100" : temperatureK > 8000 ? "#80c0ff" : "#ffd060",
    corona:  temperatureK < 3700 ? "#ff3333" : temperatureK > 8000 ? "#0066ff" : "#ffb830",
    temperature: temperatureK,
  };
}

/**
 * Builds star core + corona + point light into the scene.
 * Returns mesh/material refs and the computed world-space sphere radius.
 */
export function buildStar(scene: THREE.Scene, starParams: StarParams): StarBuildResult {
  const temperatureK = starParams.temperature_kelvin ?? 5778;
  const radiusSolar  = starParams.radius_solar ?? 1.0;
  const preset       = resolveStarPreset(temperatureK);

  const pointLight = new THREE.PointLight("#ffdf90", 4.0, 300, 0.5);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);

  const sphereRadiusWS = Math.max(STAR_MIN_RADIUS, radiusSolar * STAR_RADIUS_SCALE);
  const coreGeo = new THREE.SphereGeometry(sphereRadiusWS, STAR_SPHERE_SEGMENTS, STAR_SPHERE_SEGMENTS);
  const coreMat = createStarCoreMaterial(preset);
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.name = "starCore";
  scene.add(coreMesh);

  const coronaSize = sphereRadiusWS * CORONA_SIZE_SCALE;
  const coronaGeo = new THREE.PlaneGeometry(coronaSize, coronaSize);
  const coronaMat = createStarCoronaMaterial(preset);
  const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
  coronaMesh.name = "starCorona";
  scene.add(coronaMesh);

  return { coreMesh, coronaMesh, coreMat, coronaMat, pointLight, sphereRadiusWS };
}
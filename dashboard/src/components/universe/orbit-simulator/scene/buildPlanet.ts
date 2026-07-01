/**
 * buildPlanet.ts
 * src/components/universe/orbit-simulator/scene/buildPlanet.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds a single planet's full visual stack: core mesh (shader material),
 * atmosphere shell, and glow sprite. Tags the mesh with userData so the
 * raycaster interaction hook can identify it on click without a separate
 * lookup table.
 *
 * SRP: only constructs the planet's THREE objects. No orbit, no camera,
 * no click-handling logic here — those live in their own modules.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from "three";
import {
  createAtmosphereMaterial,
  createPlanetMaterial,
} from "../../graphics/planets/PlanetShaderMaterial";
import type { PlanetConfig } from "../types";
import { buildPlanetGlow } from "./buildPlanetGlow";
import {
  PLANET_MIN_RADIUS,
  PLANET_RADIUS_SCALE,
  PLANET_SPHERE_SEGMENTS,
  ATMOSPHERE_SCALE,
  PLANET_COLOR_GAS_GIANT,
  PLANET_COLOR_HOT,
  PLANET_COLOR_COLD,
  PLANET_COLOR_DEFAULT,
  GAS_GIANT_MASS_THRESHOLD,
  HOT_TEMP_THRESHOLD_K,
  COLD_TEMP_THRESHOLD_K,
} from "../constants";

function resolvePlanetPalette(massEarth: number, eqTempK: number) {
  if (massEarth > GAS_GIANT_MASS_THRESHOLD) return PLANET_COLOR_GAS_GIANT;
  if (eqTempK > HOT_TEMP_THRESHOLD_K) return PLANET_COLOR_HOT;
  if (eqTempK < COLD_TEMP_THRESHOLD_K) return PLANET_COLOR_COLD;
  return PLANET_COLOR_DEFAULT;
}

/**
 * Builds a planet mesh (+ atmosphere + glow), attaches it to the scene,
 * and tags userData for click-to-select interaction.
 * Returns the core mesh — caller tracks it in planetMeshesRef.
 */
export function buildPlanet(
  scene: THREE.Scene,
  planet: PlanetConfig,
  planetSeed: number,
): THREE.Mesh {
  const eqTemp = planet.equilibrium_temperature_k ?? 250.0;
  const planetRad = planet.radius_earth || 1.0;
  const planetMass = planet.mass_earth ?? 1.0;

  const meshRadius = Math.max(
    PLANET_MIN_RADIUS,
    planetRad * PLANET_RADIUS_SCALE,
  );
  const palette = resolvePlanetPalette(planetMass, eqTemp);

  const planetGeo = new THREE.SphereGeometry(
    meshRadius,
    PLANET_SPHERE_SEGMENTS,
    PLANET_SPHERE_SEGMENTS,
  );
  const planetMat = createPlanetMaterial(
    eqTemp,
    planetRad,
    palette.base,
    planetSeed,
    planetMass,
  );
  const planetMesh = new THREE.Mesh(planetGeo, planetMat);

  planetMesh.name = `planet_${planet.planet_name}`;
  planetMesh.userData.planetName = planet.planet_name;
  planetMesh.userData.clickable = true;

  const atmoGeo = new THREE.SphereGeometry(
    meshRadius * ATMOSPHERE_SCALE,
    PLANET_SPHERE_SEGMENTS,
    PLANET_SPHERE_SEGMENTS,
  );
  const atmoMat = createAtmosphereMaterial(palette.atmo);
  const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
  planetMesh.add(atmoMesh);

  const glowSprite = buildPlanetGlow();
  planetMesh.add(glowSprite);

  scene.add(planetMesh);

  return planetMesh;
}

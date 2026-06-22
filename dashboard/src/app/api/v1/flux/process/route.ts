import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { starSystems, planetaryBodies, lightCurves } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // 1. Extract Target Parameter from incoming URL parameters safely
    const { searchParams } = new URL(request.url);
    const target = searchParams.get("target");

    if (!target) {
      return NextResponse.json(
        { error: "Missing required query parameter: target" },
        { status: 400 },
      );
    }

    const standardizedTarget = target.trim();

    // ── 🔍 LAYER 1: UNIFIED REGISTRY IDENTITY RESOLUTION (ALIAS LOOKUP PRE-FLIGHT) ──
    // Sabse pehle, check karenge ki kya ye planet hamare system me unique register hai
    console.log(
      `[Cache Lookup] Index scanning planetary_bodies for: "${standardizedTarget}"`,
    );

    const [existingPlanet] = await db
      .select()
      .from(planetaryBodies)
      .where(eq(planetaryBodies.planetName, standardizedTarget))
      .limit(1);

    // ── 🚀 LAYER 2: CACHE HIT (SERVING THE WHOLE CORES SHARED RELATIONAL MATRIX) ──
    if (existingPlanet) {
      const [systemCache] = await db
        .select()
        .from(starSystems)
        .where(eq(starSystems.id, existingPlanet.systemId))
        .limit(1);

      if (systemCache) {
        console.log(
          `[Cache Hit] System locked. Serving entire family grid for '${systemCache.systemId}'`,
        );

        const siblingPlanets = await db
          .select()
          .from(planetaryBodies)
          .where(eq(planetaryBodies.systemId, systemCache.id));

        const siblingIds = siblingPlanets.map((p) => p.id);
        const allLightCurves =
          siblingIds.length > 0
            ? await db
                .select()
                .from(lightCurves)
                .where(
                  siblingIds.length === 1
                    ? eq(lightCurves.planetId, siblingIds[0])
                    : inArray(lightCurves.planetId, siblingIds),
                )
            : [];

        return NextResponse.json({
          source: "relational_database_cache",
          system_id: systemCache.systemId,
          space_location: {
            distance_parsecs: systemCache.distanceParsecs,
            distance_light_years: systemCache.distanceLightYears,
            right_ascension_deg: systemCache.rightAscensionDeg,
            declination_deg: systemCache.declinationDeg,
            galactic_longitude_deg: systemCache.galacticLongitudeDeg,
            galactic_latitude_deg: systemCache.galacticLatitudeDeg,
            unit_sky_vector: {
              x: systemCache.vectorX,
              y: systemCache.vectorY,
              z: systemCache.vectorZ,
            },
            total_planets_in_system: systemCache.totalPlanets,
          },
          star_parameters: {
            canonical_name: systemCache.canonicalName,
            spectral_type: systemCache.spectralType,
            mass_solar: systemCache.massSolar,
            radius_solar: systemCache.radiusSolar,
            temperature_kelvin: systemCache.temperatureKelvin,
            luminosity_log: systemCache.luminosityLog,
            surface_gravity_logg: systemCache.surfaceGravityLogg,
            metallicity_dex: systemCache.metallicityDex,
            rotation_period_days: systemCache.rotationPeriodDays,
            estimated_age_gyr: systemCache.estimatedAgeGyr,
          },
          simulation_grid: siblingPlanets.map((p) => {
            const lc = allLightCurves.find((l) => l.planetId === p.id);
            return {
              planet_name: p.planetName,
              classification_type: p.classificationType,
              radius_earth: p.radiusEarth,
              mass_earth: p.massEarth,
              semi_major_axis_au: p.semiMajorAxisAu,
              eccentricity: p.eccentricity,
              orbital_period_days: p.orbitalPeriodDays,
              inclination_degrees: p.inclinationDegrees,
              equilibrium_temperature_k: p.equilibriumTemperatureK,
              insolation_flux_earth: p.insolationFluxEarth,
              transit_depth_percent: p.transitDepthPercent,
              discovery_history: {
                year: p.discoveryYear,
                facility: p.discoveryFacility,
              },
              scientific_arrays: lc
                ? { time: lc.timeArray, flux: lc.fluxArray }
                : { time: [], flux: [] },
            };
          }),
        });
      }
    }

    // ── 🛰️ LAYER 3: CACHE MISS ── ORCHESTRATE HANDSHAKE WITH FASTAPI WORKER
    console.log(
      `[Cache Miss] Routing matrix request to modular data-worker node for target: ${standardizedTarget}`,
    );

    const pythonWorkerBaseUrl =
      process.env.PYTHON_WORKER_URL || "http://127.0.0.1:8000";
    const workerEndpoint = `${pythonWorkerBaseUrl}/api/v1/flux/process?target=${encodeURIComponent(standardizedTarget)}`;

    const workerResponse = await fetch(workerEndpoint, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!workerResponse.ok) {
      const errorPayload = await workerResponse.json().catch(() => ({}));
      throw new Error(
        errorPayload.detail ||
          `Data-worker connection fallback error with status code: ${workerResponse.status}`,
      );
    }

    const remoteSystemPayload = await workerResponse.json();

    // ── 🗄️ LAYER 4: TRANSACTIONAL SEEDING (ACID DOUBLE-STAGED INSERT) ──
    console.log(
      `[Database Seeding] Initializing system pipeline write transaction for host system...`,
    );

    const finalizedMatrixOutput = await db.transaction(async (tx) => {
      // Step A: Insert the Master Star System Metadata parameters
      const [insertedSystem] = await tx
        .insert(starSystems)
        .values({
          systemId: remoteSystemPayload.system_id,
          canonicalName: remoteSystemPayload.star_parameters.canonical_name,
          distanceParsecs: remoteSystemPayload.space_location.distance_parsecs,
          distanceLightYears:
            remoteSystemPayload.space_location.distance_light_years,
          rightAscensionDeg:
            remoteSystemPayload.space_location.right_ascension_deg,
          declinationDeg: remoteSystemPayload.space_location.declination_deg,
          galacticLongitudeDeg:
            remoteSystemPayload.space_location.galactic_longitude_deg,
          galacticLatitudeDeg:
            remoteSystemPayload.space_location.galactic_latitude_deg,
          vectorX: remoteSystemPayload.space_location.unit_sky_vector.x,
          vectorY: remoteSystemPayload.space_location.unit_sky_vector.y,
          vectorZ: remoteSystemPayload.space_location.unit_sky_vector.z,
          spectralType: remoteSystemPayload.star_parameters.spectral_type,
          massSolar: remoteSystemPayload.star_parameters.mass_solar,
          radiusSolar: remoteSystemPayload.star_parameters.radius_solar,
          temperatureKelvin:
            remoteSystemPayload.star_parameters.temperature_kelvin,
          luminosityLog: remoteSystemPayload.star_parameters.luminosity_log,
          surfaceGravityLogg:
            remoteSystemPayload.star_parameters.surface_gravity_logg,
          metallicityDex: remoteSystemPayload.star_parameters.metallicity_dex,
          rotationPeriodDays:
            remoteSystemPayload.star_parameters.rotation_period_days,
          estimatedAgeGyr:
            remoteSystemPayload.star_parameters.estimated_age_gyr,
          totalPlanets:
            remoteSystemPayload.space_location.total_planets_in_system,
        })
        .onConflictDoNothing() // Security boundary block in case concurrent routines pull records
        .returning();

      // Resolve targeted system primary key lookup
      const actualSystemId = insertedSystem
        ? insertedSystem.id
        : (
            await tx
              .select()
              .from(starSystems)
              .where(eq(starSystems.systemId, remoteSystemPayload.system_id))
          )[0].id;

      // Temporary arrays to structure clean client return payload during pipeline execution
      const hydratedGrid = [];

      // Step B: Loop dynamically over the simulation grid array to inject all sibling worlds recursively
      for (const planetData of remoteSystemPayload.simulation_grid) {
        const [insertedPlanet] = await tx
          .insert(planetaryBodies)
          .values({
            systemId: actualSystemId,
            planetName: planetData.planet_name,
            classificationType: planetData.classification_type,
            radiusEarth: planetData.radius_earth,
            massEarth: planetData.mass_earth,
            semiMajorAxisAu: planetData.semi_major_axis_au,
            eccentricity: planetData.eccentricity,
            orbitalPeriodDays: planetData.orbital_period_days,
            inclinationDegrees: planetData.inclination_degrees,
            equilibriumTemperatureK: planetData.equilibrium_temperature_k,
            insolationFluxEarth: planetData.insolation_flux_earth,
            transitDepthPercent: planetData.transit_depth_percent,
            discoveryYear: planetData.discovery_history.year,
            discoveryFacility: planetData.discovery_history.facility,
          })
          .returning();

        // Generate synthetic time-series lightcurve mock streaming blocks on the fly inside the transaction
        const mockTimeArray = Array.from({ length: 150 }, (_, idx) =>
          parseFloat(((idx / 150) * planetData.orbital_period_days).toFixed(4)),
        );
        const mockFluxArray = mockTimeArray.map((t) => {
          const phase =
            (t % planetData.orbital_period_days) /
            planetData.orbital_period_days;
          return phase > 0.49 && phase < 0.51
            ? parseFloat(
                (1.0 - planetData.transit_depth_percent / 100).toFixed(5),
              )
            : 1.0;
        });

        // Step C: Stream photometric datasets safely into the JSONB grids
        await tx.insert(lightCurves).values({
          planetId: insertedPlanet.id,
          timeArray: mockTimeArray,
          fluxArray: mockFluxArray,
        });

        hydratedGrid.push({
          ...planetData,
          scientific_arrays: { time: mockTimeArray, flux: mockFluxArray },
        });
      }

      return {
        ...remoteSystemPayload,
        simulation_grid: hydratedGrid,
      };
    });

    console.log(
      `[Success] Entire relational family cached and returned for target trace: ${standardizedTarget}`,
    );
    return NextResponse.json({
      source: "nasa_ingestion_broker_stream",
      ...finalizedMatrixOutput,
    });
  } catch (error: any) {
    console.error("[Gateway Sync Controller Crash]:", error.message);
    return NextResponse.json(
      {
        error: "Internal Multi-Body Gateway Ingestion Failure",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

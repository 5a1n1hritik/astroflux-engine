import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stellarTargets, lightCurves } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // 1. Extract Target Parameter from incoming URL
    const { searchParams } = new URL(request.url);
    const target = searchParams.get("target");
    const mission = searchParams.get("mission") || "Kepler";

    if (!target) {
      return NextResponse.json(
        { error: "Missing required query parameter: target" },
        { status: 400 }
      );
    }

    // Standardizing the input name for strict database lookup consistency
    // Direct trim without forcing uppercase, preserving standard TAP alphanumeric casing (e.g., 'Kepler-452 b')
    const standardizedTarget = target.trim()

    // 2. CACHE LOOKUP: Drizzle ORM se database me target check karna
    console.log(`[Cache Lookup] Checking database for: "${standardizedTarget}"`);
    const cachedSystem = await db.query.stellarTargets.findFirst({
      where: eq(stellarTargets.targetName, standardizedTarget),
      with: {
        lightCurves: true, // Auto-SQL JOIN triggered by Drizzle Relations Map
      },
    });

    // 3. CACHE HIT LAYER: Agar data pehle se DB me maujood hai
    if (cachedSystem && cachedSystem.lightCurves.length > 0) {
      console.log(`[Cache Hit] Serving ${standardizedTarget} directly from Database.`);
      return NextResponse.json({
        source: "database_cache",
        metadata: {
          id: cachedSystem.id,
          target_name: cachedSystem.targetName,
          host_name: cachedSystem.hostName,
          mission: cachedSystem.mission,
          orbital_period: cachedSystem.orbitalPeriod,
          semi_major_axis: cachedSystem.semiMajorAxis,
          eccentricity: cachedSystem.eccentricity,
          orbital_inclination: cachedSystem.orbitalInclination,
          planet_radius: cachedSystem.planetRadius,
          planet_mass: cachedSystem.planetMass,
          equilibrium_temperature: cachedSystem.equilibriumTemperature,
          insolation_flux: cachedSystem.insolationFlux,
          star_mass: cachedSystem.starMass,
          star_radius: cachedSystem.starRadius,
          star_temperature: cachedSystem.starTemperature,
          star_luminosity: cachedSystem.starLuminosity,
          star_logg: cachedSystem.starLogg,
          star_age: cachedSystem.starAge,
          star_spectype: cachedSystem.starSpecType,
          system_distance: cachedSystem.systemDistance,
          system_planets_count: cachedSystem.systemPlanetsCount,
        },
        // scientific_arrays: {
        //   time: cachedSystem.lightCurves[0].timeArray,
        //   flux: cachedSystem.lightCurves[0].fluxArray,
        // },
        scientific_arrays: cachedSystem.lightCurves.length > 0 ? cachedSystem.lightCurves[0].timeArray : { time: [], flux: [] }
      });
    }

    // 4. CACHE MISS & INTER-SERVICE HANDSHAKE: Trigger Python Data Worker
    console.log(`[Cache Miss] Triggering Python Worker for: ${standardizedTarget}`);

    const pythonWorkerBaseUrl = process.env.PYTHON_WORKER_URL || "http://127.0.0.1:8000";
    // const workerEndpoint = `${pythonWorkerBaseUrl}/api/v1/flux/process?target=${encodeURIComponent(target)}&mission=${encodeURIComponent(mission)}`;
    const workerEndpoint = `${pythonWorkerBaseUrl}/api/v1/flux/process?target=${encodeURIComponent(standardizedTarget)}`;

    // Internal service call with error safety netting
    const workerResponse = await fetch(workerEndpoint, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!workerResponse.ok) {
      const errorData = await workerResponse.json().catch(() => ({}));
      throw new Error(errorData.detail || `Python Worker failed with status ${workerResponse.status}`);
    }

    if (!workerResponse.ok) {
      const errorPayload = await workerResponse.json().catch(() => ({}));
      throw new Error(errorPayload.detail || `Python Worker node failed with status: ${workerResponse.status}`);
    }

    const remotePayload = await workerResponse.json();
    const { metadata: remoteMeta, scientific_arrays: remoteArrays } = remotePayload;

    // 5. AUTO-SEEDING DATA LAYER: Drizzle ORM Transaction Write
    console.log(`[Database Seeding] Storing parsed NASA data for: ${standardizedTarget}`);
    
    // Pure ACID transaction to ensure data integrity across relational tables
    const transactionPayload = await db.transaction(async (tx) => {
      // Step A: Insert into stellar_targets (Metadata)
      const [newTarget] = await tx
        .insert(stellarTargets)
        .values({
          targetName: remoteMeta.target_name,
          hostName: remoteMeta.host_name,
          mission: remoteMeta.mission || "Kepler",
          orbitalPeriod: remoteMeta.orbital_period,
          semiMajorAxis: remoteMeta.semi_major_axis,
          eccentricity: remoteMeta.eccentricity,
          orbitalInclination: remoteMeta.orbital_inclination,
          planetRadius: remoteMeta.planet_radius,
          planetMass: remoteMeta.planet_mass,
          equilibriumTemperature: remoteMeta.equilibrium_temperature,
          insolationFlux: remoteMeta.insolation_flux,
          starMassSolar: remoteMeta.star_mass,   // Backward mapping preserve
          starRadiusSolar: remoteMeta.star_radius, // Backward mapping preserve
          starMass: remoteMeta.star_mass,
          starRadius: remoteMeta.star_radius,
          starTemperature: remoteMeta.star_temperature,
          starLuminosity: remoteMeta.star_luminosity,
          starLogg: remoteMeta.star_logg,
          starAge: remoteMeta.star_age,
          starSpecType: remoteMeta.star_spectype,
          systemDistance: remoteMeta.system_distance,
          systemPlanetsCount: remoteMeta.system_planets_count,
        })
        .returning();

      // Step B: Insert the massive arrays into light_curves using JSONB formatting
      // await tx.insert(lightCurves).values({
      //   targetId: newTarget.id,
      //   timeArray: remoteData.scientific_arrays.time,
      //   fluxArray: remoteData.scientific_arrays.flux,
      // });
      await tx.insert(lightCurves).values({
        targetId: newTarget.id,
        timeArray: remoteArrays, // Multi-channel JSON object preservation
        fluxArray: remoteArrays, // Seamless dual indexing mapping structural safety
      });

      return newTarget;
    });

    console.log(`[Success] Target ${standardizedTarget} successfully cached and indexed.`);

    // 6. Return response back to UI/Rust Client
    return NextResponse.json({
      source: "nasa_tap_ingestion_broker",
      metadata: {
        id: transactionPayload.id,
        target_name: transactionPayload.targetName,
        host_name: transactionPayload.hostName,
        orbital_period: transactionPayload.orbitalPeriod,
        semi_major_axis: transactionPayload.semiMajorAxis,
        eccentricity: transactionPayload.eccentricity,
        orbital_inclination: transactionPayload.orbitalInclination,
        planet_radius: transactionPayload.planetRadius,
        planet_mass: transactionPayload.planetMass,
        star_radius: transactionPayload.starRadius,
        star_temperature: transactionPayload.starTemperature,
        star_luminosity: transactionPayload.starLuminosity,
        system_distance: transactionPayload.systemDistance,
        system_planets_count: transactionPayload.systemPlanetsCount
      },
      scientific_arrays: remoteArrays
    });

  } catch (error: any) {
    console.error("[Tunnel Controller Crash]:", error.message);
    return NextResponse.json(
      { error: "Internal Gateway Routing Failure", details: error.message },
      { status: 500 }
    );
  }
}
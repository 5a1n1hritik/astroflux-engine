import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stellarTargets, lightCurves } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // 1. URL se Query Parameters (target aur mission) extract karna
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
    const standardizedTarget = target.trim().toUpperCase();

    // 2. CACHE LOOKUP: Drizzle ORM se database me target check karna
    console.log(`[Cache Lookup] Checking database for: ${standardizedTarget}`);
    const existingTarget = await db.query.stellarTargets.findFirst({
      where: eq(stellarTargets.targetName, standardizedTarget),
      with: {
        lightCurves: true, // Auto-SQL JOIN triggered by Drizzle Relations Map
      },
    });

    // 3. CACHE HIT LAYER: Agar data pehle se DB me maujood hai
    if (existingTarget && existingTarget.lightCurves.length > 0) {
      console.log(`[Cache Hit🚀] Serving ${standardizedTarget} directly from Database.`);
      return NextResponse.json({
        source: "database_cache",
        metadata: {
          target_name: existingTarget.targetName,
          mission: existingTarget.mission,
          star_mass_solar: existingTarget.starMassSolar,
          star_radius_solar: existingTarget.starRadiusSolar,
        },
        scientific_arrays: {
          time: existingTarget.lightCurves[0].timeArray,
          flux: existingTarget.lightCurves[0].fluxArray,
        },
      });
    }

    // 4. CACHE MISS & INTER-SERVICE HANDSHAKE: Trigger Python Data Worker
    console.log(`[Cache Miss ⚠️] Triggering Python Worker for: ${standardizedTarget}`);
    const pythonWorkerBaseUrl = process.env.PYTHON_WORKER_URL || "http://127.0.0.1:8000";
    const pythonWorkerUrl = `${pythonWorkerBaseUrl}/api/v1/flux/process?target=${encodeURIComponent(target)}&mission=${encodeURIComponent(mission)}`;

    // Internal service call with error safety netting
    const workerResponse = await fetch(pythonWorkerUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!workerResponse.ok) {
      const errorData = await workerResponse.json().catch(() => ({}));
      throw new Error(errorData.detail || `Python Worker failed with status ${workerResponse.status}`);
    }

    const remoteData = await workerResponse.json();

    // 5. AUTO-SEEDING DATA LAYER: Drizzle ORM Transaction Write
    console.log(`[Database Seeding] Storing parsed NASA data for: ${standardizedTarget}`);
    
    // Pure ACID transaction to ensure data integrity across relational tables
    const pipelineResult = await db.transaction(async (tx) => {
      // Step A: Insert into stellar_targets (Metadata)
      const [newTarget] = await tx
        .insert(stellarTargets)
        .values({
          targetName: standardizedTarget,
          mission: remoteData.metadata.mission,
          starMassSolar: remoteData.metadata.star_mass_solar,
          starRadiusSolar: remoteData.metadata.star_radius_solar,
        })
        .returning();

      // Step B: Insert the massive arrays into light_curves using JSONB formatting
      await tx.insert(lightCurves).values({
        targetId: newTarget.id,
        timeArray: remoteData.scientific_arrays.time,
        fluxArray: remoteData.scientific_arrays.flux,
      });

      return newTarget;
    });

    console.log(`[Success 🎉] Target ${standardizedTarget} successfully cached and indexed.`);

    // 6. Return response back to UI/Rust Client
    return NextResponse.json({
      source: "nasa_mast_pipeline",
      metadata: {
        target_name: pipelineResult.targetName,
        mission: pipelineResult.mission,
        star_mass_solar: pipelineResult.starMassSolar,
        star_radius_solar: pipelineResult.starRadiusSolar,
      },
      scientific_arrays: remoteData.scientific_arrays,
    });

  } catch (error: any) {
    console.error("[Tunnel Controller Crash]:", error.message);
    return NextResponse.json(
      { error: "Internal Gateway Routing Failure", details: error.message },
      { status: 500 }
    );
  }
}
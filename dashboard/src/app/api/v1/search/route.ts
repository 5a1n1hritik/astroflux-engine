import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * /api/v1/search/route.ts
 * ──────────────────────────────────────────────────────────────────────────
 * RAM-cached exoplanet search. JSON loaded once into module-level cache.
 * All filtering happens in-process — no Python worker call on search.
 *
 * GET /api/v1/search?q=kepler&limit=20
 * ──────────────────────────────────────────────────────────────────────────
 */

interface CatalogEntry {
  name:             string;
  type:             "planet" | "star";
  planet_type?:     string;
  star_name?:       string;
  star_type:        string;
  discovery_year?:  number | null;
  distance_ly?:     number | null;
  planets_in_system: number;
}

// ── Module-level RAM cache ─────────────────────────────────────────────────
let _catalog: CatalogEntry[] | null = null;

function getCatalog(): CatalogEntry[] {
  if (_catalog) return _catalog;

  const filePath = join(process.cwd(), "src", "lib", "constants", "exoplanet_master.json");

  try {
    const raw = readFileSync(filePath, "utf-8");
    _catalog  = JSON.parse(raw) as CatalogEntry[];
    console.log(`[Search Cache] Loaded ${_catalog.length} entries into RAM.`);
    return _catalog;
  } catch {
    console.warn("[Search Cache] exoplanet_master.json not found. Run data-worker first.");
    _catalog = [];
    return _catalog;
  }
}

// ── Filter logic ───────────────────────────────────────────────────────────

function filterCatalog(catalog: CatalogEntry[], query: string, limit: number): CatalogEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: CatalogEntry[] = [];

  for (const entry of catalog) {
    if (results.length >= limit) break;
    if (entry.name.toLowerCase().includes(q)) {
      results.push(entry);
    }
  }

  return results;
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q     = searchParams.get("q") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30"), 100);

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const catalog = getCatalog();

  if (catalog.length === 0) {
    return NextResponse.json(
      { error: "Catalog not ready. Start data-worker to generate exoplanet_master.json." },
      { status: 503 }
    );
  }

  const results = filterCatalog(catalog, q, limit);

  return NextResponse.json({ results, total: results.length });
}
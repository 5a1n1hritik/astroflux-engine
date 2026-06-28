"""
catalog_service.py
data-worker/app/services/catalog_service.py
──────────────────────────────────────────────────────────────────────────────
Single-run bulk catalog dump service.
Fetches all confirmed exoplanets + host stars from NASA TAP API.
Applies MK spectral estimation and radius-based planet classification.
Dumps to dashboard/src/lib/constants/exoplanet_master.json
──────────────────────────────────────────────────────────────────────────────
"""

import requests
import json
import os
import logging
from pathlib import Path

log = logging.getLogger("datastellar.worker.catalog")

# Output path relative to data-worker directory
OUTPUT_PATH = Path(__file__).parent.parent.parent.parent / "dashboard" / "src" / "lib" / "constants" / "exoplanet_master.json"

TAP_URL = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"

# Single bulk query — all confirmed planets with host star params
BULK_QUERY = """
    select 
        pl_name, hostname, sy_pnum,
        pl_rade, pl_masse, pl_orbper,
        disc_year, disc_facility,
        st_spectype, st_teff, st_lum, st_logg,
        st_rad, st_mass,
        sy_dist
    from ps
    where default_flag = 1
    order by pl_name
"""


def estimate_spectral_type(st_spectype: str | None, st_teff: float | None) -> str:
    """MK classification: use st_spectype if available, else estimate from teff."""
    if st_spectype:
        c = st_spectype.strip().upper()
        for cls in ["O", "B", "A", "F", "G", "K", "M"]:
            if c.startswith(cls):
                return cls
    if st_teff is None:
        return "Unknown"
    if st_teff >= 30000: return "O"
    if st_teff >= 10000: return "B"
    if st_teff >= 7500:  return "A"
    if st_teff >= 6000:  return "F"
    if st_teff >= 5200:  return "G"
    if st_teff >= 3700:  return "K"
    return "M"


def classify_planet(pl_rade: float | None) -> str:
    """NASA radius-based planet classification."""
    if pl_rade is None:
        return "Unclassified"
    if pl_rade < 1.25: return "Terrestrial"
    if pl_rade < 2.0:  return "Super-Earth"
    if pl_rade < 6.0:  return "Neptune-like"
    return "Gas Giant"


def safe_float(val) -> float | None:
    try:
        return float(val) if val is not None else None
    except (ValueError, TypeError):
        return None


def safe_int(val) -> int | None:
    try:
        return int(val) if val is not None else None
    except (ValueError, TypeError):
        return None


def run_catalog_dump() -> dict:
    """
    Main entry point. Fetches NASA TAP, builds catalog, writes JSON.
    Returns summary dict.
    """
    log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    log.info("CATALOG DUMP INITIATED ── Fetching NASA TAP bulk payload...")

    try:
        res = requests.get(
            TAP_URL,
            params={"query": BULK_QUERY, "format": "json"},
            timeout=120,
        )
        res.raise_for_status()
        raw = res.json()
    except Exception as e:
        log.error(f"TAP fetch failed: {e}")
        return {"status": "error", "message": str(e)}

    log.info(f"TAP returned {len(raw)} rows — processing...")

    entries: list[dict] = []
    seen_stars: set[str] = set()

    for row in raw:
        pl_name    = row.get("pl_name")
        hostname   = row.get("hostname")
        sy_pnum    = safe_int(row.get("sy_pnum")) or 1
        pl_rade    = safe_float(row.get("pl_rade"))
        disc_year  = safe_int(row.get("disc_year"))
        sy_dist    = safe_float(row.get("sy_dist"))
        st_spectype = row.get("st_spectype")
        st_teff    = safe_float(row.get("st_teff"))

        dist_ly = round(sy_dist * 3.26156, 1) if sy_dist else None
        star_type = estimate_spectral_type(st_spectype, st_teff)
        planet_type = classify_planet(pl_rade)

        # ── Planet entry ──
        if pl_name:
            entries.append({
                "name":             pl_name,
                "type":             "planet",
                "planet_type":      planet_type,
                "star_name":        hostname,
                "star_type":        star_type,
                "discovery_year":   disc_year,
                "distance_ly":      dist_ly,
                "planets_in_system": sy_pnum,
            })

        # ── Star entry (deduplicated) ──
        if hostname and hostname not in seen_stars:
            seen_stars.add(hostname)
            entries.append({
                "name":             hostname,
                "type":             "star",
                "star_type":        star_type,
                "distance_ly":      dist_ly,
                "planets_in_system": sy_pnum,
            })

    # Ensure output directory exists
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(entries, f, separators=(",", ":"))

    planet_count = sum(1 for e in entries if e["type"] == "planet")
    star_count   = sum(1 for e in entries if e["type"] == "star")

    log.info(f"CATALOG DUMP SUCCESS ── {planet_count} planets + {star_count} stars → {OUTPUT_PATH}")
    log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    return {
        "status":  "success",
        "planets": planet_count,
        "stars":   star_count,
        "total":   len(entries),
    }
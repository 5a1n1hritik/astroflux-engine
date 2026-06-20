import logging
from app.utils.nasa_client import NasanArchiveClient

log = logging.getLogger("datastellar.worker.service")

class TelemetryOrchestrationService:
    def __init__(self):
        self.nasa_client = NasanArchiveClient()

    def generate_system_matrix(self, target_name: str) -> dict:
        # 1. Resolve official system name identity mapping
        true_hostname, alias_payload = self.nasa_client.resolve_canonical_hostname(target_name)
        if not true_hostname:
            return {"status": "error", "message": "Target name initialization failed mapping alias grids."}
            
        # 2. Extract multi-body siblings lists
        raw_payload = self.nasa_client.fetch_system_raw_payload(true_hostname)
        if not raw_payload:
            return {"status": "error", "message": "Database lookup timed out across relational tables views."}

        # 3. Dynamic Database-driven display parsing (No user trust logic)
        planets_dict = alias_payload.get("system", {}).get("objects", {}).get("planet_set", {}).get("planets", {})
        display_system_id = true_hostname
        
        if planets_dict:
            first_planet_key = list(planets_dict.keys())[0]
            official_default_name = planets_dict[first_planet_key].get("alias_set", {}).get("default_name", "")
            if official_default_name:
                name_tokens = official_default_name.split()
                if len(name_tokens) > 1 and name_tokens[-1].lower() in ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']:
                    display_system_id = " ".join(name_tokens[:-1])
                else:
                    display_system_id = official_default_name

        base_entry = raw_payload[0]
        parsecs_dist = base_entry.get("sy_dist")
        light_years_dist = round(parsecs_dist * 3.26156, 2) if parsecs_dist is not None else None

        # Build Clean Standard Schema Output Structure
        compiled_payload = {
            "system_id": display_system_id,
            "space_location": {
                "distance_parsecs": parsecs_dist,
                "distance_light_years": light_years_dist,
                "right_ascension_deg": base_entry.get("ra"),
                "declination_deg": base_entry.get("dec"),
                "galactic_longitude_deg": base_entry.get("glon"),
                "galactic_latitude_deg": base_entry.get("glat"),
                "unit_sky_vector": {
                    "x": base_entry.get("x"),
                    "y": base_entry.get("y"),
                    "z": base_entry.get("z")
                },
                "total_planets_in_system": int(base_entry.get("sy_pnum") or 1)
            },
            "star_parameters": {
                "canonical_name": display_system_id,
                "spectral_type": base_entry.get("st_spectype") or "G2V",
                "mass_solar": float(base_entry.get("st_mass") or 1.0),
                "radius_solar": float(base_entry.get("st_rad") or 1.0),
                "temperature_kelvin": float(base_entry.get("st_teff") or 5778.0),
                "luminosity_log": float(base_entry.get("st_lum") or 0.0),
                "surface_gravity_logg": float(base_entry.get("st_logg") or 4.4),
                "metallicity_dex": float(base_entry.get("st_met") or 0.0),
                "rotation_period_days": float(base_entry.get("st_rotp") or 25.0),
                "estimated_age_gyr": float(base_entry.get("st_age") or 4.5)
            },
            "simulation_grid": []
        }

        for row in raw_payload:
            db_planet_name = row.get("pl_name")
            if true_hostname == "KOI-351" and "KOI-351" in db_planet_name:
                planet_letter = db_planet_name.split()[-1]
                clean_planet_display = f"{display_system_id} {planet_letter}"
            else:
                clean_planet_display = db_planet_name

            p_rad = row.get("pl_rade")
            planet_type = "Unclassified Exoplanet"
            if p_rad is not None:
                if p_rad >= 6.0: planet_type = "Gas Giant"
                elif 2.0 <= p_rad < 6.0: planet_type = "Neptune-like (Ice Giant)"
                elif 1.2 <= p_rad < 2.0: planet_type = "Super-Earth"
                elif p_rad < 1.2: planet_type = "Rocky Terrestrial (Earth-like)"

            planet_node = {
                "planet_name": clean_planet_display,
                "classification_type": planet_type,
                "radius_earth": float(p_rad or 1.0),
                "mass_earth": float(row.get("pl_masse") or 1.0),
                "semi_major_axis_au": float(row.get("pl_orbsmax") or 1.0),
                "eccentricity": float(row.get("pl_orbeccen") or 0.0),
                "orbital_period_days": float(row.get("pl_orbper") or 10.0),
                "inclination_degrees": float(row.get("pl_orbincl") or 90.0),
                "equilibrium_temperature_k": float(row.get("pl_eqt") or 250.0),
                "insolation_flux_earth": float(row.get("pl_insol") or 1.0),
                "transit_depth_percent": float(row.get("pl_trandep") or 0.0),
                "discovery_history": {
                    "year": row.get("disc_year"),
                    "facility": row.get("disc_facility") or "Unknown"
                }
            }
            compiled_payload["simulation_grid"].append(planet_node)

        return {"status": "success", "data": compiled_payload}
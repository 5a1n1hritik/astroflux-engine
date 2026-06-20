import requests
import logging

log = logging.getLogger("datastellar.worker.nasa_client")

class NasanArchiveClient:
    def __init__(self):
        self.alias_url = "https://exoplanetarchive.ipac.caltech.edu/cgi-bin/Lookup/nph-aliaslookup.py"
        self.tap_url = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"

    def resolve_canonical_hostname(self, target_name: str) -> str:
        """NASA Alias Master API lookup service index tracking."""
        try:
            params = {"objname": target_name.strip()}
            res = requests.get(self.alias_url, params=params, timeout=15)
            res.raise_for_status()
            payload = res.json()
            
            manifest = payload.get("manifest", {})
            if manifest.get("lookup_status") != "OK":
                log.error(f"Global Registry Failure for target: {target_name}")
                return None
                
            return manifest.get("system_name"), payload
        except Exception as e:
            log.error(f"Handshake timeout across Alias Service: {str(e)}")
            return None, None

    def fetch_system_raw_payload(self, canonical_hostname: str) -> list:
        """Queries the core composite systems database tracking default_flag matrix constraints."""
        # Custom parameters list fully updated matching your physics pipeline requirements
        raw_query = f"""
            select pl_name, hostname, default_flag, pl_orbper, pl_orbsmax, 
                   pl_orbeccen, pl_orbincl, pl_rade, pl_masse, pl_eqt, pl_insol, pl_trandep,
                   st_teff, st_rad, st_mass, st_lum, st_age, st_logg, st_spectype, st_met, st_rotp,
                   sy_dist, sy_pnum, ra, dec, glon, glat, x, y, z, disc_year, disc_facility
            from ps 
            where hostname = '{canonical_hostname}' and default_flag = 1
        """
        
        try:
            params = {"query": raw_query, "format": "json"}
            res = requests.get(self.tap_url, params=params, timeout=30)
            res.raise_for_status()
            payload = res.json()
            
            # Fallback block to composite parameter view table grid if primary solution returns empty array
            if not payload:
                log.warning(f"Primary solution empty for host {canonical_hostname}. Falling back to composite parameters grid...")
                fallback_query = f"""
                    select pl_name, hostname, default_flag, pl_orbper, pl_orbsmax, 
                           pl_orbeccen, pl_orbincl, pl_rade, pl_masse, pl_eqt, pl_insol, pl_trandep,
                           st_teff, st_rad, st_mass, st_lum, st_age, st_logg, st_spectype, st_met, st_rotp,
                           sy_dist, sy_pnum, ra, dec, glon, glat, x, y, z, disc_year, disc_facility
                    from pscomppars 
                    where hostname = '{canonical_hostname}'
                """
                res = requests.get(self.tap_url, params={"query": fallback_query, "format": "json"}, timeout=30)
                payload = res.json()
                
            return payload
        except Exception as e:
            log.error(f"TAP Network Matrix pipeline failure while compiling system payload: {str(e)}")
            return None
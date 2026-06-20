import json
import logging
import requests
import sys

# Telemetry styling logging matrix setup
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s — %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("datastellar.raw_fetcher")

def execute_raw_dump(planet_name: str, output_filename: str = "nasa_raw_sample.json"):
    log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    log.info(f"NASA TAP RAW FETCH INITIATED — Target: '{planet_name}'")
    
    # 1. Base URL config completely clean rakhein, isme query parameters nahi jodenge
    base_url = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"
    
    # 2. Strict SQL template matching text blocks
    # Enclosing target inside true SQL single quotes string safely
    raw_query = f"select * from ps where pl_name = '{planet_name.strip()}'"
    
    # 3. Utilizing requests params engine to auto-encode special characters flawlessly
    request_params = {
        "query": raw_query,
        "format": "json"
    }
    
    try:
        log.info("Handshaking with NASA Caltech TAP server infrastructure...")
        
        # Mapping params directly into the session channel
        response = requests.get(base_url, params=request_params, timeout=15)
        
        # Log the exact generated URL for verification debugging
        log.info(f"Dispatched Encoded URL: {response.url}")
        
        response.raise_for_status()
        raw_payload = response.json()
        
        if not raw_payload or len(raw_payload) == 0:
            log.error(f"Target validation failed: '{planet_name}' not resolved in NASA registry.")
            return False
            
        log.info(f"Handshake success. Received payload grid containing {len(raw_payload[0])} raw scientific keys.")
        
        log.info(f"Writing dataset layout down to disk destination: '{output_filename}'")
        with open(output_filename, "w", encoding="utf-8") as f:
            json.dump(raw_payload, f, indent=4, ensure_ascii=False)
            
        log.info("RAW DATA DUMP EXECUTED SECURELY WITHOUT PACKAGES LOSS")
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        return True
        
    except requests.exceptions.RequestException as e:
        log.error(f"Network processing layer failure while downloading raw payload: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            log.error(f"Server Response Content: {e.response.text}")
        return False
    except Exception as e:
        log.error(f"File compiler runtime crash: {str(e)}")
        return False

if __name__ == "__main__":
    # If a specific planet name is passed via CLI, use it; otherwise fallback to TRAPPIST-1 b
    target_planet = sys.argv[1] if len(sys.argv) > 1 else "TRAPPIST-1 b"
    execute_raw_dump(target_planet)
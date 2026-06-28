from fastapi import FastAPI, HTTPException, Query
from contextlib import asynccontextmanager
from app.services.telemetry_service import TelemetryOrchestrationService
from app.services.catalog_service import run_catalog_dump
import logging
import threading

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s — %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("datastellar.worker.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP: fire catalog dump in background thread ──
    log.info("STARTUP ── Triggering background catalog dump thread...")
    thread = threading.Thread(target=run_catalog_dump, daemon=True)
    thread.start()
    yield
    # ── SHUTDOWN ──
    log.info("SHUTDOWN ── AstroFlux worker going offline.")


app = FastAPI(
    title="AstroFlux Core Multi-Body Worker",
    description="Enterprise-grade autonomous planetary systems orchestration grid",
    version="3.0.0",
    lifespan=lifespan,
)

telemetry_service = TelemetryOrchestrationService()


@app.get("/")
def read_root():
    return {
        "status":    "online",
        "engine":    "AstroFlux-Modular-Worker",
        "protocols": ["TAP/JSON", "ExoFOP/Stream"],
        "version":   "3.0.0"
    }


@app.get("/api/v1/flux/process")
def process_tap_pipeline(
    target: str = Query(..., description="Target planetary node nomenclature string standard.")
):
    log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    log.info(f"MODULAR PROCESS INITIATED ── Target Trigger: '{target}'")

    result = telemetry_service.generate_system_matrix(target)

    if result["status"] == "error":
        log.error(f"Pipeline Process Terminated: {result['message']}")
        raise HTTPException(status_code=502, detail=result["message"])

    log.info(f"PIPELINE SUCCESS ── System '{result['data']['system_id']}' Hydrated flawlessly.")
    log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    return result["data"]

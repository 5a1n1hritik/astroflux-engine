from fastapi import FastAPI, HTTPException, Query
import lightkurve as lk
import numpy as np
import json

app = FastAPI(
    title="AstroFlux Data Worker",
    description="Scientific data ingestion and processing pipeline for NASA MAST API",
    version="1.0.0"
)

@app.get("/")
def read_root():
    """
    Health check endpoint to ensure the data worker is functional
    and connected to its astronomical environment.
    """
    return {
        "status": "online",
        "engine": "AstroFlux-Data-Worker",
        "supported_missions": ["Kepler", "TESS", "K2"]
    }

@app.get("/api/v1/flux/process")
def process_flux_pipeline(
    target: str = Query(..., description="Target star name, e.g., 'Kepler-452'"),
    mission: str = Query("Kepler", description="Space telescope mission name")
):
    """
    Core pipeline checkpoint. This endpoint will communicate with MAST API,
    download .fits files, apply filters, and return streamlined numeric data.
    """
    try:
        # Step 1: Search lightcurve via Lightkurve wrapper (Interacting with MAST)
        search_result = lk.search_lightcurve(target, mission=mission, author=mission)
        
        if len(search_result) == 0:
            raise HTTPException(
                status_code=404, 
                detail=f"Target {target} not found in {mission} archive."
            )
            
        # For Phase 1 setup, we are just validating the handshake parameters
        return {
            "target": target,
            "mission": mission,
            "handshake": "successful",
            "available_quarters": len(search_result)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

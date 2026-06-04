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
            
        # Step 2: Asli .fits files ko background me stream/download karna
        # memmap=True internally handles memory management
        lc_collection = search_result.download_all()
        
        # Step 3: Alag-alag quarters ke data ko ek sath stitch (combine) karna
        lc = lc_collection.stitch()
        
        # Step 4: Algorithm 1 - Sigma Clipping (Cosmic noise removal)
        # 3-sigma se bahar ke outliers ko mask out karega
        clean_lc = lc.remove_outliers(sigma=3)
        
        # Step 5: Algorithm 2 - Savitzky-Golay Filter (Flattening the light curve)
        # window_length hamesha odd number hona chahiye (e.g., 401 points sliding window)
        flat_lc = clean_lc.flatten(window_length=401)
        
        # Step 6: Down-sampling (Laakhon points ko browser-friendly range me compress karna)
        # Hum har 10 points ka median lekar binned object banayenge
        binned_lc = flat_lc.bin(time_bin_size=0.1)

        # --- FIX STARTS HERE: Filter out NaN values ---
        raw_time = binned_lc.time.value
        raw_flux = binned_lc.flux.value

        # NumPy's logical_not aur isnan ka use karke sirf wahi indices nikalenge jo NaN nahi hain
        nan_mask = np.logical_not(np.isnan(raw_flux))
        
        clean_time_array = raw_time[nan_mask].tolist()
        clean_flux_array = raw_flux[nan_mask].tolist()
        # --- FIX ENDS HERE --- 
        
        # Step 7: Rust Physics Engine ke liye metadata (Constants) extract karna
        # FITS headers se stellar properties nikalna
        mstar = lc.meta.get('MSTAR', 1.0)  # Default to 1.0 solar mass if not present
        rstar = lc.meta.get('RSTAR', 1.0)  # Default to 1.0 solar radius if not present
        
        # Static check for some targets or extract from target archive later
        # Phase 1 verification payload structure
        response_payload = {
            "metadata": {
                "target_name": target,
                "mission": mission,
                "star_mass_solar": float(mstar) if mstar else 1.0,
                "star_radius_solar": float(rstar) if rstar else 1.0,
                "total_processed_points": len(flat_lc.time.value)
            },
            "scientific_arrays": {
                "time": binned_lc.time.value.tolist(),       # X-axis for graph
                "flux": binned_lc.flux.value.tolist()        # Y-axis for graph
            }
        }
        
        return response_payload
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline Crash Error: {str(e)}")

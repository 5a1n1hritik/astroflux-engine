use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

// 1. Static Parameters Model 
#[derive(Serialize, Deserialize, Debug)]
pub struct OrbitConstants {
    pub star_mass_solar: f64,
    pub star_radius_solar: f64,
    pub orbital_period_days: f64,
    pub semi_major_axis_au: f64,
    pub eccentricity: f64,
}

// 2. 60 FPS Real-Time Simulation State Output
#[derive(Serialize, Debug)]
pub struct SimulationState {
    pub position_x: f64,
    pub position_y: f64,
    pub current_velocity_x: f64,
    pub current_velocity_y: f64,
    pub current_phase_angle: f64,
}

// 3. WebAssembly Interaction Handshake Check
#[wasm_bindgen]
pub fn astroflux_handshake(js_config: JsValue) -> Result<JsValue, JsValue> {
    // FIX: Using serde_wasm_bindgen to smoothly deserialize direct JsValue components
    let constants: OrbitConstants = serde_wasm_bindgen::from_value(js_config)
        .map_err(|e| JsValue::from_str(&format!("WASM Deserialization Error: {}", e)))?;
        
    let confirmation_msg = format!(
        "Rust WASM Engine Connected. Target System Parameters Locked -> Mass: {} Solar, Period: {} Days",
        constants.star_mass_solar, constants.orbital_period_days
    );
    
    Ok(JsValue::from_str(&confirmation_msg))
}
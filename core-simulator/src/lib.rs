use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

// ── 1. INDIVIDUAL PLANET STATIC CONFIGURATION INPUT ───────────────────────
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PlanetOrbitConfig {
    pub planet_name: String,
    pub radius_earth: f64,
    pub semi_major_axis_au: f64,
    pub eccentricity: f64,
    pub orbital_period_days: f64,
    pub inclination_degrees: f64,
}

// ── 2. BATCH REQEUST STRUCTURE FROM NEXT.JS CLIENT ────────────────────────
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SystemSimulationRequest {
    pub system_id: String,
    pub simulation_time_days: f64,
    pub planets: Vec<PlanetOrbitConfig>,
}

// ── 3. SINGLE BODY POSITION VECTOR RESPONSES ─────────────────────────────
#[derive(Serialize, Debug)]
pub struct PlanetFrameState {
    pub planet_name: String,
    pub position_x: f64,
    pub position_y: f64,
    pub position_z: f64,
    pub velocity_x: f64,
    pub velocity_y: f64,
    pub velocity_z: f64,
    pub phase_angle: f64,
}

// ── 4. COMPLETE SYSTEM REPOSITORY STATE WRAPPER ──────────────────────────
#[derive(Serialize, Debug)]
pub struct SystemFrameState {
    pub system_id: String,
    pub simulation_time_days: f64,
    pub simulation_grid: Vec<PlanetFrameState>,
}

// ── 5. WASM INITIALIZATION HANDSHAKE INTERFACE ───────────────────────────
#[wasm_bindgen]
pub fn astroflux_handshake(js_config: JsValue) -> Result<JsValue, JsValue> {
    let request: SystemSimulationRequest = serde_wasm_bindgen::from_value(js_config)
        .map_err(|e| JsValue::from_str(&format!("WASM Deserialization Error: {}", e)))?;
        
    let confirmation_msg = format!(
        "ASTROFLUX Core Engine V3 Verified. Host System context: '{}' locked with {} unique sibling planets payload matrix.",
        request.system_id, request.planets.len()
    );
    
    Ok(JsValue::from_str(&confirmation_msg))
}

// ── 6. THE BATCH QUANTUM SOLVER ENGINE (SINGLE PASS LOOP) ──────────────────
#[wasm_bindgen]
pub fn compute_system_orbital_frame(js_request: JsValue) -> Result<JsValue, JsValue> {
    // Single boundary deserialization pass for memory optimization
    let request: SystemSimulationRequest = serde_wasm_bindgen::from_value(js_request)
        .map_err(|e| JsValue::from_str(&format!("WASM Deserialization Crash: {}", e)))?;

    let pi = std::f64::consts::PI;
    let current_time = request.simulation_time_days;
    let mut batch_states = Vec::with_capacity(request.planets.len());

    // Iterate over the system grid dynamically in a single WebAssembly memory thread
    for planet in request.planets {
        let e = planet.eccentricity;
        let a = planet.semi_major_axis_au;
        let inclination_rad = planet.inclination_degrees.to_radians();

        // Step A: Calculate Mean Anomaly (M)
        let mut mean_anomaly = (2.0 * pi * current_time) / planet.orbital_period_days;
        mean_anomaly = mean_anomaly % (2.0 * pi);

        // Step B: Newton-Raphson Convergence Solver (M = E - e sin E)
        let mut eccentric_anomaly = mean_anomaly;
        let tolerance = 1e-8;
        let max_iterations = 100;

        for _ in 0..max_iterations {
            let delta_e = (eccentric_anomaly - e * eccentric_anomaly.sin() - mean_anomaly) 
                        / (1.0 - e * eccentric_anomaly.cos());
            eccentric_anomaly -= delta_e;
            if delta_e.abs() < tolerance {
                break;
            }
        }

        // Step C: True Anomaly Equation
        let true_anomaly = 2.0 * ((1.0 + e).sqrt() * (eccentric_anomaly / 2.0).sin())
            .atan2((1.0 - e).sqrt() * (eccentric_anomaly / 2.0).cos());

        // Step D: Keplerian Planar Cartesian Mapping (2D positions vector)
        let x_orbital = a * (eccentric_anomaly.cos() - e);
        let y_orbital = a * (1.0 - e * e).sqrt() * eccentric_anomaly.sin();

        // Step E: 3D Inclination Angular Matrix Rotation (Tilted Viewport Mapping)
        let x_pos = x_orbital;
        let y_pos = y_orbital * inclination_rad.cos();
        let z_pos = y_orbital * inclination_rad.sin();

        // Step F: Vis-Viva Velocity Calculations Integration
        let mu = 4.0 * pi * pi * (a * a * a) / (planet.orbital_period_days * planet.orbital_period_days);
        let r = (x_orbital * x_orbital + y_orbital * y_orbital).sqrt();
        let v_mag = (mu * (2.0 / r - 1.0 / a)).sqrt();

        let v_x_orbital = -v_mag * eccentric_anomaly.sin() / (1.0 - e * eccentric_anomaly.cos());
        let v_y_orbital = v_mag * (1.0 - e * e).sqrt() * eccentric_anomaly.cos() / (1.0 - e * eccentric_anomaly.cos());

        let v_x = v_x_orbital;
        let v_y = v_y_orbital * inclination_rad.cos();
        let v_z = v_y_orbital * inclination_rad.sin();

        batch_states.push(PlanetFrameState {
            planet_name: planet.planet_name,
            position_x: x_pos,
            position_y: y_pos,
            position_z: z_pos,
            velocity_x: v_x,
            velocity_y: v_y,
            velocity_z: v_z,
            phase_angle: true_anomaly,
        });
    }

    let final_frame = SystemFrameState {
        system_id: request.system_id,
        simulation_time_days: current_time,
        simulation_grid: batch_states,
    };

    // Serialize once and stream directly back to Three.js render loop frame thread
    serde_wasm_bindgen::to_value(&final_frame)
        .map_err(|e| JsValue::from_str(&format!("WASM Serialization Crash: {}", e)))
}
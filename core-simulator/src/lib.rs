use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

// 1. Static Configuration Inputs Map
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OrbitConstants {
    pub star_mass_solar: f64,
    pub star_radius_solar: f64,
    pub orbital_period_days: f64,
    pub semi_major_axis_au: f64,
    pub eccentricity: f64,
}

// 2. Dynamic Frame Output Vectors Package
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
    let constants: OrbitConstants = serde_wasm_bindgen::from_value(js_config)
        .map_err(|e| JsValue::from_str(&format!("WASM Deserialization Error: {}", e)))?;
        
    let confirmation_msg = format!(
        "Rust WASM Engine Connected. Target System Parameters Locked -> Mass: {} Solar, Period: {} Days",
        constants.star_mass_solar, constants.orbital_period_days
    );
    
    Ok(JsValue::from_str(&confirmation_msg))
}

// 4. THE CORE QUANTUM SOLVER: Frame-by-Frame Calculation Engine
#[wasm_bindgen]
pub fn compute_orbital_frame(js_config: JsValue, current_time_days: f64) -> Result<JsValue, JsValue> {
    // Next.js client-side configurations se parameters extract karna
    let constants: OrbitConstants = serde_wasm_bindgen::from_value(js_config)
        .map_err(|e| JsValue::from_str(&format!("WASM Processing Error: {}", e)))?;

    let pi = std::f64::consts::PI;
    let e = constants.eccentricity;
    let a = constants.semi_major_axis_au;

    // Step A: Calculate Mean Anomaly (M) -> Time-dependent angular stepping
    // M = 2π * (t / T) mod 2π
    let mut mean_anomaly = (2.0 * pi * current_time_days) / constants.orbital_period_days;
    mean_anomaly = mean_anomaly % (2.0 * pi);

    // Step B: Newton-Raphson Solver Loop for Kepler's Equation (M = E - e sin E)
    let mut eccentric_anomaly = mean_anomaly; // Initial guess setup
    let tolerance = 1e-8;                    // 8-decimal point scientific convergence standard
    let max_iterations = 100;

    for _ in 0..max_iterations {
        let delta_e = (eccentric_anomaly - e * eccentric_anomaly.sin() - mean_anomaly) 
                    / (1.0 - e * eccentric_anomaly.cos());
        
        eccentric_anomaly -= delta_e;
        
        if delta_e.abs() < tolerance {
            break;
        }
    }

    // Step C: True Anomaly calculation for phase reference tracking
    let true_anomaly = 2.0 * ((1.0 + e).sqrt() * (eccentric_anomaly / 2.0).sin())
        .atan2((1.0 - e).sqrt() * (eccentric_anomaly / 2.0).cos());

    // Step D: Calculate Cartesian Coordinates (Orbit positions mapping)
    // Elliptical geometry: X = a*(cos E - e), Y = a * sqrt(1 - e^2) * sin E
    let x_pos = a * (eccentric_anomaly.cos() - e);
    let y_pos = a * (1.0 - e * e).sqrt() * eccentric_anomaly.sin();

    // Step E: Vis-Viva Equation ke zariye Orbit Velocities Vectors compute karna
    // Multipliers for canvas rendering or dynamic scaling values
    let mu = 4.0 * pi * pi * (a * a * a) / (constants.orbital_period_days * constants.orbital_period_days);
    let r = (x_pos * x_pos + y_pos * y_pos).sqrt();
    let v_mag = (mu * (2.0 / r - 1.0 / a)).sqrt();

    // Flight path calculation vectors
    let v_x = -v_mag * eccentric_anomaly.sin() / (1.0 - e * eccentric_anomaly.cos());
    let v_y = v_mag * (1.0 - e * e).sqrt() * eccentric_anomaly.cos() / (1.0 - e * eccentric_anomaly.cos());

    // Packaging results into the High-Performance structural object
    let frame_state = SimulationState {
        position_x: x_pos,
        position_y: y_pos,
        current_velocity_x: v_x,
        current_velocity_y: v_y,
        current_phase_angle: true_anomaly,
    };

    // Serializing the strict Rust struct directly into high speed memory optimized JavaScript values
    serde_wasm_bindgen::to_value(&frame_state)
        .map_err(|e| JsValue::from_str(&format!("WASM Serialization Crash: {}", e)))
}
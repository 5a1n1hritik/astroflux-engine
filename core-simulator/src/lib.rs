use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

// ── 1. INDIVIDUAL PLANET STATIC CONFIGURATION INPUT ───────────────────────
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PlanetOrbitConfig {
    pub planet_name: String,
    pub radius_earth: f64,
    pub mass_earth: f64,                // FIX: Added missing mass property for physics scaling
    pub semi_major_axis_au: f64,
    pub eccentricity: f64,
    pub orbital_period_days: f64,
    pub inclination_degrees: f64,
    pub equilibrium_temperature_k: f64, 
}

// ── 2. BATCH REQEUST STRUCTURE FROM NEXT.JS CLIENT ────────────────────────
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SystemSimulationRequest {
    pub system_id: String,
    pub simulation_time_days: f64,
    pub star_mass_solar: f64,        
    pub star_rotation_days: f64,     
    pub system_distance_pc: f64,     
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
    pub relativistic_factor: f64,     // velocity correction indexing
    pub phase_illumination: f64,      // Dynamic brightness factor (0.0 to 1.0)
    pub thermal_velocity_scale: f64,  // Maxwell-Boltzmann speed reference for engine particles
}

// ── 4. COMPLETE SYSTEM REPOSITORY STATE WRAPPER ──────────────────────────
#[derive(Serialize, Debug)]
pub struct SystemFrameState {
    pub system_id: String,
    pub simulation_time_days: f64,
    pub star_rotation_angle_rad: f64,   // Real-time solar core rotation trace
    pub base_parallax_arcsec: f64,      // Distance converted to observable parallax
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

    //  Calculate base parallax calculation matrix using Distance (1 / d)
    let parallax = if request.system_distance_pc > 0.0 { 1.0 / request.system_distance_pc } else { 0.0 };
    
    // Calculate Master Star Core current active angle standard rotation matrix
    let star_rotation_angle = if request.star_rotation_days > 0.0 {
        ((2.0 * pi * current_time) / request.star_rotation_days) % (2.0 * pi)
    } else {
        0.0
    };

    let mut batch_states = Vec::with_capacity(request.planets.len());

    // Standard Gravitational Constant scaling factor for Solar Mass systems (AU^3 / day^2)
    // G * M_sun in standard units is approx 0.0002959122
    let g_mu_constant = 0.0002959122; 
    let mu_system = g_mu_constant * request.star_mass_solar;

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
        // let mu = 4.0 * pi * pi * (a * a * a) / (planet.orbital_period_days * planet.orbital_period_days);
        let r = (x_orbital * x_orbital + y_orbital * y_orbital).sqrt();
        let v_mag = (mu_system * (2.0 / r - 1.0 / a)).sqrt();

        let v_x_orbital = -v_mag * eccentric_anomaly.sin() / (1.0 - e * eccentric_anomaly.cos());
        let v_y_orbital = v_mag * (1.0 - e * e).sqrt() * eccentric_anomaly.cos() / (1.0 - e * eccentric_anomaly.cos());

        let v_x = v_x_orbital;
        let v_y = v_y_orbital * inclination_rad.cos();
        let z_vel = v_y_orbital * inclination_rad.sin();

        // Relativistic factor fallback check for high eccentricity close-in worlds (Mercury/Hot Jupiters standard)
        let c_au_per_day = 173.145; // Speed of light in AU/day
        let beta = v_mag / c_au_per_day;
        let lorentz_factor = 1.0 / (1.0 - beta * beta).sqrt();

        // ── SIMULATOR ALBEDO & THERMAL SCALING ENGINES ──
        // A. Dynamic Phase Angle Illumination calculation (Lambertian phase function proxy mapping)
        // Cosine matrix factor calculation based on phase angles alignment
        let phase_illumination = (1.0 + true_anomaly.cos()) / 2.0;

        // B. Gas Thermal Particle velocity proxy computation (Maxwell Boltzmann scaling standard)
        // Root-mean-square speed indexing for canvas particle tail direction alignments
        let thermal_scale = (planet.equilibrium_temperature_k / planet.mass_earth.max(0.1)).sqrt();

        batch_states.push(PlanetFrameState {
            planet_name: planet.planet_name,
            position_x: x_pos,
            position_y: y_pos,
            position_z: z_pos,
            velocity_x: v_x,
            velocity_y: v_y,
            velocity_z: z_vel,
            phase_angle: true_anomaly,
            relativistic_factor: lorentz_factor,
            phase_illumination,
            thermal_velocity_scale: thermal_scale,
        });
    }

    let final_frame = SystemFrameState {
        system_id: request.system_id,
        simulation_time_days: current_time,
        star_rotation_angle_rad: star_rotation_angle,
        base_parallax_arcsec: parallax,
        simulation_grid: batch_states,
    };

    // Serialize once and stream directly back to Three.js render loop frame thread
    serde_wasm_bindgen::to_value(&final_frame)
        .map_err(|e| JsValue::from_str(&format!("WASM Serialization Crash: {}", e)))
}
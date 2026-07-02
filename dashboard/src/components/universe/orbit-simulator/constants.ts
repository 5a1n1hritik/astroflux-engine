/**
 * constants.ts
 * src/components/universe/orbit-simulator/constants.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for scaling factors, zoom distances, and visual
 * tuning constants. Change a number once here — every camera/scene module
 * picks it up.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── World scale ───────────────────────────────────────────────────────────
// 1 AU -> 32 WebGL units. Chosen to comfortably space an 8-planet system
// (e.g. Kepler-90) without planets visually colliding at small inclinations.
export const AU_TO_WS = 32.0;

// ── Orbit path rendering ─────────────────────────────────────────────────
export const ORBIT_PATH_SEGMENTS = 360;
export const ORBIT_BASE_OPACITY  = 0.35;
export const ORBIT_BASE_DASH     = 0.3;
export const ORBIT_BASE_GAP      = 0.2;
// Hue step per planet index — keeps adjacent orbits (e.g. Kepler-90 g/h with
// near-identical semi-major-axis + inclination) visually distinguishable.
export const ORBIT_HUE_STEP      = 37;
export const ORBIT_HUE_BASE      = 180;

// ── Planet mesh sizing ────────────────────────────────────────────────────
export const PLANET_RADIUS_SCALE = 0.12;
export const PLANET_MIN_RADIUS   = 0.15;
export const PLANET_SPHERE_SEGMENTS = 48;
export const ATMOSPHERE_SCALE    = 1.15;

// ── Star mesh sizing ──────────────────────────────────────────────────────
export const STAR_MIN_RADIUS     = 1.2;
export const STAR_RADIUS_SCALE   = 1.2;
export const STAR_SPHERE_SEGMENTS = 64;
export const CORONA_SIZE_SCALE   = 7.5;

// ── Camera: Planet View (light-facing lock) ──────────────────────────────
// Zoom distance is computed relative to the selected planet's mesh radius,
// not a fixed world-unit number — keeps framing consistent across vastly
// different planet sizes (Earth-like vs Gas Giant).
export const PLANET_VIEW_ZOOM_RADIUS_MULT = 12;
export const PLANET_VIEW_MIN_ZOOM         = 4;
export const PLANET_VIEW_CAM_LERP         = 0.04;
export const PLANET_VIEW_TARGET_LERP      = 0.04;

// ── Camera: System View (barycenter drift + outer-bound framing) ────────
export const SYSTEM_VIEW_HEIGHT_MULT   = 1.2;  // camera Y relative to outerOrbitRadius
export const SYSTEM_VIEW_DEPTH_MULT    = 1.8;  // camera Z relative to outerOrbitRadius
export const SYSTEM_VIEW_DRIFT_SPEED   = 0.04;
export const SYSTEM_VIEW_DRIFT_RADIUS  = 0.8;
export const SYSTEM_VIEW_TARGET_LERP   = 0.015;
export const SYSTEM_VIEW_CAM_DRIFT_SPEED = 0.02;
export const SYSTEM_VIEW_CAM_DRIFT_MULT  = 0.05; // fraction of outerOrbitRadius
export const SYSTEM_VIEW_CAM_LERP        = 0.005;

// ── Camera: Star View (close cinematic framing) ──────────────────────────
export const STAR_VIEW_HEIGHT_MULT = 1.5;  // camera Y relative to starSphereRadius
export const STAR_VIEW_DEPTH_MULT  = 4.5;  // camera Z relative to starSphereRadius
export const STAR_VIEW_CAM_LERP    = 0.03;
export const STAR_VIEW_TARGET_LERP = 0.03;

// ── Initial camera (before any view-mode lock engages) ───────────────────
export const INITIAL_CAMERA_FOV   = 45;
export const INITIAL_CAMERA_NEAR  = 0.01;
export const INITIAL_CAMERA_FAR   = 1200;

// ── Starfield background ──────────────────────────────────────────────────
export const STARFIELD_LAYERS = [
  { count: 2500, size: 0.025, spread: 150, opacity: 0.6 },
  { count: 800,  size: 0.045, spread: 80,  opacity: 0.8 },
] as const;

// ── Habitable zone torus ──────────────────────────────────────────────────
export const HABITABLE_ZONE_INNER_LUM_DIVISOR = 1.1;
export const HABITABLE_ZONE_OUTER_LUM_DIVISOR = 0.53;
export const HABITABLE_ZONE_MAX_TUBE_RADIUS   = 0.6;
export const HABITABLE_ZONE_MAX_MID_RADIUS    = 400;
export const HABITABLE_ZONE_OPACITY           = 0.012;

// ── Planet classification color presets (by mass/temperature) ───────────
export const PLANET_COLOR_GAS_GIANT   = { base: "#c8a96e", atmo: "#22d3ee" };
export const PLANET_COLOR_HOT         = { base: "#1a0800", atmo: "#ef4444" };
export const PLANET_COLOR_COLD        = { base: "#cce8ff", atmo: "#a78bfa" };
export const PLANET_COLOR_DEFAULT     = { base: "#8b6344", atmo: "#3a8cf5" };

export const GAS_GIANT_MASS_THRESHOLD = 10.0;
export const HOT_TEMP_THRESHOLD_K     = 450.0;
export const COLD_TEMP_THRESHOLD_K    = 180.0;

// ── System galactic tilt degree angle ──────────────────────────────────────
export const SYSTEM_GALACTIC_TILT_DEG = -120;

// ── Planet rotation speed  ──────────────────────────────────────
export const PLANET_BASE_ROTATION_SPEED = 0.008; // base rad/frame at period=10days
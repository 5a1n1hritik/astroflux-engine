"use client";

/**
 * useWasmOrbit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton bridge to the Rust WASM core-simulator module.
 *
 * Design contracts:
 *  - The WASM binary is loaded ONCE per browser session (module-level singleton).
 *    Subsequent hook calls reuse the cached engine reference — no double-init.
 *  - `computeFrame` is synchronous after initialization. It calls the WASM
 *    function directly with no async overhead, safe to call inside rAF loops.
 *  - The hook exposes an `isReady` boolean so callers can gate their render
 *    loops cleanly without try/catch at the call site.
 *
 * Usage:
 *   const { engine, isReady } = useWasmOrbit(targetMetadata);
 *   // Inside rAF: const frame = engine.computeFrame(config, t);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ── Types Aligned with 20-Keys DB and Upgraded Rust Engine ───────────────────
export interface OrbitalConfig {
  star_mass: number; // Aligned with st_mass (Solar Mass)
  star_radius: number; // Aligned with st_rad (Solar Radii)
  orbital_period_days: number; // pl_orbper (Days)
  semi_major_axis_au: number; // pl_orbsmax (AU)
  eccentricity: number; // pl_orbeccen
  orbital_inclination_deg: number; // pl_orbincl (Tilt Degrees)
}

export interface OrbitalFrame {
  position_x: number; // 3D Matrix Vector X
  position_y: number; // 3D Matrix Vector Y
  position_z: number; // 3D Matrix Vector Z (Inclination Tilt axis)
  current_phase_angle: number; // Radians, 0–2π
}

export interface WasmEngine {
  computeFrame: (
    config: OrbitalConfig,
    timeDays: number,
  ) => OrbitalFrame | null;
}

// ── Module-level singleton ───────────────────────────────────────────────────
// Stored outside React's lifecycle so it survives re-renders and StrictMode
// double-invocation. `initPromise` prevents concurrent init races.

let _engine: WasmEngine | null = null;
let _initPromise: Promise<void> | null = null;

async function initWasmSingleton(config: OrbitalConfig): Promise<void> {
  if (_engine) return; // Already initialized — fast path

  try {
    // Dynamic import keeps WASM out of the SSR bundle entirely.
    // Next.js will only load this on the client.
    const module = await import("@/core-simulator-wasm");

    // `module.default()` triggers the WASM binary instantiation.
    // Must be awaited before any exported functions are callable.
    await module.default();

    // Mapping fields correctly for the raw Rust struct handshake
    const rustHandshakeConfig = {
      star_mass: config.star_mass,
      star_radius: config.star_radius,
      orbital_period_days: config.orbital_period_days,
      semi_major_axis_au: config.semi_major_axis_au,
      eccentricity: config.eccentricity,
      orbital_inclination_deg: config.orbital_inclination_deg,
    };

    const handshakeResult = module.astroflux_handshake(rustHandshakeConfig);
    console.info("[AstroFlux WASM] 3D Handshake confirmed:", handshakeResult);

    // Wrap the raw WASM export in a typed closure with null-safe error boundary.
    _engine = {
      computeFrame(cfg: OrbitalConfig, timeDays: number): OrbitalFrame | null {
        try {
          const rawRustConfig = {
            star_mass: cfg.star_mass,
            star_radius: cfg.star_radius,
            orbital_period_days: cfg.orbital_period_days,
            semi_major_axis_au: cfg.semi_major_axis_au,
            eccentricity: cfg.eccentricity,
            orbital_inclination_deg: cfg.orbital_inclination_deg,
          };

          const raw = module.compute_orbital_frame(rawRustConfig, timeDays);
          if (!raw) return null;

          return {
            position_x: raw.position_x ?? 0,
            position_y: raw.position_y ?? 0,
            position_z: raw.position_z ?? 0, // Catching the third spatial axis
            current_phase_angle: raw.current_phase_angle ?? 0,
          };
        } catch {
          // WASM panics are recoverable here — we swallow and return null
          // so the rAF loop never crashes the entire React tree.
          return null;
        }
      },
    };
  } catch (err) {
    console.error("[AstroFlux WASM] 3D Initialization failed:", err);
    throw err;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWasmOrbit(config: OrbitalConfig): {
  engine: WasmEngine | null;
  isReady: boolean;
} {
  const [isReady, setIsReady] = useState<boolean>(!!_engine);
  // Stable config ref — prevents the effect from re-firing on every render
  // (the parent may pass an inline object literal)
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    // Already initialized from a previous mount — skip
    if (_engine) {
      setIsReady(true);
      return;
    }

    // Deduplicate concurrent init calls (React StrictMode mounts twice)
    if (!_initPromise) {
      _initPromise = initWasmSingleton(configRef.current);
    }

    _initPromise
      .then(() => setIsReady(true))
      .catch(() => {
        // Reset promise so a future mount can retry
        _initPromise = null;
      });
  }, []); // Empty deps: init runs exactly once per browser session

  return { engine: isReady ? _engine : null, isReady };
}

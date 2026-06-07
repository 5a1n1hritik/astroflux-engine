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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrbitalConfig {
  star_mass_solar:     number;
  star_radius_solar:   number;
  orbital_period_days: number;
  semi_major_axis_au:  number;
  eccentricity:        number;
}

export interface OrbitalFrame {
  position_x:          number;  // AU, ecliptic plane X
  position_y:          number;  // AU, ecliptic plane Y (maps to Three.js Z)
  current_phase_angle: number;  // radians, 0–2π
}

export interface WasmEngine {
  computeFrame: (config: OrbitalConfig, timeDays: number) => OrbitalFrame | null;
}

// ── Module-level singleton ────────────────────────────────────────────────────
// Stored outside React's lifecycle so it survives re-renders and StrictMode
// double-invocation. `initPromise` prevents concurrent init races.

let _engine:      WasmEngine | null = null;
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

    // Handshake: validates that the WASM memory layout matches our config shape.
    const handshakeResult = module.astroflux_handshake(config);
    console.info("[AstroFlux WASM] Handshake confirmed:", handshakeResult);

    // Wrap the raw WASM export in a typed closure with null-safe error boundary.
    _engine = {
      computeFrame(cfg: OrbitalConfig, timeDays: number): OrbitalFrame | null {
        try {
          // compute_orbital_frame returns a JS object from Rust via wasm-bindgen.
          // Shape: { position_x, position_y, current_phase_angle }
          const raw = module.compute_orbital_frame(cfg, timeDays);
          if (!raw) return null;
          return {
            position_x:          raw.position_x          ?? 0,
            position_y:          raw.position_y          ?? 0,
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
    console.error("[AstroFlux WASM] Initialization failed:", err);
    throw err;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWasmOrbit(config: OrbitalConfig): {
  engine:  WasmEngine | null;
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
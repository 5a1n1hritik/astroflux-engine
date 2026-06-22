"use client";

/**
 * useWasmOrbit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-Body Singleton bridge to the batch-optimized Rust WASM core-simulator.
 * Saves memory footprint by handling complete system arrays in a single execution pass.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from "react";

// Types matching the batch system payload structure
export interface WasmEngine {
  compute_system_orbital_frame: (jsRequest: any) => any | null;
}

interface HookConfig {
  system_id: string;
}

let _engine: WasmEngine | null = null;
let _initPromise: Promise<void> | null = null;

async function initWasmSingleton(systemId: string): Promise<void> {
  if (_engine) return; // Fast path if module already cached

  try {
    // Dynamic import to isolate WASM cleanly from SSR cycles
    // Updated import path to point to your correct pkg distribution target
    const module = await import("@/core-simulator-wasm");

    // Initialize WebAssembly linear memory context bounds
    if (typeof module.default === "function") {
      await module.default();
    }

    // Direct registration of exported symbols into structural interface
    _engine = {
      compute_system_orbital_frame(jsRequest: any): any | null {
        try {
          return module.compute_system_orbital_frame(jsRequest);
        } catch (err) {
          console.error(
            "[WASM Exec Error] Single-pass memory solving panicked:",
            err,
          );
          return null; // Swallow to prevent collapsing the animation rendering loop
        }
      },
    };

    console.info(
      `[AstroFlux WASM] Multi-body solver pipeline active for sector tracking.`,
    );
  } catch (err) {
    console.error(
      "[AstroFlux WASM] Singleton binding failed initialization:",
      err,
    );
    throw err;
  }
}

export function useWasmOrbit(config: HookConfig): {
  engine: WasmEngine | null;
  isReady: boolean;
} {
  const [isReady, setIsReady] = useState<boolean>(!!_engine);
  const systemIdRef = useRef(config.system_id);
  systemIdRef.current = config.system_id;

  useEffect(() => {
    if (_engine) {
      setIsReady(true);
      return;
    }

    // Guard against double invocation race locks (Strict Mode checks)
    if (!_initPromise) {
      _initPromise = initWasmSingleton(systemIdRef.current);
    }

    _initPromise
      .then(() => setIsReady(true))
      .catch((err) => {
        console.error("WASM binding resolution crashed:", err);
        _initPromise = null; // Flush instance states to allow re-entry attempts
      });
  }, []);

  return { engine: isReady ? _engine : null, isReady };
}

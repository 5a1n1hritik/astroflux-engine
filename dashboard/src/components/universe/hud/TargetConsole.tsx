"use client";

/**
 * TargetConsole.tsx
 * src/components/hud/TargetConsole.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Isolated target acquisition interface. Fixed top-right HUD panel.
 *
 * SRP: Owns only the target string state and the pipeline trigger callback.
 * Emits events upward via `onLoad(targetName)` — never touches simulation
 * state, WASM, or canvas context directly.
 *
 * Interaction model:
 *   - Input: monospaced, underline-only (no box border) — feels like a
 *     command-line prompt rather than a form field.
 *   - Enter key or button press triggers onLoad().
 *   - Loading state: button collapses to a pulsing spinner bar.
 *   - Recent targets: last 3 queries stored in local state, shown as
 *     clickable pills below the input for one-tap re-acquisition.
 *
 * Glassmorphism spec:
 *   bg: rgba(2,4,9,0.55)  backdrop-blur: 24px
 *   border: 1px solid rgba(226,232,240,0.06)
 *   No clip-path — preserves canvas bleed-through.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { Crosshair, ChevronRight, Clock } from "lucide-react";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface TargetConsoleProps {
  /** Initial target system name */
  defaultTarget?: string;
  /** Called when the user confirms a target. Parent handles the API fetch. */
  onLoad: (targetName: string) => Promise<void>;
  className?: string;
}

// ── Suggested defaults shown on first mount ───────────────────────────────────
const PRESET_TARGETS = ["Kepler-452", "Kepler-22b", "TRAPPIST-1"];

// ── Component ─────────────────────────────────────────────────────────────────

export default function TargetConsole({
  defaultTarget = "Kepler-452",
  onLoad,
  className = "",
}: TargetConsoleProps) {
  const [target,   setTarget]   = useState<string>(defaultTarget);
  const [loading,  setLoading]  = useState<boolean>(false);
  const [history,  setHistory]  = useState<string[]>([]);
  const [focused,  setFocused]  = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Trigger load ─────────────────────────────────────────────────────────────
  const handleLoad = useCallback(async () => {
    const trimmed = target.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    try {
      await onLoad(trimmed);
      // Prepend to history, deduplicate, cap at 3
      setHistory((prev) => {
        const deduped = [trimmed, ...prev.filter((h) => h !== trimmed)];
        return deduped.slice(0, 3);
      });
    } finally {
      setLoading(false);
    }
  }, [target, loading, onLoad]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleLoad();
    if (e.key === "Escape") inputRef.current?.blur();
  };

  // ── Quick-select from history or presets ─────────────────────────────────────
  const quickTargets = history.length > 0 ? history : PRESET_TARGETS;

  return (
    <div
      className={`absolute flex flex-col gap-3 ${className}`}
      style={{
        top:   28,
        right: 28,
        width: 248,
        // Glassmorphism — matches --glass-bg and --glass-blur tokens
        background:            "rgba(2, 4, 9, 0.58)",
        backdropFilter:        "blur(28px)",
        WebkitBackdropFilter:  "blur(28px)",
        border:                "1px solid rgba(226, 232, 240, 0.07)",
        borderRadius:          12,
        padding:               "14px 16px 12px",
        // Subtle inner highlight on top edge (glassmorphism depth cue)
        boxShadow: [
          "inset 0 1px 0 rgba(255,255,255,0.04)",
          "0 24px 48px rgba(0,0,0,0.45)",
          "0 0 0 0.5px rgba(226,232,240,0.04)",
        ].join(", "),
        // Corner bracket decoration (matches .bracketed from globals.css)
        position: "absolute",
      }}
      aria-label="Target acquisition console"
    >
      {/* ── Panel header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Crosshair
          size={10}
          style={{ color: "rgba(34,211,238,0.60)", flexShrink: 0 }}
          strokeWidth={2}
        />
        <span
          style={{
            fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
            fontSize:      8.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color:         "rgba(71,85,105,0.90)",
          }}
        >
          Target Acquisition
        </span>
      </div>

      {/* ── Separator ────────────────────────────────────────────────────── */}
      <div
        style={{
          height:     1,
          background: "linear-gradient(90deg, rgba(34,211,238,0.12) 0%, transparent 80%)",
          margin:     "0 -16px",
        }}
      />

      {/* ── Input row ────────────────────────────────────────────────────── */}
      <div
        style={{
          position:   "relative",
          display:    "flex",
          alignItems: "center",
          gap:        8,
          paddingBottom: 6,
          borderBottom: `1px solid ${
            focused
              ? "rgba(34,211,238,0.35)"
              : "rgba(226,232,240,0.08)"
          }`,
          transition: "border-color 0.2s ease",
        }}
      >
        {/* Prompt glyph */}
        <span
          style={{
            fontFamily: "var(--font-mono, 'Space Mono', monospace)",
            fontSize:   11,
            color:      focused ? "rgba(34,211,238,0.80)" : "rgba(34,211,238,0.35)",
            transition: "color 0.2s ease",
            userSelect: "none",
            lineHeight: 1,
          }}
        >
          &gt;_
        </span>

        <input
          ref={inputRef}
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          spellCheck={false}
          autoComplete="off"
          placeholder="e.g. Kepler-22b"
          aria-label="Target star system"
          style={{
            flex:        1,
            background:  "transparent",
            border:      "none",
            outline:     "none",
            fontFamily:  "var(--font-mono, 'Space Mono', monospace)",
            fontSize:    11,
            color:       "#22d3ee",
            caretColor:  "#22d3ee",
            letterSpacing: "0.04em",
          }}
        />
      </div>

      {/* ── Load button ──────────────────────────────────────────────────── */}
      <button
        onClick={handleLoad}
        disabled={loading || !target.trim()}
        aria-label={loading ? "Loading system data" : "Load target system"}
        style={{
          width:         "100%",
          height:        32,
          display:       "flex",
          alignItems:    "center",
          justifyContent:"center",
          gap:           7,
          borderRadius:  7,
          border:        "1px solid",
          borderColor:   loading
            ? "rgba(34,211,238,0.15)"
            : "rgba(34,211,238,0.30)",
          background:    loading
            ? "rgba(34,211,238,0.04)"
            : "rgba(34,211,238,0.08)",
          cursor:        loading ? "not-allowed" : "pointer",
          transition:    "all 0.2s ease",
          // Glow on hover via inline — Tailwind hover won't fire inside inline styles,
          // but we handle the hover state via CSS class below
        }}
        className="group"
      >
        {loading ? (
          // Animated loader bar
          <LoadingBar />
        ) : (
          <>
            <ChevronRight
              size={10}
              strokeWidth={2.5}
              style={{
                color:      "#22d3ee",
                transition: "transform 0.2s ease",
              }}
              className="group-hover:translate-x-0.5"
            />
            <span
              style={{
                fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
                fontSize:      9.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color:         "#22d3ee",
              }}
            >
              Load System
            </span>
          </>
        )}
        <style>{`
          button:hover:not(:disabled) {
            background: rgba(34,211,238,0.13) !important;
            border-color: rgba(34,211,238,0.50) !important;
            box-shadow: 0 0 18px rgba(34,211,238,0.18), 0 0 6px rgba(34,211,238,0.10);
          }
          button:active:not(:disabled) {
            transform: scale(0.975);
          }
        `}</style>
      </button>

      {/* ── Quick targets ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5" style={{ marginBottom: 2 }}>
          <Clock
            size={8}
            style={{ color: "rgba(71,85,105,0.60)" }}
            strokeWidth={2}
          />
          <span
            style={{
              fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
              fontSize:      7.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color:         "rgba(71,85,105,0.60)",
            }}
          >
            {history.length > 0 ? "Recent" : "Presets"}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {quickTargets.map((t) => (
            <button
              key={t}
              onClick={() => { setTarget(t); inputRef.current?.focus(); }}
              style={{
                fontFamily:    "var(--font-mono, 'Space Mono', monospace)",
                fontSize:      8,
                letterSpacing: "0.08em",
                color:         target === t
                  ? "rgba(34,211,238,0.90)"
                  : "rgba(100,116,139,0.80)",
                background:    target === t
                  ? "rgba(34,211,238,0.09)"
                  : "rgba(255,255,255,0.03)",
                border:        "1px solid",
                borderColor:   target === t
                  ? "rgba(34,211,238,0.25)"
                  : "rgba(255,255,255,0.06)",
                borderRadius:  4,
                padding:       "2px 7px",
                cursor:        "pointer",
                transition:    "all 0.15s ease",
                lineHeight:    "16px",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sub-component: animated loading bar ──────────────────────────────────────

function LoadingBar() {
  return (
    <div
      style={{
        width:     "100%",
        height:    2,
        background: "rgba(34,211,238,0.12)",
        borderRadius: 1,
        overflow:  "hidden",
        position:  "relative",
      }}
    >
      <div
        style={{
          position:   "absolute",
          top:        0,
          left:       "-40%",
          width:      "40%",
          height:     "100%",
          background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.80), transparent)",
          borderRadius: 1,
          animation:  "flux-scan 1.1s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes flux-scan {
          0%   { left: -40%; }
          100% { left: 140%; }
        }
      `}</style>
    </div>
  );
}
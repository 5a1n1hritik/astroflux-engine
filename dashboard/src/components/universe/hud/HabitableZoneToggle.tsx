"use client";

/**
 * HabitableZoneToggle.tsx
 * src/components/universe/hud/HabitableZoneToggle.tsx
 * SRP: Checkbox toggle for habitable zone torus visibility.
 * Only visible in System view. Emits onChange to parent.
 */

export interface HabitableZoneToggleProps {
  enabled: boolean;
  onChange: (val: boolean) => void;
}

export default function HabitableZoneToggle({ enabled, onChange }: HabitableZoneToggleProps) {
  return (
    <button
      role="checkbox"
      aria-checked={enabled}
      aria-label="Toggle Habitable Zone"
      onClick={() => onChange(!enabled)}
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        gap:            8,
        padding:        "6px 10px 6px 8px",
        background:     "rgba(2,6,15,0.65)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border:         "1px solid rgba(226,232,240,0.12)",
        borderRadius:   5,
        cursor:         "pointer",
        outline:        "none",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(52,211,153,0.35)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(226,232,240,0.12)"; }}
    >
      <span style={{
        width: 14, height: 14, borderRadius: 2,
        border: `1.5px solid ${enabled ? "#34d399" : "rgba(100,116,139,0.60)"}`,
        background: enabled ? "rgba(52,211,153,0.20)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "all 0.18s ease",
      }}>
        {enabled && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <polyline points="1.5,4 3.2,6 6.5,2" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span style={{
        fontFamily: "var(--font-mono, 'Space Mono', monospace)",
        fontSize: 10, letterSpacing: "0.08em",
        color: enabled ? "rgba(226,232,240,0.90)" : "rgba(100,116,139,0.75)",
        transition: "color 0.18s ease", whiteSpace: "nowrap",
      }}>
        Habitable Zone
      </span>
    </button>
  );
}
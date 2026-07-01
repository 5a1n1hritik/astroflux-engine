/**
 * createLabelElement.ts
 * src/components/universe/orbit-simulator/labels/createLabelElement.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Factory for a single DOM label element (planet/star name overlay).
 * Pure DOM construction — no positioning math, no THREE coupling.
 *
 * SRP: only creates and styles the element. Positioning lives in
 * projectLabels.ts; lifecycle (append/remove) lives in the caller.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface LabelStyleOptions {
  /** "planet" gets cyan-ish neutral tone, "star" gets warm amber tone */
  variant?: "planet" | "star";
}

const VARIANT_COLOR: Record<NonNullable<LabelStyleOptions["variant"]>, string> = {
  planet: "rgba(203,213,225,0.85)",
  star:   "rgba(251,191,36,0.90)",
};

export function createLabelElement(text: string, options: LabelStyleOptions = {}): HTMLDivElement {
  const variant = options.variant ?? "planet";
  const el = document.createElement("div");

  el.textContent = text;
  el.style.cssText = `
    position: absolute;
    color: ${VARIANT_COLOR[variant]};
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 9px;
    letter-spacing: 0.08em;
    pointer-events: auto;
    cursor: pointer;
    white-space: nowrap;
    text-shadow: 0 1px 4px rgba(0,0,0,0.90);
    background: rgba(2,4,9,0.45);
    padding: 1px 5px;
    border-radius: 2px;
    transition: background 0.15s ease, color 0.15s ease;
    z-index: 5;
  `;

  el.addEventListener("mouseenter", () => {
    el.style.background = "rgba(34,211,238,0.20)";
    el.style.color = "#f1f5f9";
  });
  el.addEventListener("mouseleave", () => {
    el.style.background = "rgba(2,4,9,0.45)";
    el.style.color = VARIANT_COLOR[variant];
  });

  return el;
}
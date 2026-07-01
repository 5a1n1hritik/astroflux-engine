/**
 * index.ts
 * src/components/universe/orbit-simulator/labels/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Public entry point for the labels module. Owns the Map<planetName, div>
 * lifecycle: build all labels for the current system, append to container,
 * and tear down on unmount/rebuild.
 *
 * SRP: lifecycle orchestration only. Element creation -> createLabelElement.ts.
 * Per-frame positioning -> projectLabels.ts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createLabelElement } from "./createLabelElement";
import type { PlanetConfig } from "../types";

export { projectLabels } from "./projectLabels";

/**
 * Builds one label per planet + one for the host star, appends them to
 * `container`, and returns a Map keyed by name for per-frame lookup.
 */
export function buildLabels(
  container: HTMLElement,
  planets: PlanetConfig[],
  starName: string,
): Map<string, HTMLDivElement> {
  const labels = new Map<string, HTMLDivElement>();

  const starLabel = createLabelElement(starName, { variant: "star" });
  container.appendChild(starLabel);
  labels.set("__star__", starLabel);

  for (const planet of planets) {
    const labelEl = createLabelElement(planet.planet_name, { variant: "planet" });
    container.appendChild(labelEl);
    labels.set(planet.planet_name, labelEl);
  }

  return labels;
}

/**
 * Removes all label elements from the DOM and clears the map.
 * Call on scene teardown to avoid orphaned nodes across remounts.
 */
export function destroyLabels(labels: Map<string, HTMLDivElement>): void {
  labels.forEach((el) => el.remove());
  labels.clear();
}
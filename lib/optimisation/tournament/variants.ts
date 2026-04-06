/**
 * Active variant registry.
 *
 * Tracks which prompt variants are currently in the tournament rotation.
 * Modified by the evolution layer after each tournament run (retire lowest,
 * register replacement). Never touches the production pipeline.
 */

import fs from "fs";
import path from "path";

export type VariantMeta = {
  id: string;
  label: string;
  generation: number;
  retiredAt?: string;
};

export type VariantRegistry = {
  active: string[];
  retired: VariantMeta[];
  nextId: string;
};

const REGISTRY_PATH = path.join(
  process.cwd(),
  "lib",
  "optimisation",
  "tournament",
  "registry.json",
);

const DEFAULT_REGISTRY: VariantRegistry = {
  active: ["A", "B", "C", "D"],
  retired: [],
  nextId: "E",
};

export function readRegistry(): VariantRegistry {
  try {
    if (!fs.existsSync(REGISTRY_PATH)) {
      return DEFAULT_REGISTRY;
    }
    const raw = fs.readFileSync(REGISTRY_PATH, "utf-8");
    return JSON.parse(raw) as VariantRegistry;
  } catch {
    return DEFAULT_REGISTRY;
  }
}

export function writeRegistry(registry: VariantRegistry): void {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf-8");
}

/** Generate the next single-letter or multi-letter variant ID. */
export function advanceId(current: string): string {
  // A → B → ... → Z → AA → AB → ...
  const chars = current.split("");
  let i = chars.length - 1;
  while (i >= 0) {
    if (chars[i] !== "Z") {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
      return chars.join("");
    }
    chars[i] = "A";
    i--;
  }
  return "A" + chars.join("");
}

/**
 * Retire a variant from the active set and log it to the retired list.
 * Returns the updated registry (not yet written — caller writes when ready).
 */
export function retireVariant(
  registry: VariantRegistry,
  variantId: string,
  label: string,
  generation: number,
): VariantRegistry {
  return {
    ...registry,
    active: registry.active.filter((id) => id !== variantId),
    retired: [
      ...registry.retired,
      {
        id: variantId,
        label,
        generation,
        retiredAt: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Register a new variant as active and advance the nextId pointer.
 */
export function registerNewVariant(
  registry: VariantRegistry,
): { registry: VariantRegistry; newId: string } {
  const newId = registry.nextId;
  return {
    newId,
    registry: {
      ...registry,
      active: [...registry.active, newId],
      nextId: advanceId(registry.nextId),
    },
  };
}

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface JsonStore<T> {
  /** The live state object. Mutate it, then call `save()`. */
  readonly state: T;
  save(): void;
}

/**
 * State for a mock backend, persisted as one JSON file so a demo survives a
 * restart. `seed()` builds the first state; pass `reset` to throw the file away.
 */
export function createStore<T>(file: string, seed: () => T, opts: { reset?: boolean } = {}): JsonStore<T> {
  if (opts.reset) rmSync(file, { force: true });
  const state: T = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : seed();
  const save = () => {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(state, null, 2));
  };
  save();
  return { state, save };
}

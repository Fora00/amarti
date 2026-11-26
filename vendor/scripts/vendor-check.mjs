#!/usr/bin/env node
/**
 * pnpm vendor:check   (inside a project repo: runs vendor/scripts/vendor-check.mjs)
 *
 * Fails if `vendor/` differs from what the factory's last `pnpm sync` wrote. The fix
 * is never to edit `vendor/`: change the factory, then `pnpm sync <project>` there.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describeDrift, drift, isClean, readManifest } from "./_vendor.mjs";

const vendorDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const d = drift(vendorDir);
if (!d) {
  console.error("vendor-check: no vendor/.factory-sync.json — this folder was not written by `pnpm sync`.");
  process.exit(1);
}
const { syncedAt, factory } = readManifest(vendorDir);
if (isClean(d)) {
  console.log(`vendor-check: clean (factory ${factory}, synced ${syncedAt}).`);
} else {
  console.error(`vendor-check: vendor/ was edited by hand since the last sync:\n${describeDrift(d)}\n` +
    "Move the change into the factory and run `pnpm sync <project>` there.");
  process.exit(1);
}

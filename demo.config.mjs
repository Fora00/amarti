/**
 * How `pnpm demo --amarti` / `pnpm build:site --amarti` build and run this project.
 * Format: `DemoManifest` in common/src/demo/manifest.ts.
 *
 * amarti/ is a project folder: `site/` (public), `app/` (private) and
 * `backend/` (Supabase + the local mock), which both front ends share.
 */
export default {
  name: "amarti",
  builds: [
    { package: "amarti", dir: "amarti/site", mount: "/", baseEnv: "SITE_BASE" },
    { package: "amarti-app", dir: "amarti/app", mount: "/app/", baseEnv: "APP_BASE" },
  ],
  // A GitHub preview: nothing indexed, robots Disallow.
  demoEnv: { PUBLIC_DEMO: "1" },
  // Local demo: the contact form POSTs to the mock backend, the app uses mock data.
  localEnv: { PUBLIC_FORMS_BASE: "/functions/v1", PUBLIC_DATA_MODE: "mock" },
  // Relative to this folder.
  backend: "backend/mock/backend.mjs",
};

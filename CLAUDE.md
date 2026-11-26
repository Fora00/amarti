# amarti — read this first

A standalone repo: one friend's project (public site, private app, backend),
built from the **website factory**. Everything needed to install, check and build
is inside this folder.

| Folder | What |
|---|---|
| `site/` | Public Astro site (package `amarti`). |
| `app/` | Private app (package `amarti-app`). |
| `backend/` | Supabase migrations/functions + the local mock (package `amarti-backend`). |
| `vendor/` | **Copied from the factory by `pnpm sync amarti` — never edit here.** `@factory/common`, `@factory/design-system`, `tsconfig.base.json`, the factory's CONVENTIONS and DECISIONS. |
| `plan/` | This project's memory between sessions: ROADMAP, RESUME, BRIEF, DECISIONS. State, not docs. |

## At the start of every session

1. Read `plan/ROADMAP.md` (header = current phase and next action), then `plan/RESUME.md` and `plan/BRIEF.md`.
2. Read `vendor/plan/CONVENTIONS.md` before writing code — the factory's rules apply here too.
3. Run `pnpm vendor:check`: if `vendor/` was edited by hand, stop and say so.

## Commands

`pnpm install` · `pnpm dev` / `pnpm dev:app` · `pnpm check` · `pnpm test` · `pnpm build` ·
`pnpm --filter amarti-backend check:functions` (Deno) · `pnpm vendor:check`. pnpm only, never npm/yarn.

## Shared code

A change to `vendor/` is a change to the factory: make it in the factory repo
(`common/` or `design-system/`), then run `pnpm sync amarti` there and `pnpm install`
here if a package.json changed. An edit made directly in `vendor/` is reported as
drift and blocks the next sync.

## At the end of every session

1. Prepend a session block to `plan/RESUME.md` (same template, newest first, max **5** blocks; older ones collapse into `## Archive`).
2. Update the three-line header of `plan/ROADMAP.md`.
3. A choice a future session might reverse → append to `plan/DECISIONS.md`.

## Never

- Edit `vendor/` (see above) or anything under an `ispiration/` folder.
- Commit secrets: `.env*` are git-ignored, only `.env.example` is committed. The service-role key never goes in a `PUBLIC_` variable.
- Add client JS beyond the exceptions listed in `vendor/plan/CONVENTIONS.md` without a decision.

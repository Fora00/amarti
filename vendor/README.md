# vendor/ — copied from the website factory. Do not edit.

Everything here is written by `pnpm sync <project>` in the factory repo and is
checked by `pnpm vendor:check` (sha256 of every file in `.factory-sync.json`).

- `common/`, `design-system/`: the shared packages (`@factory/*`), linked by
  `workspace:*` exactly as in the factory.
- `tsconfig.base.json`: what every package's tsconfig extends.
- `plan/CONVENTIONS.md`, `plan/DECISIONS.md`: the factory's rules, for reference.
  This project's own plan is in `../plan/`.

A fix belongs in the factory; sync it out from there. An edit made here is reported
as drift and the next sync refuses to run until it is resolved.

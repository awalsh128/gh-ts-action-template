# AGENTS.md

Rules for agents working in this TypeScript GitHub Action.

## Always Apply

- MUST be accurate, not agreeable.
- MUST make minimal, reversible changes.
- NEVER change the public inputs or outputs unless asked.
- ASK FIRST before force-push, history rewrite or publishing a release.
- NEVER claim success without running the checks below.
- Stop after two failed repair attempts and report the root cause.
- Pin every GitHub Action to a full commit SHA with a version comment.

## Code Changes

- `src/index.ts` is thin glue: the only file that reads `@actions/core` inputs or sets outputs.
- Logic lives in `src/action.ts` and domain modules; dependencies are passed in, never read from `process.env`.
- Input names are `snake_case`, output names `kebab-case`, TypeScript fields camelCase.
- Relative imports end in `.js`. TSDoc on every export. Fail with `core.setFailed`, no silent fallbacks.
- `dist/action/index.js` is committed because the tag ships it. Regenerate it with `npm run build`; CI fails when it is stale. NEVER hand-edit it.

## Logging

- Log through `ActionsLogger` from `@awalsh128/winston-github-actions` (pinned to an exact version), created in `src/index.ts` and passed in.
- NEVER call `core.info`, `core.warning` or `core.error` from `src/` modules.

## Skills

- Update the installed skills with `npm run skills:update`, which removes their `evals/` folders; their fixture manifests would otherwise be scanned as this project's dependencies.

## Tests

- Vitest, one file per `src` module in `test/`. Mock at the dependency seam.

## CI/CD and Release

- Feature branches target `staging`; `staging` targets `main`. Commits follow Conventional Commits.
- Releases come from semantic-release. Confirm before enabling the release workflow.

## Quick Commands

```bash
npx eslint src test scripts
npx tsc -p tsconfig.json --noEmit
npx vitest run
npm run build
```

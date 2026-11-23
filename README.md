<h1 align="center">TypeScript Action Template</h1>

<p align="center">
  A GitHub template repository for starting <a href="https://docs.github.com/actions/sharing-automations/creating-actions/creating-a-javascript-action">TypeScript GitHub Actions</a>.
</p>

<p align="center">
  <a href="https://github.com/awalsh128/gh-ts-action-template/actions/workflows/ci.yml"><img src="https://github.com/awalsh128/gh-ts-action-template/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/awalsh128/gh-ts-action-template" alt="License"></a>
</p>

A ready-to-build Node 24 action with typed inputs and outputs, a thin entrypoint over a testable core, a
single-file bundle, and CI that builds once and runs the action end to end. It ships a sample "greet" action
that you replace with your own.

- 🧱 **Layered code:** `src/index.ts` is glue, `src/action.ts` is the testable core, and logging goes through
  [`@awalsh128/winston-github-actions`](https://github.com/awalsh128/winston-host-adapters/tree/staging/packages/winston-github-actions#readme)
- 📦 **Single-file bundle:** `tsc` then Rollup to `dist/action/index.js`, no `npm install` at run time
- ✅ **Tested:** Vitest with v8 coverage and a 95% type-coverage gate
- 🔒 **Hardened CI:** SHA-pinned actions, least-privilege permissions, OIDC instead of secrets
- 🚀 **Release-ready:** semantic-release config with `staging` as the `rc` branch

<!-- prettier-ignore -->
<p align="center">
  <a href="https://github.com/sponsors/awalsh128"><img src="https://img.shields.io/badge/Sponsor-%E2%9D%A4-db61a2?style=for-the-badge&logo=githubsponsors&logoColor=white" alt="Sponsor awalsh128"></a>
</p>

<p align="center">
  Free and open source, and kept up by one person.<br />
  If it saves you time, <a href="https://github.com/sponsors/awalsh128">sponsor it monthly</a> or
  <a href="https://github.com/sponsors/awalsh128?frequency=one-time">leave a small one-time tip</a>. Every bit
  helps.
</p>

## Quick Start

1. Click **Use this template** on GitHub, or run:

   ```bash
   gh repo create <owner>/<your-action> --template awalsh128/gh-ts-action-template --public --clone
   cd <your-action>
   npm ci && npm run build && npm test
   ```

2. Replace the sample action (see below), then push. CI runs the same build, checks and end-to-end run.

## Making it yours

Everything is copied into your new repository, so change these before the first release:

| File                            | Change                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `action.yml`                    | `name`, `description`, `author`, `branding`, inputs and outputs              |
| `package.json`                  | `name`, `description`, `repository`, `funding`; keep the placeholder version |
| `src/action.ts`, `src/index.ts` | Replace the greet logic and input parsing                                    |
| `test/action.test.ts`           | Replace with tests for your logic                                            |
| `.github/workflows/ci.yml`      | Update the `integration` job's inputs and assertions                         |
| `README.md`, `AGENTS.md`        | Rewrite for your action; this README describes the template                  |

Then, in the repository settings:

- Create a `staging` branch; feature branches target it and it is promoted to `main`.
- Enable the repository on [Codecov](https://about.codecov.io/) and set `fail_ci_if_error: true` in `ci.yml`.
- Install the [Octo STS app](https://github.com/apps/octo-sts/installations/new) on the repository, then set
  the `RELEASES_ENABLED` variable to `true`. Releases stay held until then. `publish.yml` releases with
  semantic-release; `install-template.sh --release-tool release-please` swaps in
  [release-please](https://github.com/googleapis/release-please) instead, where merging its Release PR on
  `staging` cuts the release.

## What's included

| Path                                                      | Purpose                                                  |
| --------------------------------------------------------- | -------------------------------------------------------- |
| `action.yml`                                              | Action metadata, runs `dist/action/index.js` on `node24` |
| `src/`, `test/`                                           | Action code and one Vitest file per module               |
| `scripts/ops/`                                            | Repo tooling run with `node --experimental-strip-types`  |
| `.github/actions/setup`, `.github/workflows/ci.yml`       | Shared setup and CI                                      |
| `release.config.ts`                                       | semantic-release branches and plugins                    |
| `rollup.config.mjs`, `tsconfig*.json`, `vitest.config.ts` | Build, typecheck and test config                         |

`dist/action/index.js` is committed because the release tag ships it, and CI fails when it is stale. Regenerate it with `npm run build`; never edit it by hand.

## The sample action

| Input       | Description                                                                                                                                                  | Required | Default    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------- |
| `name`      | Name to greet                                                                                                                                                | Yes      |            |
| `style`     | Greeting style: `friendly` or `formal`                                                                                                                       | No       | `friendly` |
| `shout`     | Upper-case the greeting (`true`/`false`)                                                                                                                     | No       | `false`    |
| `upload_io` | Upload inputs and outputs as a workflow artifact (`true`/`false`). Off by default: inputs are uploaded as given, so never turn it on when one holds a secret | No       | `false`    |

| Output     | Description                 |
| ---------- | --------------------------- |
| `greeting` | The generated greeting text |

## Development

```bash
npm run build       # tsc, then bundle to dist/action/index.js
npm run lint
npm run typecheck
npm test
```

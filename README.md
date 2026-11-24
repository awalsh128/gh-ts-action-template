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
- 📦 **Committed bundle:** `tsc` then Rollup to `dist/action/index.js`, which the release tag ships, so there is
  no `npm install` at run time and CI fails when it is stale
- ✅ **Tested:** Vitest with v8 coverage and a 95% type-coverage gate
- 🔒 **Hardened CI:** SHA-pinned actions, least-privilege permissions, OIDC instead of secrets, and
  `staging`/`main` rulesets with a pull request policy
- 🚀 **Release pipeline:** `promote.yml` fast-forwards `main` from `staging`, and `publish.yml` releases with
  semantic-release or [release-please](https://github.com/googleapis/release-please), held until you enable it

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

   Or, from a clone of this repository, let `install-template.sh` do it all: it creates the repository, renames
   the placeholders, points the Octo STS trust policies at it, verifies the build, creates `staging`, applies
   the branch rules, limits the `release` environment to `main` and `staging`, and pauses until you confirm the
   Octo STS app is installed. Then it locks `main` and tags to the app.

   ```bash
   ./install-template.sh <owner>/<your-action> --description "What it does"
   ```

   Options: `--private`, `--release-tool release-please`, `--skip-rulesets`, `--octo-sts-installed` and
   `--dry-run`.

2. Replace the sample action (see below), then push. CI runs the same build, checks and end-to-end run.

## Making it yours

### With an agent

Open your new repository in Claude Code, Codex, Cursor or Gemini. It reads `AGENTS.md` and the skills in
`.agents/skills/` on its own, so paste this prompt and fill in the placeholders:

```text
Turn this template into my own GitHub Action, using the github-ts-action skill
(.agents/skills/github-ts-action/SKILL.md) and the rules in AGENTS.md. src/index.ts is the input and output
glue, src/action.ts holds the greet logic, and src/instrumentation.ts handles the artifact uploads.

- Name: <action name>
- What it does: <one or two sentences>
- Inputs: <name, description, required, default for each>
- Outputs: <name and description for each>

Replace the sample greet action: update action.yml, package.json, src/, test/, the integration job in
.github/workflows/ci.yml, and the README and AGENTS.md. Run the checks in AGENTS.md, regenerate dist with
npm run build, and report anything you could not verify. Do not enable releases or push.
```

### By hand

Everything is copied into your new repository, so change these before the first release:

| File                            | Change                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `action.yml`                    | `name`, `description`, `author`, `branding`, inputs and outputs              |
| `package.json`                  | `name`, `description`, `repository`, `funding`; keep the placeholder version |
| `src/action.ts`, `src/index.ts` | Replace the greet logic and input parsing                                    |
| `test/action.test.ts`           | Replace with tests for your logic                                            |
| `.github/workflows/ci.yml`      | Update the `integration` job's inputs and assertions                         |
| `.github/chainguard/*.yaml`     | Owner and repository IDs and workflow paths; the install script rewrites     |
| `README.md`, `AGENTS.md`        | Rewrite for your action; this README describes the template                  |

Then, in the repository settings:

- Create `staging`, then apply `.github/rulesets/staging.json` with
  `gh api -X POST repos/<owner>/<repo>/rulesets --input <file>`. Apply `main.json` and `tags.json` once the
  Octo STS app is installed: they let only the app update `main` and create tags, so `main` then moves only
  through `promote.yml`. Feature branches target `staging`.
- Enable the repository on [Codecov](https://about.codecov.io/) and set `fail_ci_if_error: true` in `ci.yml`.
- Install the [Octo STS app](https://github.com/apps/octo-sts/installations/new) on the repository, then set
  the `RELEASES_ENABLED` variable to `true`. Releases stay held until then.
- Pick the release tool. `publish.yml` releases with semantic-release; `--release-tool release-please` swaps in
  release-please instead, where merging its Release PR on `staging` cuts the release.

## What's included

| Path                                                      | Purpose                                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `action.yml`                                              | Action metadata, runs `dist/action/index.js` on `node24`                      |
| `src/`, `test/`                                           | Action code and one Vitest file per module                                    |
| `scripts/ops/`                                            | Repo tooling run with `node --experimental-strip-types`                       |
| `.github/workflows/`                                      | Build and test (`ci.yml`), PR policy (`pr.yml`), `promote.yml`, `publish.yml` |
| `.github/actions/`                                        | `setup` and `require-ci-success` composite actions                            |
| `.github/chainguard/`, `.github/rulesets/`                | Octo STS trust policies and branch rulesets                                   |
| `release.config.ts`, `.github/release-tools/`             | semantic-release config and the release-please alternative                    |
| `install-template.sh`                                     | Creates a new action repository from this template                            |
| `AGENTS.md`, `.agents/skills/`, `.gemini/`                | Shared instructions and skills for Claude Code, Codex, Cursor and Gemini      |
| `rollup.config.mjs`, `tsconfig*.json`, `vitest.config.ts` | Build, typecheck and test config                                              |

`dist/action/index.js` is committed because the release tag ships it, and CI fails when it is stale. Regenerate it with `npm run build`; never edit it by hand.

## The sample action

Use it in a workflow, pinning to a release tag once one exists:

```yaml
jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - id: greet
        uses: awalsh128/gh-ts-action-template@main
        with:
          name: Ada
          style: formal
      - env:
          GREETING: ${{ steps.greet.outputs.greeting }}
        run: echo "$GREETING" # Good day, Ada.
```

Or run the bundle, `dist/action/index.js`, directly. `@actions/core` reads each input from an `INPUT_<NAME>`
variable and writes outputs to the file in `GITHUB_OUTPUT`:

```bash
npm run build
export GITHUB_OUTPUT="$(mktemp)"
INPUT_NAME=Ada INPUT_STYLE=formal INPUT_SHOUT=false INPUT_UPLOAD_IO=never INPUT_OUTPUT_JSON=false node dist/action/index.js
# Generated greeting: Good day, Ada.
cat "$GITHUB_OUTPUT"   # the greeting and details outputs
```

> [!NOTE]
> The runner applies the defaults from `action.yml`; a direct run does not, so set every input. Leaving one out
> fails with an error such as `Invalid style "". Expected one of: friendly, formal.`

| Input         | Description                                                                                                                                                        | Required | Default    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------- |
| `name`        | Name to greet                                                                                                                                                      | Yes      |            |
| `style`       | Greeting style: `friendly` or `formal`                                                                                                                             | No       | `friendly` |
| `shout`       | Upper-case the greeting (`true`/`false`)                                                                                                                           | No       | `false`    |
| `upload_io`   | When to upload inputs and outputs as a workflow artifact: `never`, `failure` or `always`. Inputs are uploaded as given, so never enable it when one holds a secret | No       | `never`    |
| `output_json` | Also upload every output as one `outputs.json` artifact (`true`/`false`), without the inputs                                                                       | No       | `false`    |

| Output     | Description                                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| `greeting` | The generated greeting text                                                                                     |
| `details`  | A JSON object describing the greeting: `text`, `style`, `shout`, `words` and `stats`. Read it with `fromJSON()` |

### Outputs as one JSON file

A workflow output is always a string, so an object like `details` travels as JSON text. Set `output_json: true`
to also upload every output as one `outputs.json` in the artifact
`action-outputs-<run>-<attempt>-<job>-<step>`, where `details` is a real nested object. It holds no inputs, so
it is safe when an input is a secret (`upload_io` is not). Nothing is uploaded when the run fails.

```json
{
  "greeting": "Good day, Ada.",
  "details": {
    "text": "Good day, Ada.",
    "style": "formal",
    "shout": false,
    "words": ["Good", "day,", "Ada."],
    "stats": { "characters": 14, "words": 3 }
  }
}
```

```yaml
- id: greet
  uses: awalsh128/gh-ts-action-template@main
  with:
    name: Ada
    style: formal
    output_json: true
- env:
    DETAILS: ${{ steps.greet.outputs.details }}
  run: jq -r .stats.words <<<"$DETAILS" # 3
```

## Development

```bash
npm run build         # tsc, then bundle to dist/action/index.js
npm run lint
npm run typecheck
npm run format:check
npm test
```

#!/usr/bin/env bash
# Creates a new TypeScript GitHub Action repository from awalsh128/gh-ts-action-template: makes the
# repo, renames the placeholders, verifies the build, creates staging and applies the branch rules.
# Needs gh (authenticated), git, node and npm. The new repo's own copy of this script removes itself.
set -euo pipefail

readonly TEMPLATE="awalsh128/gh-ts-action-template"

usage() {
  cat <<USAGE
Usage: $0 <owner>/<repo> [options]

Options:
  --description TEXT   Repository and action description (default: "TypeScript GitHub Action")
  --private            Create a private repository (default: public)
  --skip-rulesets      Do not create staging or apply the branch rules
  --dry-run            Print the steps without running them
  -h, --help           Show this help
USAGE
}

DRY_RUN=false

# Prints a step heading.
step() { printf '\n==> %s\n' "$*"; }

# Runs a command, or only prints it with --dry-run.
run() {
  printf '+ %s\n' "$*"
  if [[ "$DRY_RUN" != true ]]; then
    "$@"
  fi
}

# Title-cases a repository name: "my-cool-action" -> "My Cool Action".
title_from() {
  printf '%s' "$1" | sed -E 's/[-_.]+/ /g' | awk '{ for (i = 1; i <= NF; i++) $i = toupper(substr($i, 1, 1)) substr($i, 2) } 1'
}

# Rewrites the placeholders in the current directory. Args: owner repo description.
personalize() {
  local owner="$1" repo="$2" description="$3" title
  title="$(title_from "$repo")"
  node --input-type=module - "$owner" "$repo" "$title" "$description" "$TEMPLATE" <<'NODE'
import { readFileSync, writeFileSync } from "node:fs";

const [owner, repo, title, description, template] = process.argv.slice(2);

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
pkg.name = repo;
pkg.description = description;
pkg.repository = { type: "git", url: `git+https://github.com/${owner}/${repo}.git` };
pkg.funding = { type: "github", url: `https://github.com/sponsors/${owner}` };
writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);

const action = readFileSync("action.yml", "utf8")
  .replace(/^name: .*$/m, () => `name: ${JSON.stringify(title)}`)
  .replace(/^description: .*$/m, () => `description: ${JSON.stringify(description)}`)
  .replace(/^author: .*$/m, () => `author: ${owner}`);
writeFileSync("action.yml", action);

writeFileSync(
  "README.md",
  `# ${title}\n\n${description}\n\nCreated from [${template}](https://github.com/${template}). Replace this README.\n`,
);
NODE
}

main() {
  local slug="" description="TypeScript GitHub Action" visibility="--public" rulesets=true

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --description) description="${2:?--description needs a value}"; shift 2 ;;
      --private) visibility="--private"; shift ;;
      --skip-rulesets) rulesets=false; shift ;;
      --dry-run) DRY_RUN=true; shift ;;
      -h | --help) usage; return 0 ;;
      -*) echo "Unknown option: $1" >&2; usage >&2; return 2 ;;
      *) slug="$1"; shift ;;
    esac
  done

  if [[ ! "$slug" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
    echo "Expected <owner>/<repo>, got: '${slug}'" >&2
    usage >&2
    return 2
  fi
  local owner="${slug%%/*}" repo="${slug##*/}"

  for tool in gh git node npm; do
    command -v "$tool" >/dev/null || { echo "Missing required tool: $tool" >&2; return 1; }
  done

  step "Create $slug from $TEMPLATE"
  run gh repo create "$slug" --template "$TEMPLATE" "$visibility" --description "$description" --clone

  if [[ "$DRY_RUN" == true ]]; then
    step "Dry run: would rename placeholders, verify, push, create staging and apply rulesets in ./$repo"
    return 0
  fi
  cd "$repo"

  step "Rename placeholders"
  personalize "$owner" "$repo" "$description"
  git rm -q --ignore-unmatch install-template.sh

  step "Install, build and test"
  npm install --package-lock-only --ignore-scripts
  npm ci
  npm run build
  npm test

  step "Commit and push"
  git add -A
  git commit -q -m "chore: initialize from template"
  git push -q origin HEAD

  if [[ "$rulesets" == true ]]; then
    step "Create staging and apply the branch rules"
    git push -q origin HEAD:refs/heads/staging
    gh api -X PATCH "repos/$slug" -F allow_merge_commit=false -F allow_rebase_merge=false \
      -F allow_squash_merge=true -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=BLANK \
      -F delete_branch_on_merge=true --silent
    for file in .github/rulesets/*.json; do
      [[ -e "$file" ]] || continue
      gh api -X POST "repos/$slug/rulesets" --input "$file" --jq '"applied ruleset: " + .name'
    done
  fi

  step "Done"
  cat <<NEXT
Next steps in ./$repo:
  - Replace the sample "greet" action (action.yml, src/, test/) and rewrite README.md and AGENTS.md.
  - Enable the repository on Codecov, then set fail_ci_if_error: true in .github/workflows/ci.yml.
  - Open pull requests against staging; main is updated by promotion.
NEXT
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi

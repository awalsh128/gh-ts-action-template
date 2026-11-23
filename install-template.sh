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
  --release-tool TOOL  Release tool: semantic-release (default) or release-please
  --octo-sts-installed Skip the pause: the Octo STS app is already installed on the new repository
  --dry-run            Print the steps without running them
  -h, --help           Show this help
USAGE
}

DRY_RUN=false

# Rulesets whose only bypass actor is the Octo STS app, applied after the app-install pause.
readonly LOCKED_RULESETS=(main.json tags.json)

readonly OCTO_STS_INSTALL_URL="https://github.com/apps/octo-sts/installations/new"

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

# Applies the chosen release tool. The template ships semantic-release; the alternatives wait in
# .github/release-tools/ and are removed whether or not one is chosen. Arg: tool.
use_release_tool() {
  local tool="$1" dir=".github/release-tools/release-please"
  if [[ "$tool" == "release-please" && -d "$dir" ]]; then
    # release-please opens a Release PR on staging and tags when it merges, so semantic-release, its
    # publish workflow, its trust policy and the rc-based major check all go.
    git rm -q --ignore-unmatch release.config.ts .github/workflows/publish.yml \
      .github/chainguard/release.sts.yaml scripts/ops/confirm_major.mts test/confirm_major.test.ts
    cp "$dir/release-please.yml" "$dir/promote.yml" .github/workflows/
    cp "$dir/release-please-config.json" "$dir/.release-please-manifest.json" .
    mkdir -p .github/chainguard
    cp "$dir/release-please.sts.yaml" .github/chainguard/
    node --input-type=module -e '
      import { readFileSync, writeFileSync } from "node:fs";
      const pkg = JSON.parse(readFileSync("package.json", "utf8"));
      delete pkg.scripts["release"];
      delete pkg.scripts["release:dry-run"];
      writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
    '
    npm uninstall semantic-release --package-lock-only --ignore-scripts
  fi
  rm -rf .github/release-tools
}

# Points the Octo STS trust policies at the new repository. They match the owner and repository IDs and the
# workflow path, so a copy that keeps the template's values is rejected on every run. Args: owner repo.
retarget_policies() {
  local owner="$1" repo="$2" ids owner_id repo_id file
  ids="$(gh api "repos/$owner/$repo" --jq '"\(.owner.id) \(.id)"')"
  owner_id="${ids%% *}"
  repo_id="${ids##* }"
  for file in .github/chainguard/*.sts.yaml; do
    [[ -e "$file" ]] || continue
    sed -i.bak -E \
      -e "s#^subject_pattern: .*#subject_pattern: \"repo:${owner}@${owner_id}/${repo}@${repo_id}:.*\"#" \
      -e "s#(job_workflow_ref: \")[^/]+/[^/]+/#\1${owner}/${repo}/#" "$file"
    rm -f "$file.bak"
  done
}

# Creates one ruleset from a file. A failure warns with the manual command instead of stopping the script,
# because the repository is already usable. Args: owner/repo file.
apply_ruleset() {
  local slug="$1" file="$2"
  if ! gh api -X POST "repos/$slug/rulesets" --input "$file" --jq '"applied ruleset: " + .name'; then
    echo "!! Could not apply $file. Apply it later with:" >&2
    echo "   gh api -X POST repos/$slug/rulesets --input $file" >&2
  fi
}

# Restricts the release environment to main and staging, the only branches that release. The environment
# does not exist until its first run names it, and this creates it. A failure warns with the manual
# commands instead of stopping the script. Arg: owner/repo.
restrict_release_environment() {
  local slug="$1" branch ok=true
  gh api -X PUT "repos/$slug/environments/release" -F "deployment_branch_policy[protected_branches]=false" \
    -F "deployment_branch_policy[custom_branch_policies]=true" --silent || ok=false
  if [[ "$ok" == true ]]; then
    for branch in main staging; do
      gh api -X POST "repos/$slug/environments/release/deployment-branch-policies" -f name="$branch" \
        -f type=branch --silent || ok=false
    done
  fi
  if [[ "$ok" == true ]]; then
    echo "restricted the release environment to main and staging"
  else
    echo "!! Could not restrict the release environment. In the repository settings under Environments," >&2
    echo "   limit release to the main and staging branches." >&2
  fi
}

# Stops until the user confirms the Octo STS app is installed on the repository. A user token cannot list
# app installations (GitHub answers 403), so the script cannot check; it asks. Arg: owner/repo.
wait_for_octo_sts() {
  local slug="$1"
  cat <<MESSAGE

!! The Octo STS app must be installed on $slug before promote or publish can run.
   Without it every run of promote.yml and publish.yml fails with "token does not match trust policy".
   This script cannot detect the install, so install it now:

     $OCTO_STS_INSTALL_URL

   Select $slug, then come back here.
MESSAGE
  read -r -n 1 -s -p "Press any key once the app is installed on $slug (Ctrl-C to stop)... "
  printf '\n'
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
  local slug="" description="TypeScript GitHub Action" visibility="--public" rulesets=true octo_confirmed=false release_tool="semantic-release"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --description) description="${2:?--description needs a value}"; shift 2 ;;
      --private) visibility="--private"; shift ;;
      --skip-rulesets) rulesets=false; shift ;;
      --octo-sts-installed) octo_confirmed=true; shift ;;
      --release-tool) release_tool="${2:?--release-tool needs a value}"; shift 2 ;;
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
  if [[ "$release_tool" != "semantic-release" && "$release_tool" != "release-please" ]]; then
    echo "Unknown --release-tool: '${release_tool}'. Use semantic-release or release-please." >&2
    return 2
  fi
  local owner="${slug%%/*}" repo="${slug##*/}"

  for tool in gh git node npm; do
    command -v "$tool" >/dev/null || { echo "Missing required tool: $tool" >&2; return 1; }
  done

  # The Octo STS pause needs a person at the keyboard; fail before creating anything rather than after.
  if [[ "$DRY_RUN" != true && "$octo_confirmed" != true && ! -t 0 ]]; then
    echo "No terminal to confirm the Octo STS app install. Install it first, then pass --octo-sts-installed." >&2
    return 1
  fi

  step "Create $slug from $TEMPLATE"
  run gh repo create "$slug" --template "$TEMPLATE" "$visibility" --description "$description" --clone

  if [[ "$DRY_RUN" == true ]]; then
    step "Dry run: would rename placeholders, apply $release_tool, retarget Octo STS policies, verify, push, create staging, apply rulesets and wait for the Octo STS app install in ./$repo"
    return 0
  fi
  cd "$repo"

  step "Rename placeholders"
  personalize "$owner" "$repo" "$description"
  git rm -q --ignore-unmatch install-template.sh
  use_release_tool "$release_tool"
  retarget_policies "$owner" "$repo"

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
    # The locked rulesets wait for the Octo STS pause: their only bypass actor is the app, so until it is
    # installed they would lock main and tags with nothing allowed to promote or release.
    for file in .github/rulesets/*.json; do
      [[ -e "$file" && " ${LOCKED_RULESETS[*]} " != *" $(basename "$file") "* ]] || continue
      apply_ruleset "$slug" "$file"
    done
    restrict_release_environment "$slug"
  fi

  # Only repositories that carry trust policies use Octo STS.
  if [[ -d .github/chainguard && "$octo_confirmed" != true ]]; then
    step "Install the Octo STS app"
    wait_for_octo_sts "$slug"
  fi

  if [[ "$rulesets" == true ]]; then
    step "Lock main and tags to the Octo STS app"
    for name in "${LOCKED_RULESETS[@]}"; do
      [[ -e ".github/rulesets/$name" ]] && apply_ruleset "$slug" ".github/rulesets/$name"
    done
  fi

  step "Done"
  cat <<NEXT
Next steps in ./$repo:
  - Replace the sample "greet" action (action.yml, src/, test/) and rewrite README.md and AGENTS.md.
  - Enable the repository on Codecov, then set fail_ci_if_error: true in .github/workflows/ci.yml.
  - Open pull requests against staging; main is updated by promotion.
  - Enable releases with: gh variable set RELEASES_ENABLED --body true --repo $slug
  - main now moves only by promotion: gh workflow run promote.yml --ref staging
NEXT
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi

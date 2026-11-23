/**
 * Pull request titles become the squash-commit subject, so they follow Conventional Commits. Dependabot
 * titles start the subject with a capital ("build(deps-dev): Bump x from 1 to 2", "build(deps): Bump the npm
 * group with 3 updates"), which `subject-case` rejects and Dependabot cannot change. Exactly those forms are
 * skipped; every other title stays strict.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  ignores: [(message) => /^build\(deps(-dev)?\): Bump (\S+ from \S+ to \S+|the \S+ group\b)/.test(message)],
};

/**
 * semantic-release config. Branches run least to most stable. A release creates a tag and a GitHub
 * Release and commits nothing: main only moves by promotion, and the committed dist/ is what ships.
 */
export default {
  branches: [{ name: "staging", channel: "next", prerelease: "rc" }, "main"],
  plugins: [
    // The Conventional Commits preset reads the `!` in `feat!:` as breaking; the default Angular preset does not.
    ["@semantic-release/commit-analyzer", { preset: "conventionalcommits" }],
    ["@semantic-release/release-notes-generator", { preset: "conventionalcommits" }],
    // No comments or labels: the tag token only has contents: write.
    ["@semantic-release/github", { successComment: false, failComment: false, releasedLabels: false }],
  ],
};

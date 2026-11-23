/**
 * semantic-release config. Branches run least to most stable. A release creates a tag and a GitHub
 * Release and commits nothing: main only moves by promotion, and the committed dist/ is what ships.
 */
export default {
  branches: [{ name: "staging", channel: "next", prerelease: "rc" }, "main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    // No comments or labels: the tag token only has contents: write.
    ["@semantic-release/github", { successComment: false, failComment: false, releasedLabels: false }],
  ],
};

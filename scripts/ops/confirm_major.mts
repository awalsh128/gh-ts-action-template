import { execFileSync } from "node:child_process";

/** What promotion should do about the release it is about to start. */
export type MajorDecision =
  | { readonly kind: "nothing-new"; readonly reason: string }
  | { readonly kind: "release"; readonly next: string }
  | { readonly kind: "needs-confirmation"; readonly next: string };

/** Compares two `x.y.z` versions. */
function compare(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Decides whether a promotion needs the version typed in. A major release strands users of the
 * previous major (there is no maintenance branch), and the first official release counts as one.
 *
 * @param official - Latest official tag on main, such as `v1.2.0`, or undefined when none.
 * @param candidate - Latest release candidate tag on staging, such as `v1.3.0-rc.2`, or undefined.
 * @param confirm - The `confirm-major` input.
 * @returns What to do, and the version being released.
 */
export function decideMajor(
  official: string | undefined,
  candidate: string | undefined,
  confirm: string,
): MajorDecision {
  if (candidate === undefined) {
    return { kind: "nothing-new", reason: "staging has no candidate" };
  }
  const next = candidate.replace(/^v/, "").split("-")[0] ?? "";
  const current = official?.replace(/^v/, "");
  if (current !== undefined && compare(next, current) <= 0) {
    return { kind: "nothing-new", reason: `${official} is already out` };
  }
  const isMajor = current === undefined || Number(next.split(".")[0]) > Number(current.split(".")[0]);
  return isMajor && confirm !== next ? { kind: "needs-confirmation", next } : { kind: "release", next };
}

/** Latest tag reachable from `ref` that matches `pattern`, or undefined. */
function latestTag(ref: string, pattern: RegExp): string | undefined {
  const tags = execFileSync("git", ["tag", "--merged", ref, "--list", "v[0-9]*"], { encoding: "utf8" })
    .split("\n")
    .filter((tag) => pattern.test(tag));
  return tags.sort((a, b) => compare(a.slice(1).split("-")[0] ?? "", b.slice(1).split("-")[0] ?? "")).at(-1);
}

if (import.meta.main) {
  const stagingSha = process.env["STAGING_SHA"] ?? "";
  const decision = decideMajor(
    latestTag("origin/main", /^v\d+\.\d+\.\d+$/),
    latestTag(stagingSha, /^v\d+\.\d+\.\d+-rc\.\d+$/),
    process.env["CONFIRM"] ?? "",
  );
  if (decision.kind === "nothing-new") {
    console.log(`Nothing new to release: ${decision.reason}. main still fast-forwards.`);
  } else if (decision.kind === "needs-confirmation") {
    console.error(
      `::error::${decision.next} is a major release. Run Promote again with confirm-major set to ${decision.next}.`,
    );
    process.exit(1);
  } else {
    console.log(`Promotion releases ${decision.next}.`);
  }
}

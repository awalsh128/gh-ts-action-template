import { describe, expect, it } from "vitest";
import { decideMajor } from "../scripts/ops/confirm_major.mts";

describe("decideMajor", () => {
  it("has nothing to release without a candidate", () => {
    expect(decideMajor("v1.0.0", undefined, "").kind).toBe("nothing-new");
  });

  it("has nothing new when the candidate is already released", () => {
    expect(decideMajor("v1.2.0", "v1.2.0-rc.3", "").kind).toBe("nothing-new");
  });

  it("releases a minor without confirmation", () => {
    expect(decideMajor("v1.2.0", "v1.3.0-rc.1", "")).toEqual({ kind: "release", next: "1.3.0" });
  });

  it("requires the typed version for a new major", () => {
    expect(decideMajor("v1.2.0", "v2.0.0-rc.1", "")).toEqual({ kind: "needs-confirmation", next: "2.0.0" });
  });

  it("releases a major when the typed version matches", () => {
    expect(decideMajor("v1.2.0", "v2.0.0-rc.1", "2.0.0")).toEqual({ kind: "release", next: "2.0.0" });
  });

  it("treats the first official release as a major", () => {
    expect(decideMajor(undefined, "v1.0.0-rc.1", "").kind).toBe("needs-confirmation");
    expect(decideMajor(undefined, "v1.0.0-rc.1", "1.0.0").kind).toBe("release");
  });
});

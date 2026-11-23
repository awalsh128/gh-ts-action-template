import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import type { ActionInputs } from "../src/action.js";
import { artifactName, IO_REPORT_FILE, shouldUpload, uploadIoReport } from "../src/instrumentation.js";

const env = {
  GITHUB_RUN_ID: "12",
  GITHUB_RUN_ATTEMPT: "2",
  GITHUB_JOB: "build/test",
  GITHUB_ACTION: "__run_1",
};
const inputs: ActionInputs = { name: "Ada", style: "friendly", shout: false, uploadIo: "always" };

describe("artifactName", () => {
  it("is unique per run, attempt, job and step, with unsafe characters replaced", () => {
    expect(artifactName(env)).toBe("action-io-12-2-build_test-__run_1");
  });

  it("throws when a runner variable is missing", () => {
    expect(() => artifactName({ ...env, GITHUB_JOB: undefined })).toThrow("GITHUB_JOB is not set");
  });
});

describe("uploadIoReport", () => {
  it("uploads a JSON file holding inputs and outputs", async () => {
    let uploaded = "";
    const uploader = {
      uploadArtifact: vi.fn(async (_name: string, files: string[]) => {
        uploaded = await readFile(files[0] as string, "utf8");
      }),
    };
    const logger = { info: vi.fn(), warn: vi.fn() };

    await uploadIoReport({ inputs, outputs: { greeting: "Hey Ada!" } }, uploader, env, logger);

    expect(uploader.uploadArtifact).toHaveBeenCalledWith(
      "action-io-12-2-build_test-__run_1",
      [expect.stringContaining(IO_REPORT_FILE)],
      expect.any(String),
    );
    expect(JSON.parse(uploaded)).toEqual({ inputs, outputs: { greeting: "Hey Ada!" } });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("records the error of a failed run", async () => {
    let uploaded = "";
    const uploader = {
      uploadArtifact: async (_n: string, files: string[]) => {
        uploaded = await readFile(files[0] as string, "utf8");
      },
    };
    await uploadIoReport({ inputs, error: "boom" }, uploader, env, { info: vi.fn(), warn: vi.fn() });
    expect(JSON.parse(uploaded)).toEqual({ inputs, error: "boom" });
  });

  it("warns instead of throwing when the upload fails", async () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    const uploader = { uploadArtifact: vi.fn().mockRejectedValue(new Error("quota")) };

    await expect(uploadIoReport({ inputs }, uploader, env, logger)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith("Could not upload inputs and outputs: quota");
  });

  it("warns when the artifact name cannot be built", async () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    await uploadIoReport({ inputs }, { uploadArtifact: vi.fn() }, {}, logger);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("GITHUB_RUN_ID is not set"));
  });
});

describe("shouldUpload", () => {
  it.each([
    ["never", false, false],
    ["never", true, false],
    ["failure", false, false],
    ["failure", true, true],
    ["always", false, true],
    ["always", true, true],
  ] as const)("mode %s, failed %s -> %s", (mode, failed, expected) => {
    expect(shouldUpload(mode, failed)).toBe(expected);
  });
});

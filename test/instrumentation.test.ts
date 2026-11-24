import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import type { ActionInputs, ActionOutputs } from "../src/action.js";
import {
  artifactName,
  IO_REPORT_FILE,
  OUTPUTS_FILE,
  shouldUpload,
  uploadIoReport,
  uploadOutputsJson,
} from "../src/instrumentation.js";

const env = {
  GITHUB_RUN_ID: "12",
  GITHUB_RUN_ATTEMPT: "2",
  GITHUB_JOB: "build/test",
  GITHUB_ACTION: "__run_1",
};
const inputs: ActionInputs = {
  name: "Ada",
  style: "friendly",
  shout: false,
  uploadIo: "always",
  outputJson: false,
};
const outputs: ActionOutputs = {
  greeting: "Hey Ada!",
  details: {
    text: "Hey Ada!",
    style: "friendly",
    shout: false,
    words: ["Hey", "Ada!"],
    stats: { characters: 8, words: 2 },
  },
};

describe("artifactName", () => {
  it("is unique per run, attempt, job and step, with unsafe characters replaced", () => {
    expect(artifactName(env)).toBe("action-io-12-2-build_test-__run_1");
  });

  it("starts with the given prefix", () => {
    expect(artifactName(env, "action-outputs")).toBe("action-outputs-12-2-build_test-__run_1");
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

    await uploadIoReport({ inputs, outputs }, uploader, env, logger);

    expect(uploader.uploadArtifact).toHaveBeenCalledWith(
      "action-io-12-2-build_test-__run_1",
      [expect.stringContaining(IO_REPORT_FILE)],
      expect.any(String),
    );
    expect(JSON.parse(uploaded)).toEqual({ inputs, outputs });
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

describe("uploadOutputsJson", () => {
  it("uploads outputs.json with the object output nested, and no inputs", async () => {
    let uploaded = "";
    const uploader = {
      uploadArtifact: vi.fn(async (_name: string, files: string[]) => {
        uploaded = await readFile(files[0] as string, "utf8");
      }),
    };
    const logger = { info: vi.fn(), warn: vi.fn() };

    await uploadOutputsJson(outputs, uploader, env, logger);

    expect(uploader.uploadArtifact).toHaveBeenCalledWith(
      "action-outputs-12-2-build_test-__run_1",
      [expect.stringContaining(OUTPUTS_FILE)],
      expect.any(String),
    );
    expect(JSON.parse(uploaded)).toEqual(outputs);
    expect(logger.info).toHaveBeenCalledWith(
      "Uploaded outputs as artifact action-outputs-12-2-build_test-__run_1.",
    );
  });

  it("warns instead of throwing when the upload fails", async () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    const uploader = { uploadArtifact: vi.fn().mockRejectedValue(new Error("quota")) };

    await expect(uploadOutputsJson(outputs, uploader, env, logger)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith("Could not upload outputs: quota");
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

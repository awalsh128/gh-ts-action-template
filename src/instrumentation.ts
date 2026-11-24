import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ActionInputs, ActionOutputs, Logger, UploadMode } from "./action.js";

/** What one run received and produced. `outputs` is absent when the run failed. */
export interface IoReport {
  readonly inputs: ActionInputs;
  readonly outputs?: ActionOutputs;
  readonly error?: string;
}

/** The slice of `@actions/artifact`'s client this module uses, so tests can fake it. */
export interface ArtifactUploader {
  uploadArtifact(name: string, files: string[], rootDirectory: string): Promise<unknown>;
}

/**
 * Decides whether to upload the report.
 *
 * @param mode - The `upload_io` input.
 * @param failed - Whether the run failed.
 * @returns True when the report should be uploaded.
 */
export function shouldUpload(mode: UploadMode, failed: boolean): boolean {
  return mode === "always" || (mode === "failure" && failed);
}

/** Name of the JSON file inside the artifact. */
export const IO_REPORT_FILE = "io.json";

/**
 * Builds an artifact name that is unique per run, attempt, job and step, so reruns and matrix jobs
 * don't collide.
 *
 * @param env - Environment variables of the runner.
 * @param prefix - What the artifact holds, so two artifacts of one step differ.
 * @returns The artifact name.
 * @throws Error when a runner variable is missing.
 */
export function artifactName(
  env: Readonly<Record<string, string | undefined>>,
  prefix = "action-io",
): string {
  const parts = ["GITHUB_RUN_ID", "GITHUB_RUN_ATTEMPT", "GITHUB_JOB", "GITHUB_ACTION"].map((key) => {
    const value = env[key];
    if (value === undefined || value === "") {
      throw new Error(`Cannot name the artifact: ${key} is not set.`);
    }
    return value;
  });
  // Artifact names forbid characters such as / and :.
  return `${prefix}-${parts.join("-")}`.replace(/[^A-Za-z0-9._-]/g, "_");
}

/** Name of the JSON file, inside the outputs artifact. */
export const OUTPUTS_FILE = "outputs.json";

/**
 * Uploads `payload` as one JSON file in an artifact. Never throws: a failed upload is a warning, because
 * diagnostics must not fail a run that otherwise worked.
 */
async function uploadJson(
  payload: unknown,
  target: { readonly prefix: string; readonly file: string; readonly what: string },
  uploader: ArtifactUploader,
  env: Readonly<Record<string, string | undefined>>,
  logger: Logger,
): Promise<void> {
  let dir: string | undefined;
  try {
    const name = artifactName(env, target.prefix);
    dir = await mkdtemp(join(tmpdir(), `${target.prefix}-`));
    const file = join(dir, target.file);
    await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`);
    await uploader.uploadArtifact(name, [file], dir);
    logger.info(`Uploaded ${target.what} as artifact ${name}.`);
  } catch (error) {
    logger.warn(`Could not upload ${target.what}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (dir !== undefined) {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

/**
 * Uploads the report as one JSON artifact.
 *
 * @param report - Inputs, outputs and error of the run.
 * @param uploader - Artifact client.
 * @param env - Environment variables of the runner.
 * @param logger - Where the outcome is reported.
 */
export async function uploadIoReport(
  report: IoReport,
  uploader: ArtifactUploader,
  env: Readonly<Record<string, string | undefined>>,
  logger: Logger,
): Promise<void> {
  await uploadJson(
    report,
    { prefix: "action-io", file: IO_REPORT_FILE, what: "inputs and outputs" },
    uploader,
    env,
    logger,
  );
}

/**
 * Uploads every output as one JSON artifact. Unlike {@link uploadIoReport} it holds no inputs, so it is
 * safe when an input is a secret. Values keep their types: an object output is a nested object here, not
 * the JSON string a workflow output carries.
 *
 * @param outputs - The outputs of a successful run.
 * @param uploader - Artifact client.
 * @param env - Environment variables of the runner.
 * @param logger - Where the outcome is reported.
 */
export async function uploadOutputsJson(
  outputs: ActionOutputs,
  uploader: ArtifactUploader,
  env: Readonly<Record<string, string | undefined>>,
  logger: Logger,
): Promise<void> {
  await uploadJson(
    outputs,
    { prefix: "action-outputs", file: OUTPUTS_FILE, what: "outputs" },
    uploader,
    env,
    logger,
  );
}

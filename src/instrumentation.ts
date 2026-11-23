import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ActionInputs, ActionOutputs, Logger } from "./action.js";

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

/** Name of the JSON file inside the artifact. */
export const IO_REPORT_FILE = "io.json";

/**
 * Builds an artifact name that is unique per run, attempt, job and step, so reruns and matrix jobs
 * don't collide.
 *
 * @param env - Environment variables of the runner.
 * @returns The artifact name.
 * @throws Error when a runner variable is missing.
 */
export function artifactName(env: Readonly<Record<string, string | undefined>>): string {
  const parts = ["GITHUB_RUN_ID", "GITHUB_RUN_ATTEMPT", "GITHUB_JOB", "GITHUB_ACTION"].map((key) => {
    const value = env[key];
    if (value === undefined || value === "") {
      throw new Error(`Cannot name the artifact: ${key} is not set.`);
    }
    return value;
  });
  // Artifact names forbid characters such as / and :.
  return `action-io-${parts.join("-")}`.replace(/[^A-Za-z0-9._-]/g, "_");
}

/**
 * Uploads the report as one JSON artifact. Never throws: a failed upload is a warning, because
 * diagnostics must not fail a run that otherwise worked.
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
  let dir: string | undefined;
  try {
    const name = artifactName(env);
    dir = await mkdtemp(join(tmpdir(), "action-io-"));
    const file = join(dir, IO_REPORT_FILE);
    await writeFile(file, `${JSON.stringify(report, null, 2)}\n`);
    await uploader.uploadArtifact(name, [file], dir);
    logger.info(`Uploaded inputs and outputs as artifact ${name}.`);
  } catch (error) {
    logger.warn(
      `Could not upload inputs and outputs: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    if (dir !== undefined) {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

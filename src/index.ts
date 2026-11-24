import * as core from "@actions/core";
import { DefaultArtifactClient } from "@actions/artifact";
import { ActionsLogger } from "@awalsh128/winston-github-actions";
import { type ActionInputs, type ActionOutputs, parseStyle, parseUploadMode, runAction } from "./action.js";
import { shouldUpload, uploadIoReport, uploadOutputsJson } from "./instrumentation.js";

/** Reads and validates the action inputs. */
function getInputs(): ActionInputs {
  return {
    name: core.getInput("name", { required: true }),
    style: parseStyle(core.getInput("style")),
    shout: core.getBooleanInput("shout"),
    uploadIo: parseUploadMode(core.getInput("upload_io")),
    outputJson: core.getBooleanInput("output_json"),
  };
}

/** Entrypoint: read inputs, run, set outputs, upload diagnostics, fail on error. */
async function main(): Promise<void> {
  const logger = new ActionsLogger();
  let inputs: ActionInputs | undefined;
  let outputs: ActionOutputs | undefined;
  let error: string | undefined;
  try {
    inputs = getInputs();
    outputs = runAction(inputs, logger);
    core.setOutput("greeting", outputs.greeting);
    // A workflow output is a string, so an object travels as JSON (read it with fromJSON()).
    core.setOutput("details", JSON.stringify(outputs.details));
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    core.setFailed(error);
  } finally {
    // Only after a run that produced outputs; upload_io: failure covers a failed run.
    if (inputs?.outputJson && outputs) {
      await uploadOutputsJson(outputs, new DefaultArtifactClient(), process.env, logger);
    }
    // Also on failure, so the inputs that caused it are on hand. Skipped when the inputs didn't parse.
    if (inputs && shouldUpload(inputs.uploadIo, error !== undefined)) {
      await uploadIoReport({ inputs, outputs, error }, new DefaultArtifactClient(), process.env, logger);
    }
  }
}

await main();

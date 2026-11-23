import * as core from "@actions/core";
import { DefaultArtifactClient } from "@actions/artifact";
import { ActionsLogger } from "@awalsh128/winston-github-actions";
import { type ActionInputs, type ActionOutputs, parseStyle, parseUploadMode, runAction } from "./action.js";
import { shouldUpload, uploadIoReport } from "./instrumentation.js";

/** Reads and validates the action inputs. */
function getInputs(): ActionInputs {
  return {
    name: core.getInput("name", { required: true }),
    style: parseStyle(core.getInput("style")),
    shout: core.getBooleanInput("shout"),
    uploadIo: parseUploadMode(core.getInput("upload_io")),
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
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    core.setFailed(error);
  } finally {
    // Also on failure, so the inputs that caused it are on hand. Skipped when the inputs didn't parse.
    if (inputs && shouldUpload(inputs.uploadIo, error !== undefined)) {
      await uploadIoReport({ inputs, outputs, error }, new DefaultArtifactClient(), process.env, logger);
    }
  }
}

await main();

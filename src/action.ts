/** Supported greeting styles. */
export const GREETING_STYLES = ["friendly", "formal"] as const;

/** One of {@link GREETING_STYLES}. */
export type GreetingStyle = (typeof GREETING_STYLES)[number];

/** When to upload the inputs and outputs as an artifact. */
export const UPLOAD_MODES = ["never", "failure", "always"] as const;

/** One of {@link UPLOAD_MODES}. */
export type UploadMode = (typeof UPLOAD_MODES)[number];

/** Validated inputs of the action. Field names are camelCase versions of the `action.yml` inputs. */
export interface ActionInputs {
  readonly name: string;
  readonly style: GreetingStyle;
  readonly shout: boolean;
  readonly uploadIo: UploadMode;
  readonly outputJson: boolean;
}

/** A complex output: nested objects and arrays, to show how they travel as JSON. */
export interface GreetingDetails {
  readonly text: string;
  readonly style: GreetingStyle;
  readonly shout: boolean;
  readonly words: readonly string[];
  readonly stats: {
    readonly characters: number;
    readonly words: number;
  };
}

/** Outputs of the action. Field names are camelCase versions of the kebab-case `action.yml` outputs. */
export interface ActionOutputs {
  readonly greeting: string;
  /** An object, which a workflow output can only carry as a JSON string (see `index.ts`). */
  readonly details: GreetingDetails;
}

/** Logging seam so tests can capture messages without `@actions/core`. */
export interface Logger {
  info(message: string): void;
  warn(message: string): void;
}

/**
 * Parses an enum-like input string.
 *
 * @param value - Raw input value.
 * @returns The value as a {@link GreetingStyle}.
 * @throws Error when the value is not a supported style.
 */
export function parseStyle(value: string): GreetingStyle {
  const style = GREETING_STYLES.find((s) => s === value);
  if (style === undefined) {
    throw new Error(`Invalid style "${value}". Expected one of: ${GREETING_STYLES.join(", ")}.`);
  }
  return style;
}

/**
 * Parses the `upload_io` input.
 *
 * @param value - Raw input value.
 * @returns The value as an {@link UploadMode}.
 * @throws Error when the value is not a supported mode.
 */
export function parseUploadMode(value: string): UploadMode {
  const mode = UPLOAD_MODES.find((m) => m === value);
  if (mode === undefined) {
    throw new Error(`Invalid upload_io "${value}". Expected one of: ${UPLOAD_MODES.join(", ")}.`);
  }
  return mode;
}

/** Domain logic of the action. Dependencies come in through the constructor. */
export class ActionRunner {
  constructor(private readonly logger: Logger) {}

  /**
   * Builds the greeting.
   *
   * @param inputs - Validated inputs.
   * @returns The action outputs.
   * @throws Error when the name is blank.
   */
  run(inputs: ActionInputs): ActionOutputs {
    const name = inputs.name.trim();
    if (name === "") {
      throw new Error("Input name must not be blank.");
    }
    const text = inputs.style === "formal" ? `Good day, ${name}.` : `Hey ${name}!`;
    const greeting = inputs.shout ? text.toUpperCase() : text;
    this.logger.info(`Generated greeting: ${greeting}`);
    const words = greeting.split(/\s+/);
    const details: GreetingDetails = {
      text: greeting,
      style: inputs.style,
      shout: inputs.shout,
      words,
      stats: { characters: greeting.length, words: words.length },
    };
    return { greeting, details };
  }
}

/**
 * Runs the action. This is the testable core; it never reads `process.env` or `@actions/core`.
 *
 * @param inputs - Validated inputs.
 * @param logger - Where progress messages go.
 * @returns The action outputs.
 * @throws Error when the inputs are invalid.
 */
export function runAction(inputs: ActionInputs, logger: Logger): ActionOutputs {
  return new ActionRunner(logger).run(inputs);
}

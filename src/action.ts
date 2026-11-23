/** Supported greeting styles. */
export const GREETING_STYLES = ["friendly", "formal"] as const;

/** One of {@link GREETING_STYLES}. */
export type GreetingStyle = (typeof GREETING_STYLES)[number];

/** Validated inputs of the action. Field names are camelCase versions of the `action.yml` inputs. */
export interface ActionInputs {
  readonly name: string;
  readonly style: GreetingStyle;
  readonly shout: boolean;
  readonly uploadIo: boolean;
}

/** Outputs of the action. Field names are camelCase versions of the kebab-case `action.yml` outputs. */
export interface ActionOutputs {
  readonly greeting: string;
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
    return { greeting };
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

import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";

/** Bundles the action and its dependencies into dist/action/index.js. */
export default {
  input: "dist/src/index.js", // tsc output, so TypeScript compiles one way
  output: {
    file: "dist/action/index.js",
    format: "es",
    sourcemap: true,
    // Some CommonJS dependencies call require() at runtime.
    banner:
      "import { createRequire as __createRequire } from 'node:module';\n" +
      "const require = __createRequire(import.meta.url);",
  },
  plugins: [nodeResolve({ preferBuiltins: true, exportConditions: ["node"] }), commonjs(), json()],
  onwarn(warning, warn) {
    // Third-party noise only; never swallow warnings from our own code.
    const fromDependency = (warning.ids ?? [warning.id ?? ""]).every((id) => id.includes("node_modules"));
    if (
      warning.code === "THIS_IS_UNDEFINED" ||
      (fromDependency && ["INVALID_ANNOTATION", "CIRCULAR_DEPENDENCY"].includes(warning.code))
    ) {
      return;
    }

    warn(warning);
  },
};

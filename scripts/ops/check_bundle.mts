import { existsSync } from "node:fs";

/** Fails when the action bundle that `action.yml` points at is missing. */
const bundle = "dist/action/index.js";
if (!existsSync(bundle)) {
  console.error(`Missing ${bundle}. Run "npm run build" first.`);
  process.exit(1);
}
console.log(`${bundle} exists.`);

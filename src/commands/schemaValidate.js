import fs from "fs";
import path from "path";
import { fail } from "../utils/error.js";
import { validateVar } from "../utils/schemaValidator.js";
import { logger } from "../utils/logger.js";

const SCHEMA_FILE = "envspec.json";

export function schemaValidateCommand() {
  try {
    const cwd = process.cwd();
    const schemaPath = path.join(cwd, SCHEMA_FILE);

    if (!fs.existsSync(schemaPath)) {
      console.error("[Error]: envspec.json not found");
      process.exit(1);
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    let errors = [];

    // ---------- top level ----------
    if (typeof schema.$schemaVersion !== "number") {
      errors.push("$schemaVersion must be a number");
    }

    if (
      !schema.vars ||
      typeof schema.vars !== "object" ||
      Array.isArray(schema.vars)
    ) {
      errors.push("vars must be an object");
    }

    if (!errors.length) {
      for (const [key, spec] of Object.entries(schema.vars)) {
        const varErrors = validateVar(key, spec);
        errors = [...errors, ...varErrors];
      }
    }

    // ---------- report ----------
    if (errors.length) {
      logger.error("\n✖  Schema validation failed:\n");
      errors.forEach((e) => console.error(`  • ${e}`));
      process.exit(1);
    }

    logger.success("✔  envspec schema is valid");
  } catch (err) {
    fail("Failed to validate schema", err);
  }
}

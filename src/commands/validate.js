import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import {
  detectEnvValueType,
  isEnumValid,
  isValidType,
} from "../utils/helper.js";
import { fail } from "../utils/error.js";
import { logger } from "../utils/logger.js";

const SCHEMA_FILE = "envspec.json";

export function validateCommand(options) {
  try {
    const cwd = process.cwd();
    const schemaPath = path.join(cwd, SCHEMA_FILE);
    const envPath = path.join(cwd, options.file || ".env");

    if (!fs.existsSync(schemaPath)) {
      logger.error("[Error]: envspec.json not found");
      process.exit(1);
    }

    if (!fs.existsSync(envPath)) {
      logger.error(`[Error]: ${path.basename(envPath)} not found`);
      process.exit(1);
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

    if (
      !schema?.vars ||
      typeof schema.vars !== "object" ||
      Array.isArray(schema.vars)
    ) {
      fail("Invalid envspec.json structure", new Error("Schema malformed"));
    }

    const parsed = dotenv.config({ path: envPath }).parsed;

    if (!parsed) {
      fail("Failed to parse .env file", new Error("dotenv failed"));
    }

    const schemaVars = schema.vars;
    const envKeys = Object.keys(parsed);

    const errors = [];
    const warnings = [];

    // ---- validate schema-defined vars ----
    for (const [key, spec] of Object.entries(schemaVars)) {
      const value = parsed[key];

      // --- missing ---
      if (value == null || value === "") {
        if (spec.required) {
          errors.push(`Missing required variable: ${key}`);
        } else {
          warnings.push(`Missing optional variable: ${key}`);
        }
        continue;
      }

      // --- type check ---
      if (!isValidType(value, spec.type)) {
        const actualType = detectEnvValueType(value);
        errors.push(
          `Invalid type for key: ${key} (expected "${spec.type}", got "${actualType}")`
        );
        continue; // don't enum-check invalid types
      }

      // --- array itemType check ---
      if (spec.type === "array" && spec.itemType) {
        let items = [];
        
        // Parse JSON array or CSV
        if (value.trim().startsWith("[") && value.trim().endsWith("]")) {
          try {
            items = JSON.parse(value);
          } catch {
            errors.push(`Invalid JSON array format for ${key}`);
            continue;
          }
        } else {
          const delimiter = spec.delimiter || ",";
          items = value.split(delimiter).map((v) => v.trim());
        }

        items.forEach((item, index) => {
          if (!isValidType(item, spec.itemType)) {
            const actualType = detectEnvValueType(item);
            errors.push(
              `Invalid item type in ${key}[${index}] (expected "${spec.itemType}", got "${actualType}")`
            );
          }
        });

        // stop further checks if array items are invalid
        if (errors.length) continue;
      }

      // --- enum check (optional) ---
      if (spec.enum && !isEnumValid(value, spec.enum)) {
        errors.push(
          `Invalid value for ${key} (must be one of: ${spec.enum.join(", ")})`
        );
      }
    }

    // ---- detect unknown env vars ----
    for (const key of envKeys) {
      if (!schemaVars[key]) {
        warnings.push(
          `Unknown variable in .env: ${key} of type "${detectEnvValueType(
            parsed[key]
          )}"`
        );
      }
    }

    // ---- report ----

    if (errors.length) {
      logger.error("\n✖ Validation failed:\n");
      errors.forEach((e) => console.log(`  • ${e}`));
    }

    if (warnings.length) {
      logger.warn("\n⚠ Warnings:\n");
      warnings.forEach((w) => console.log(`  • ${w}`));
    }

    if (!errors.length && !warnings.length) {
      logger.success("✔ Environment variables are valid");
    }

    console.log("");

    if (errors.length) process.exit(1);
  } catch (err) {
    fail("Validation failed", err);
  }
}

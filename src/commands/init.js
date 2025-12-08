import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { generateStringExample, isSafeNumber } from "../utils/helper.js";
import { fail } from "../utils/error.js";

const SCHEMA_FILE = "envspec.json";

export function initCommand(options) {
  try {
    const cwd = process.cwd();
    const schemaPath = path.join(cwd, SCHEMA_FILE);

    if (fs.existsSync(schemaPath)) {
      console.error("[Error]: envspec.json already exists");
      return;
    }

    let schema = {
      $schemaVersion: 1,
      vars: {},
    };

    const markRequired = options.allRequired === true;

    if (options.fromEnv) {
      const envPath = path.join(cwd, ".env");

      if (!fs.existsSync(envPath)) {
        console.error("[Error]: .env file not found");
        return;
      }

      const parsed = dotenv.config({ path: envPath }).parsed;

      if (!parsed) {
        console.error("[Error]: Failed to read .env file");
        return;
      }

      for (const [key, value] of Object.entries(parsed)) {
        // console.log("value:", value, typeof value)
        if (value == null || value == undefined || value === "") {
          console.log(`[Error]: Invalid value found in .env: ${key}`);
          return;
        }
        schema.vars[key] = inferSchema(key, value, markRequired);
      }
    }

    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    console.log("✔ envspec initialized");
  } catch (err) {
    fail("Failed to initialize envspec.json to the project", err);
  }
}

function inferSchema(key, rawValue, required = false) {
  const base = { required };
  const value = String(rawValue).trim();

  // ---------- boolean ----------
  if (/^(true|false)$/i.test(value)) {
    return {
      ...base,
      type: "boolean",
      example: value.toLowerCase() === "true",
    };
  }

  // ---------- number (safe only) ----------
  if (isSafeNumber(value)) {
    return {
      ...base,
      type: "number",
      example: Number(value),
    };
  }

  // ---------- string (default) ----------
  return {
    ...base,
    type: "string",
    example: generateStringExample(key),
    // secret is NOT inferred automatically (user decides)
  };
}

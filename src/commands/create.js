import fs from "fs";
import path from "path";
import { generateStringExample, isValidType } from "../utils/helper.js";
import { confirm } from "../utils/prompts.js";
import { readEnvSafe, writeEnvFile } from "../utils/readWriteEnv.js";

const SCHEMA_FILE = "envspec.json";

/**
 * envspec create
 */
export async function createCommand(options) {
  const cwd = process.cwd();
  const schemaPath = path.join(cwd, SCHEMA_FILE);
  const envPath = path.join(cwd, options.output || ".env");

  if (!fs.existsSync(schemaPath)) {
    console.error("[Error]: envspec.json not found. Run `envspec init` first.");
    return;
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

  if (!schema?.vars || typeof schema.vars !== "object" || Array.isArray(schema.vars)) {
    console.error("[Error]: Invalid schema structure");
    return;
  }

  const existingEnv = readEnvSafe(envPath);
  const schemaVars = schema.vars;

  // overwrite handling (DANGEROUS)
  if (existingEnv && options.overwrite && !options.force) {
    const ok = await confirm(
      "⚠ This will overwrite your existing .env file.\nA backup will be created.\nContinue?"
    );
    if (!ok) {
      console.log("Aborted.");
      return;
    }
  }

  if (existingEnv && options.overwrite) {
    backupFile(envPath);
  }

  const { result, changes } = mergeEnv({
    schemaVars,
    existingEnv: options.overwrite ? null : existingEnv,
    useExample: options.example,
  });

  printSummary(changes, !!existingEnv);

  if (options.dryRun) {
    console.log("\n--dry-run enabled. No file written.");
    return;
  }

  writeEnvFile(envPath, result);

  console.log("✔ .env generated safely");
}

function mergeEnv({ schemaVars, existingEnv, useExample }) {
  const output = {};
  const changes = {
    preserved: [],
    added: [],
    invalid: [],
  };

  for (const [key, spec] of Object.entries(schemaVars)) {
    const hasExisting = existingEnv?.[key] != null;

    if (hasExisting) {
      output[key] = existingEnv[key];
      changes.preserved.push(key);
    } else {
      output[key] = useExample
        ? String(spec.example ?? "")
        : `<${generateStringExample(key, spec.type)}>`;
      changes.added.push(key);
    }

    if (hasExisting && !isValidType(existingEnv[key], spec.type)) {
      changes.invalid.push(key);
    }
  }

  return { result: output, changes };
}

function backupFile(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  const backupPath = `${filePath}.${timestamp}.backup`;
  fs.copyFileSync(filePath, backupPath);

  console.log(`✔ Backup created → ${path.basename(backupPath)}`);
}

function printSummary({ preserved, added, invalid }, hadExisting) {
  console.log("");

  if (hadExisting) {
    if (preserved.length)
      console.log(`✔ Preserved ${preserved.length} existing values`);
  }

  if (added.length) console.log(`➕ Added ${added.length} missing variables`);

  if (invalid.length)
    console.log(`⚠ ${invalid.length} variables have invalid types`);
}

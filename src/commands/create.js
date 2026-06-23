import fs from "fs";
import path from "path";
import { generateStringExample, isValidType } from "../utils/helper.js";
import { confirm } from "../utils/prompts.js";
import { readEnvSafe, writeEnvFile } from "../utils/readWriteEnv.js";
import { fail } from "../utils/error.js";
import { logger } from "../utils/logger.js";

const SCHEMA_FILE = "envspec.json";

/**
 * Creates a .env file from the envspec.json schema with smart merging and backup capabilities
 * @param {Object} options - Command options
 * @param {string} [options.output] - Output file path
 * @param {string} [options.env] - Environment name (development, production, etc.)
 * @param {boolean} [options.example] - Whether to use example values from schema
 * @param {boolean} [options.overwrite] - Whether to allow overwriting existing files
 * @param {boolean} [options.force] - Whether to skip confirmation prompts
 * @param {boolean} [options.dryRun] - Whether to preview changes without writing
 */
export async function createCommand(options) {
  try {
    const cwd = process.cwd();
    const schemaPath = path.join(cwd, SCHEMA_FILE);
    
    // Determine output file based on environment or explicit output
    let envPath;
    if (options.output) {
      envPath = path.join(cwd, options.output);
    } else if (options.env) {
      envPath = path.join(cwd, `.env.${options.env}`);
    } else {
      envPath = path.join(cwd, ".env");
    }

    if (!fs.existsSync(schemaPath)) {
      logger.error(
        "[Error]: envspec.json not found. Run `envspec init` first."
      );
      return;
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

    if (
      !schema?.vars ||
      typeof schema.vars !== "object" ||
      Array.isArray(schema.vars)
    ) {
      logger.error("[Error]: Invalid schema structure");
      return;
    }

    const existingEnv = readEnvSafe(envPath);
    const schemaVars = schema.vars;

    // overwrite handling (DANGEROUS)
    if (existingEnv && options.overwrite && !options.force) {
      const ok = await confirm(
        "⚠  This will overwrite your existing .env file.\nA backup will be created.\nContinue?"
      );
      if (!ok) {
        logger.log("Aborted.");
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
      logger.log("\n--dry-run enabled. No file written.");
      return;
    }

    writeEnvFile(envPath, result);

    logger.success("✔  .env generated safely");

    if (Object.values(schemaVars).some((v) => v.type === "object")) {
      logger.info("ℹ Object values are stored as JSON strings in .env");
    }
  } catch (err) {
    fail("Failed to create environment file", err);
  }
}

/**
 * Merges schema variables with existing environment variables
 * @param {Object} params - Merge parameters
 * @param {Object} params.schemaVars - Variables from the schema
 * @param {Object|null} params.existingEnv - Existing environment variables
 * @param {boolean} params.useExample - Whether to use example values
 * @returns {Object} Object containing merged result and change summary
 */
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
      output[key] = serializeValue(key, spec, useExample);
      changes.added.push(key);
    }

    if (hasExisting && !isValidType(existingEnv[key], spec.type)) {
      changes.invalid.push(key);
    }
  }

  return { result: output, changes };
}

/**
 * Creates a timestamped backup of a file
 * @param {string} filePath - Path to the file to backup
 */
function backupFile(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  const backupPath = `${filePath}.${timestamp}.backup`;
  fs.copyFileSync(filePath, backupPath);

  logger.success(`✔  Backup created → ${path.basename(backupPath)}`);
}

/**
 * Prints a summary of changes made during environment file generation
 * @param {Object} changes - Object containing arrays of preserved, added, and invalid variables
 * @param {Array<string>} changes.preserved - Variables that were preserved from existing file
 * @param {Array<string>} changes.added - Variables that were added from schema
 * @param {Array<string>} changes.invalid - Variables with invalid types
 * @param {boolean} hadExisting - Whether an existing file was present
 */
function printSummary({ preserved, added, invalid }, hadExisting) {
  logger.log("");

  if (hadExisting) {
    if (preserved.length)
      logger.success(`✔  Preserved ${preserved.length} existing values`);
  }

  if (added.length) logger.log(`➕ Added ${added.length} missing variables`);

  if (invalid.length)
    logger.warn(`⚠  ${invalid.length} variables have invalid types`);
}

/**
 * Serializes a value for writing to .env file based on the variable specification
 * @param {string} key - The environment variable name
 * @param {Object} spec - The variable specification from schema
 * @param {boolean} useExample - Whether to use example values or placeholders
 * @returns {string} The serialized value ready for .env file
 */
function serializeValue(key ,spec, useExample) {
  if (!useExample) {
    return `<${generateStringExample(key, spec.type)}>`;
  }

  if (spec.type === "object") {
    return JSON.stringify(spec.example ?? {}, null, 0);
  }

  if (spec.type === "array") {
    const arr = Array.isArray(spec.example) ? spec.example : [];
    return JSON.stringify(arr);
  }

  return String(spec.example ?? "");
}

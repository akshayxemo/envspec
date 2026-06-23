import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { detectEnvValueType, isValidType } from "../utils/helper.js";
import { fail } from "../utils/error.js";
import { logger } from "../utils/logger.js";

const SCHEMA_FILE = "envspec.json";

/**
 * Shows the current status of environment variables and schema
 * @param {Object} options - Command options
 * @param {string} [options.env] - Environment name to check
 */
export function statusCommand(options) {
  try {
    const cwd = process.cwd();
    const schemaPath = path.join(cwd, SCHEMA_FILE);

    if (!fs.existsSync(schemaPath)) {
      logger.error("❌ No envspec.json found");
      logger.info("   Run `envspec init` to get started");
      return;
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    
    if (!schema?.vars || typeof schema.vars !== "object") {
      logger.error("❌ Invalid schema structure");
      return;
    }

    logger.success("✅ envspec.json found");
    
    const schemaVars = schema.vars;
    const totalVars = Object.keys(schemaVars).length;
    const requiredVars = Object.values(schemaVars).filter(v => v.required).length;
    
    logger.log(`📊 Schema: ${totalVars} variables (${requiredVars} required)`);

    // Check different environment files
    const envFiles = [".env"];
    if (options.env) {
      envFiles.unshift(`.env.${options.env}`);
    } else {
      // Check for common env files
      const commonEnvs = [".env.local", ".env.development", ".env.production", ".env.staging"];
      for (const envFile of commonEnvs) {
        if (fs.existsSync(path.join(cwd, envFile))) {
          envFiles.push(envFile);
        }
      }
    }

    logger.log("\n📁 Environment Files:");
    
    for (const envFile of envFiles) {
      const envPath = path.join(cwd, envFile);
      
      if (!fs.existsSync(envPath)) {
        logger.warn(`   ⚠️  ${envFile} - Not found`);
        continue;
      }

      const parsed = dotenv.config({ path: envPath }).parsed;
      
      if (!parsed) {
        logger.error(`   ❌ ${envFile} - Failed to parse`);
        continue;
      }

      const { valid, invalid, missing, extra } = analyzeEnvFile(schemaVars, parsed);
      
      const status = invalid > 0 || missing > 0 ? "❌" : "✅";
      logger.log(`   ${status} ${envFile}`);
      
      if (valid > 0) logger.log(`      ✅ ${valid} valid`);
      if (missing > 0) logger.log(`      ❌ ${missing} missing`);
      if (invalid > 0) logger.log(`      ⚠️  ${invalid} invalid`);
      if (extra > 0) logger.log(`      ℹ️  ${extra} extra`);
    }

    // Overall status
    logger.log("\n🎯 Quick Actions:");
    
    if (!fs.existsSync(path.join(cwd, ".env"))) {
      logger.log("   • Run `envspec create` to generate .env file");
    }
    
    if (options.env && !fs.existsSync(path.join(cwd, `.env.${options.env}`))) {
      logger.log(`   • Run \`envspec create --env ${options.env}\` to generate .env.${options.env}`);
    }
    
    logger.log("   • Run `envspec validate` to check for issues");
    logger.log("   • Run `envspec git-protect` to secure your files");

  } catch (err) {
    fail("Failed to check status", err);
  }
}

/**
 * Analyzes an environment file against the schema
 * @param {Object} schemaVars - Variables from schema
 * @param {Object} envVars - Variables from .env file
 * @returns {Object} Analysis results
 */
function analyzeEnvFile(schemaVars, envVars) {
  let valid = 0;
  let invalid = 0;
  let missing = 0;
  let extra = 0;

  // Check schema variables
  for (const [key, spec] of Object.entries(schemaVars)) {
    const value = envVars[key];
    
    if (value == null || value === "") {
      missing++;
    } else if (isValidType(value, spec.type)) {
      valid++;
    } else {
      invalid++;
    }
  }

  // Check for extra variables
  for (const key of Object.keys(envVars)) {
    if (!schemaVars[key]) {
      extra++;
    }
  }

  return { valid, invalid, missing, extra };
}
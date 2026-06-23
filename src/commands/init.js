import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { generateStringExample, inferPrimitiveArrayType, isSafeNumber } from "../utils/helper.js";
import { fail } from "../utils/error.js";
import { logger } from "../utils/logger.js";
import { confirm, input, select } from "../utils/prompts.js";

const SCHEMA_FILE = "envspec.json";

/**
 * Initializes envspec in the current project by creating an envspec.json schema file
 * @param {Object} options - Command options
 * @param {boolean} [options.fromEnv] - Whether to generate schema from existing .env file
 * @param {boolean} [options.allRequired] - Whether to mark all inferred variables as required
 * @param {boolean} [options.interactive] - Whether to use interactive mode
 */
export async function initCommand(options) {
  try {
    const cwd = process.cwd();
    const schemaPath = path.join(cwd, SCHEMA_FILE);

    if (fs.existsSync(schemaPath)) {
      logger.error("[Error]: envspec.json already exists");
      return;
    }

    let schema = {
      $schemaVersion: 1,
      vars: {},
    };

    if (options.interactive) {
      schema = await interactiveInit();
    } else if (options.fromEnv) {
      const envPath = path.join(cwd, ".env");

      if (!fs.existsSync(envPath)) {
        logger.error("[Error]: .env file not found");
        return;
      }

      const parsed = dotenv.config({ path: envPath }).parsed;

      if (!parsed) {
        logger.error("[Error]: Failed to read .env file");
        return;
      }

      const markRequired = options.allRequired !== false;

      for (const [key, value] of Object.entries(parsed)) {
        if (value == null || value == undefined || value === "") {
          logger.log(`[Error]: Invalid value found in .env: ${key}`);
          return;
        }
        schema.vars[key] = inferSchema(key, value, markRequired);
      }

      if (options.interactive !== false) {
        const shouldReview = await confirm("Would you like to review and customize the inferred schema?");
        if (shouldReview) {
          schema = await reviewInferredSchema(schema);
        }
      }
    }

    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    logger.success("✔  envspec initialized");
  } catch (err) {
    fail("Failed to initialize envspec.json to the project", err);
  }
}

/**
 * Interactive schema initialization
 * @returns {Promise<Object>} The schema object
 */
async function interactiveInit() {
  logger.log("\n🚀 Welcome to envspec interactive setup!\n");
  
  const schema = {
    $schemaVersion: 1,
    vars: {},
  };

  logger.log("Let's define your environment variables one by one.");
  logger.log("Press Ctrl+C anytime to exit.\n");

  while (true) {
    const varName = await input("Environment variable name (or press Enter to finish)");
    
    if (!varName) {
      break;
    }

    if (!/^[A-Z_][A-Z0-9_]*$/i.test(varName)) {
      logger.warn("⚠  Variable names should contain only letters, numbers, and underscores");
      continue;
    }

    if (schema.vars[varName]) {
      logger.warn(`⚠  Variable ${varName} already exists`);
      continue;
    }

    const varSpec = await defineVariable(varName);
    schema.vars[varName] = varSpec;
    
    logger.success(`✔  Added ${varName}`);
  }

  if (Object.keys(schema.vars).length === 0) {
    logger.log("No variables defined. Creating empty schema.");
  }

  return schema;
}

/**
 * Interactive variable definition
 * @param {string} varName - The variable name
 * @returns {Promise<Object>} The variable specification
 */
async function defineVariable(varName) {
  const type = await select(
    `What type is ${varName}?`,
    ["string", "number", "boolean", "array", "object"],
    "string"
  );

  const required = await confirm(`Is ${varName} required?`);
  
  const desc = await input(
    `Description for ${varName}`,
    generateStringExample(varName)
  );

  const spec = {
    required,
    desc,
    type,
  };

  // Type-specific configuration
  if (type === "array") {
    const itemType = await select(
      "What type are the array items?",
      ["string", "number", "boolean"],
      "string"
    );
    
    const delimiter = await input("Array delimiter", ",");
    
    spec.itemType = itemType;
    spec.delimiter = delimiter;
  }

  if (type === "string") {
    const hasEnum = await confirm("Does this variable have specific allowed values (enum)?");
    if (hasEnum) {
      const enumValues = await input("Enter allowed values (comma-separated)");
      if (enumValues) {
        spec.enum = enumValues.split(",").map(v => v.trim()).filter(Boolean);
      }
    }
  }

  const hasExample = await confirm("Would you like to add an example value?");
  if (hasExample) {
    let example = await input("Example value");
    
    // Try to parse the example based on type
    if (example) {
      try {
        if (type === "number") {
          example = Number(example);
        } else if (type === "boolean") {
          example = example.toLowerCase() === "true";
        } else if (type === "array") {
          if (example.startsWith("[")) {
            example = JSON.parse(example);
          } else {
            example = example.split(spec.delimiter || ",").map(v => v.trim());
          }
        } else if (type === "object") {
          example = JSON.parse(example);
        }
        spec.example = example;
      } catch (err) {
        logger.warn("⚠  Invalid example format, using as string");
        spec.example = example;
      }
    }
  }

  return spec;
}

/**
 * Review and customize inferred schema
 * @param {Object} schema - The inferred schema
 * @returns {Promise<Object>} The customized schema
 */
async function reviewInferredSchema(schema) {
  logger.log("\n📋 Reviewing inferred schema...\n");
  
  for (const [varName, spec] of Object.entries(schema.vars)) {
    logger.log(`\n🔍 Variable: ${varName}`);
    logger.log(`   Type: ${spec.type}`);
    logger.log(`   Required: ${spec.required}`);
    logger.log(`   Description: ${spec.desc}`);
    
    if (spec.itemType) logger.log(`   Item Type: ${spec.itemType}`);
    if (spec.delimiter) logger.log(`   Delimiter: ${spec.delimiter}`);

    const shouldCustomize = await confirm(`Customize ${varName}?`);
    
    if (shouldCustomize) {
      schema.vars[varName] = await defineVariable(varName);
    }
  }

  const shouldAddMore = await confirm("Add more variables?");
  if (shouldAddMore) {
    while (true) {
      const varName = await input("Environment variable name (or press Enter to finish)");
      
      if (!varName) break;
      
      if (schema.vars[varName]) {
        logger.warn(`⚠  Variable ${varName} already exists`);
        continue;
      }

      const varSpec = await defineVariable(varName);
      schema.vars[varName] = varSpec;
      
      logger.success(`✔  Added ${varName}`);
    }
  }

  return schema;
}

/**
 * Infers the schema specification for a single environment variable
 * @param {string} key - The environment variable name
 * @param {string} rawValue - The raw value from the .env file
 * @param {boolean} [required=false] - Whether to mark the variable as required
 * @returns {Object} The inferred schema specification object
 */
function inferSchema(key, rawValue, required = false) {
  const base = { required ,
    desc: generateStringExample(key)
  };
  const value = String(rawValue).trim();

  // ---------- boolean ----------
  if (/^(true|false)$/i.test(value)) {
    return {
      ...base,
      type: "boolean",
      // example: value.toLowerCase() === "true",
    };
  }

  // ---------- number (safe only) ----------
  if (isSafeNumber(value)) {
    return {
      ...base,
      type: "number",
      // example: Number(value),
    };
  }

  // ---------- JSON (object / array) ----------
  if (
    (value.startsWith("{") && value.endsWith("}")) ||
    (value.startsWith("[") && value.endsWith("]"))
  ) {
    try {
      const parsed = JSON.parse(value);

      // ----- array -----
      if (Array.isArray(parsed)) {
        return {
          ...base,
          type: "array",
          itemType: inferPrimitiveArrayType(parsed),
          delimiter: ",",
          // example: parsed.slice(0, 3),
        };
      }

      // ----- object -----
      if (typeof parsed === "object" && parsed !== null) {
        return {
          ...base,
          type: "object",
          // example: parsed,
        };
      }
    } catch {
      // fall through → treat as string
    }
  }

  // ---------- CSV array (very conservative) ----------
  if (value.includes(",") && !value.includes(" ")) {
    const parts = value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    if (parts.length > 1) {
      return {
        ...base,
        type: "array",
        itemType: "string",
        delimiter: ",",
        // example: parts.slice(0, 3),
      };
    }
  }

  // ---------- string (default) ----------
  return {
    ...base,
    type: "string",
    // desc: generateStringExample(key),
    // example: generateStringExample(key),
    // secret is NOT inferred automatically (user decides)
  };
}

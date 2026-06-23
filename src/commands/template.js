import fs from "fs";
import path from "path";
import { fail } from "../utils/error.js";
import { logger } from "../utils/logger.js";
import { confirm } from "../utils/prompts.js";

const SCHEMA_FILE = "envspec.json";

/**
 * Built-in templates for common project types
 */
const TEMPLATES = {
  "node-api": {
    name: "Node.js API Server",
    description: "Common environment variables for a Node.js API server",
    vars: {
      NODE_ENV: {
        required: true,
        desc: "Application environment",
        type: "string",
        enum: ["development", "production", "test"],
        example: "development"
      },
      PORT: {
        required: true,
        desc: "HTTP server port",
        type: "number",
        example: 3000
      },
      DATABASE_URL: {
        required: true,
        desc: "Database connection string",
        type: "string",
        example: "postgresql://localhost:5432/myapp"
      },
      JWT_SECRET: {
        required: true,
        desc: "JWT signing secret",
        type: "string"
      },
      CORS_ORIGIN: {
        required: false,
        desc: "CORS allowed origins",
        type: "array",
        itemType: "string",
        delimiter: ",",
        example: ["http://localhost:3000"]
      },
      LOG_LEVEL: {
        required: false,
        desc: "Logging level",
        type: "string",
        enum: ["debug", "info", "warn", "error"],
        example: "info"
      }
    }
  },

  "react-app": {
    name: "React Application",
    description: "Environment variables for a React frontend application",
    vars: {
      REACT_APP_API_URL: {
        required: true,
        desc: "Backend API base URL",
        type: "string",
        example: "http://localhost:3001/api"
      },
      REACT_APP_ENV: {
        required: true,
        desc: "Application environment",
        type: "string",
        enum: ["development", "production", "staging"],
        example: "development"
      },
      REACT_APP_ANALYTICS_ID: {
        required: false,
        desc: "Google Analytics tracking ID",
        type: "string",
        example: "GA-XXXXXXXXX"
      },
      REACT_APP_SENTRY_DSN: {
        required: false,
        desc: "Sentry error tracking DSN",
        type: "string"
      },
      REACT_APP_FEATURE_FLAGS: {
        required: false,
        desc: "Enabled feature flags",
        type: "array",
        itemType: "string",
        delimiter: ",",
        example: ["new-ui", "beta-features"]
      }
    }
  },

  "nextjs": {
    name: "Next.js Application",
    description: "Environment variables for a Next.js application",
    vars: {
      NODE_ENV: {
        required: true,
        desc: "Node environment",
        type: "string",
        enum: ["development", "production", "test"],
        example: "development"
      },
      NEXTAUTH_URL: {
        required: true,
        desc: "NextAuth.js canonical URL",
        type: "string",
        example: "http://localhost:3000"
      },
      NEXTAUTH_SECRET: {
        required: true,
        desc: "NextAuth.js secret for JWT encryption",
        type: "string"
      },
      DATABASE_URL: {
        required: true,
        desc: "Database connection string",
        type: "string",
        example: "postgresql://localhost:5432/nextapp"
      },
      NEXT_PUBLIC_APP_URL: {
        required: true,
        desc: "Public app URL for client-side",
        type: "string",
        example: "http://localhost:3000"
      },
      NEXT_PUBLIC_ANALYTICS_ID: {
        required: false,
        desc: "Public analytics tracking ID",
        type: "string"
      }
    }
  },

  "docker": {
    name: "Docker Application",
    description: "Common environment variables for containerized applications",
    vars: {
      NODE_ENV: {
        required: true,
        desc: "Application environment",
        type: "string",
        enum: ["development", "production", "test"],
        example: "production"
      },
      PORT: {
        required: true,
        desc: "Application port",
        type: "number",
        example: 8080
      },
      HEALTH_CHECK_PATH: {
        required: false,
        desc: "Health check endpoint path",
        type: "string",
        example: "/health"
      },
      LOG_FORMAT: {
        required: false,
        desc: "Log output format",
        type: "string",
        enum: ["json", "text"],
        example: "json"
      },
      GRACEFUL_SHUTDOWN_TIMEOUT: {
        required: false,
        desc: "Graceful shutdown timeout in seconds",
        type: "number",
        example: 30
      }
    }
  },

  "database": {
    name: "Database Configuration",
    description: "Environment variables for database connections",
    vars: {
      DATABASE_URL: {
        required: true,
        desc: "Primary database connection string",
        type: "string",
        example: "postgresql://localhost:5432/myapp"
      },
      DB_HOST: {
        required: false,
        desc: "Database host",
        type: "string",
        example: "localhost"
      },
      DB_PORT: {
        required: false,
        desc: "Database port",
        type: "number",
        example: 5432
      },
      DB_NAME: {
        required: false,
        desc: "Database name",
        type: "string",
        example: "myapp"
      },
      DB_USER: {
        required: false,
        desc: "Database username",
        type: "string",
        example: "postgres"
      },
      DB_PASSWORD: {
        required: false,
        desc: "Database password",
        type: "string"
      },
      DB_SSL: {
        required: false,
        desc: "Enable SSL for database connection",
        type: "boolean",
        example: false
      },
      DB_POOL_SIZE: {
        required: false,
        desc: "Database connection pool size",
        type: "number",
        example: 10
      }
    }
  }
};

/**
 * Lists available templates or applies a specific template
 * @param {string} templateName - Name of the template to apply
 * @param {Object} options - Command options
 */
export async function templateCommand(templateName, options) {
  try {
    const cwd = process.cwd();
    const schemaPath = path.join(cwd, SCHEMA_FILE);

    if (!templateName) {
      // List available templates
      logger.log("📋 Available Templates:\n");
      
      for (const [key, template] of Object.entries(TEMPLATES)) {
        logger.log(`   ${key.padEnd(12)} - ${template.name}`);
        logger.log(`   ${' '.repeat(12)}   ${template.description}\n`);
      }
      
      logger.log("Usage: envspec template <template-name>");
      logger.log("Example: envspec template node-api");
      return;
    }

    const template = TEMPLATES[templateName];
    
    if (!template) {
      logger.error(`❌ Template '${templateName}' not found`);
      logger.log("\nAvailable templates:");
      Object.keys(TEMPLATES).forEach(name => {
        logger.log(`   • ${name}`);
      });
      return;
    }

    if (fs.existsSync(schemaPath)) {
      const shouldOverwrite = await confirm(
        `envspec.json already exists. Overwrite with ${template.name} template?`
      );
      
      if (!shouldOverwrite) {
        logger.log("Cancelled.");
        return;
      }
    }

    const schema = {
      $schemaVersion: 1,
      vars: template.vars
    };

    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    
    logger.success(`✅ Applied ${template.name} template`);
    logger.log(`📝 ${Object.keys(template.vars).length} variables defined`);
    logger.log("\nNext steps:");
    logger.log("   • Run `envspec create` to generate .env file");
    logger.log("   • Customize the schema as needed");
    logger.log("   • Run `envspec validate` to check your setup");

  } catch (err) {
    fail("Failed to apply template", err);
  }
}
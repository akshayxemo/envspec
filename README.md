# envspec

A schema-driven CLI tool for validating, generating, and protecting environment variables to prevent runtime bugs and configuration drift.

envspec is intentionally simple: schemas are explicit, values stay local, and failures happen early — not in production.

## Why envspec?

- **Type Safety**: Validate environment variables against a schema before runtime
- **Auto-Generation**: Generate `.env` files from schema with type hints
- **Git Protection**: Automatically protect sensitive env files from being committed
- **Schema Inference**: Create schemas from existing `.env` files
- **Team Collaboration**: Share schema definitions without exposing secrets
- **Security First**: Schema files contain NO actual values - only structure and types. Your secrets stay in `.env` files (which stay local). The schema is just a single source of truth for validation.

### What envspec is NOT

- ❌ It does not manage secrets or vaults
- ❌ It does not fetch env values remotely
- ❌ It does not replace dotenv

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [envspec init](#envspec-init)
  - [envspec create](#envspec-create)
  - [envspec validate](#envspec-validate)
  - [envspec git-protect](#envspec-git-protect)
  - [envspec schema:validate](#envspec-schemavalidate)
- [Schema Guide](#schema-guide)
  - [Understanding the Schema](#understanding-the-schema)
  - [Schema Structure](#schema-structure)
  - [Supported Types](#supported-types)
  - [Variable Properties](#variable-properties)
  - [Writing Your Schema](#writing-your-schema)
  - [Type-Specific Examples](#type-specific-examples)
- [Global Options](#global-options)
- [Workflow Examples](#workflow-examples)
- [CI/CD Integration](#cicd-integration)
- [License](#license)

## Installation

### Global Installation (Recommended)

```bash
npm install -g envspec
```

### Local Installation

```bash
npm install --save-dev envspec
```

### Requirements

- Node.js >= 18

## Quick Start

```bash
# Initialize envspec in your project
envspec init

# Generate .env file from schema
envspec create

# Validate your .env file
envspec validate

# Protect env files from git commits
envspec git-protect
```

## Commands

### `envspec init`

Initialize envspec in your project by creating an `envspec.json` schema file.

**Options:**
- `--from-env` - Create schema from existing `.env` file
- `--all-required` - Mark all inferred variables as required (only with `--from-env`)

**Examples:**

```bash
# Create empty schema
envspec init
```

**Result:**
```json
{
  "$schemaVersion": 1,
  "vars": {}
}
```

```bash
# Generate schema from existing .env file
envspec init --from-env
```

**Input (.env):**
```env
DATABASE_URL=postgresql://localhost:5432/mydb
PORT=3000
DEBUG=true
ALLOWED_HOSTS=["localhost","example.com"]
```

**Result (envspec.json):**
```json
{
  "$schemaVersion": 1,
  "vars": {
    "DATABASE_URL": {
      "required": false,
      "desc": "your_database_url",
      "type": "string"
    },
    "PORT": {
      "required": false,
      "desc": "your_port",
      "type": "number"
    },
    "DEBUG": {
      "required": false,
      "desc": "your_debug",
      "type": "boolean"
    },
    "ALLOWED_HOSTS": {
      "required": false,
      "desc": "your_allowed_hosts",
      "type": "array",
      "itemType": "string",
      "delimiter": ","
    }
  }
}
```

```bash
# Generate schema with all variables marked as required
envspec init --from-env --all-required
```

---

### `envspec create`

Generate `.env` file from `envspec.json` schema.

**Options:**
- `-o, --output <file>` - Output file path (default: `.env`)
- `--example` - Use example values from schema
- `--overwrite` - Allow overwriting existing file (creates backup)
- `--force` - Skip confirmation prompts
- `--dry-run` - Show what would be generated without writing

**Examples:**

```bash
# Generate .env with placeholder values
envspec create
```

**Input (envspec.json):**
```json
{
  "$schemaVersion": 1,
  "vars": {
    "DATABASE_URL": {
      "required": true,
      "desc": "your_database_url",
      "type": "string"
    },
    "PORT": {
      "required": true,
      "desc": "your_port",
      "type": "number"
    }
  }
}
```

**Result (.env):**
```env
DATABASE_URL=<your_database_url of type 'string'>
PORT=<your_port of type 'number'>
```

```bash
# Generate with example values
envspec create --example
```

**Input (envspec.json with examples):**
```json
{
  "$schemaVersion": 1,
  "vars": {
    "DATABASE_URL": {
      "required": true,
      "desc": "your_database_url",
      "type": "string",
      "example": "postgresql://localhost:5432/mydb"
    },
    "PORT": {
      "required": true,
      "desc": "your_port",
      "type": "number",
      "example": 3000
    }
  }
}
```

**Result (.env):**
```env
DATABASE_URL=postgresql://localhost:5432/mydb
PORT=3000
```

```bash
# Generate to custom file
envspec create -o .env.production
```

```bash
# Preview without writing
envspec create --dry-run
```

**Output:**
```
➕ Added 2 missing variables

--dry-run enabled. No file written.
```

```bash
# Overwrite existing .env (creates backup)
envspec create --overwrite
```

**Output:**
```
✔  Backup created → .env.2025-12-10T10-30-45-123Z.backup
✔  Preserved 1 existing values
➕ Added 1 missing variables
✔  .env generated safely
```

---

### `envspec validate`

Validate `.env` file against `envspec.json` schema.

**Options:**
- `-f, --file <path>` - Env file to validate (default: `.env`)

**Examples:**

```bash
# Validate default .env file
envspec validate
```

**Scenario 1: Valid environment**

**Input (.env):**
```env
DATABASE_URL=postgresql://localhost:5432/mydb
PORT=3000
DEBUG=true
```

**Result:**
```
✔  Environment variables are valid
```

**Scenario 2: Missing required variable**

**Input (.env):**
```env
PORT=3000
```

**Result:**
```
✖  Validation failed:

  • Missing required variable: DATABASE_URL

```
Exit code: 1

**Scenario 3: Type mismatch**

**Input (.env):**
```env
DATABASE_URL=postgresql://localhost:5432/mydb
PORT=not_a_number
DEBUG=true
```

**Result:**
```
✖  Validation failed:

  • Invalid type for key: PORT (expected "number", got "string")

```
Exit code: 1

**Scenario 4: Unknown variables**

**Input (.env):**
```env
DATABASE_URL=postgresql://localhost:5432/mydb
PORT=3000
UNKNOWN_VAR=something
```

**Result:**
```
⚠  Warnings:

  • Unknown variable in .env: UNKNOWN_VAR of type "string"

```

```bash
# Validate custom env file
envspec validate -f .env.production
```

**Scenario 5: Array validation**

**Input (envspec.json):**
```json
{
  "$schemaVersion": 1,
  "vars": {
    "ALLOWED_HOSTS": {
      "required": true,
      "type": "array",
      "itemType": "string",
      "delimiter": ","
    }
  }
}
```

**Input (.env):**
```env
ALLOWED_HOSTS=["localhost","example.com"]
```

**Result:**
```
✔  Environment variables are valid
```

**Scenario 6: Enum validation**

**Input (envspec.json):**
```json
{
  "$schemaVersion": 1,
  "vars": {
    "NODE_ENV": {
      "required": true,
      "type": "string",
      "enum": ["development", "production", "test"]
    }
  }
}
```

**Input (.env):**
```env
NODE_ENV=staging
```

**Result:**
```
✖  Validation failed:

  • Invalid value for NODE_ENV (must be one of: development, production, test)

```

---

### `envspec git-protect`

Ensure environment files are safely ignored by git.

**Examples:**

```bash
# Protect env files from git commits
envspec git-protect
```

**Scenario 1: No .gitignore exists**

**Result:**
```
✔  .gitignore created and env files protected
```

**Created .gitignore:**
```
.env
.env.local
.env.*.backup
```

**Scenario 2: .gitignore exists but doesn't protect env files**

**Result:**
```
✔  Environment files added to .gitignore
```

**Updated .gitignore:**
```
node_modules/
dist/

# envspec protected files
.env
.env.local
.env.*.backup
```

**Scenario 3: Already protected**

**Result:**
```
✔  Environment files are already protected
```

---

### `envspec schema:validate`

Validate `envspec.json` schema structure.

**Examples:**

```bash
# Validate schema file
envspec schema:validate
```

**Scenario 1: Valid schema**

**Input (envspec.json):**
```json
{
  "$schemaVersion": 1,
  "vars": {
    "DATABASE_URL": {
      "required": true,
      "desc": "your_database_url",
      "type": "string"
    }
  }
}
```

**Result:**
```
✔  envspec schema is valid
```

**Scenario 2: Invalid schema**

**Input (envspec.json):**
```json
{
  "$schemaVersion": "1",
  "vars": {
    "PORT": {
      "required": "yes",
      "type": "invalid_type"
    }
  }
}
```

**Result:**
```
✖  Schema validation failed:

  • $schemaVersion must be a number
  • PORT: required must be a boolean
  • PORT: type must be one of: string, number, boolean, array, object

```
Exit code: 1

---

## Schema Guide

### Understanding the Schema

The `envspec.json` file is your **single source of truth** for environment variable configuration. It defines:

- What variables your application expects
- What type each variable should be
- Which variables are required vs optional
- Validation rules (enums, array item types)

**Important**: The schema contains NO actual secret values. It only describes the structure. Actual values live in `.env` files which stay local and are gitignored.

**What gets committed to git:**
- ✅ `envspec.json` (schema - safe to share)
- ❌ `.env` (actual values - stays local)

### Schema Structure

Every `envspec.json` file follows this structure:

```json
{
  "$schemaVersion": 1,
  "vars": {
    "VARIABLE_NAME": {
      "required": true,
      "desc": "description",
      "type": "string"
    }
  }
}
```

**Top-level properties:**

- `$schemaVersion` (number, required) - Schema format version. Currently always `1`
- `vars` (object, required) - Object containing all your environment variable definitions

### Supported Types

| Type | Description | Example .env Value |
|------|-------------|-------------------|
| `string` | Text values | `DATABASE_URL=postgresql://localhost:5432/db` |
| `number` | Numeric values (int/float) | `PORT=3000` or `RATE=0.15` |
| `boolean` | true/false values | `DEBUG=true` or `ENABLED=false` |
| `array` | Lists (JSON or CSV) | `HOSTS=["a","b"]` or `TAGS=a,b,c` |
| `object` | JSON objects | `CONFIG={"key":"value"}` |

### Variable Properties

Each variable in `vars` can have these properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | ✅ Yes | One of: `string`, `number`, `boolean`, `array`, `object` |
| `required` | boolean | ✅ Yes | If `true`, validation fails when variable is missing |
| `desc` | string | ✅ Yes | Human-readable description (used in placeholders) |
| `example` | any | ❌ No | Example value for `envspec create --example` |
| `enum` | array | ❌ No | List of allowed values (validation constraint) |
| `itemType` | string | ❌ No | For arrays: type of each item (`string`, `number`, `boolean`) |
| `delimiter` | string | ❌ No | For CSV arrays: separator character (default: `","`) |

### Writing Your Schema

#### Step 1: Start with the basic structure

```json
{
  "$schemaVersion": 1,
  "vars": {}
}
```

#### Step 2: Add your variables

For each environment variable your app needs, add an entry:

```json
{
  "$schemaVersion": 1,
  "vars": {
    "DATABASE_URL": {
      "required": true,
      "desc": "PostgreSQL connection string",
      "type": "string"
    }
  }
}
```

#### Step 3: Choose required vs optional

- Set `required: true` for critical variables (app won't work without them)
- Set `required: false` for optional features or defaults

```json
{
  "DATABASE_URL": {
    "required": true,
    "desc": "Database connection string",
    "type": "string"
  },
  "CACHE_TTL": {
    "required": false,
    "desc": "Cache time-to-live in seconds",
    "type": "number"
  }
}
```

#### Step 4: Add examples (optional but recommended)

Examples help with `envspec create --example` and serve as documentation:

```json
{
  "PORT": {
    "required": true,
    "desc": "Server port",
    "type": "number",
    "example": 3000
  },
  "NODE_ENV": {
    "required": true,
    "desc": "Environment mode",
    "type": "string",
    "example": "development"
  }
}
```

#### Step 5: Add validation rules (optional)

Use `enum` to restrict values to a specific set:

```json
{
  "LOG_LEVEL": {
    "required": true,
    "desc": "Logging level",
    "type": "string",
    "enum": ["debug", "info", "warn", "error"],
    "example": "info"
  }
}
```

### Type-Specific Examples

#### String Type

Most common type for URLs, paths, tokens, etc.

```json
{
  "API_KEY": {
    "required": true,
    "desc": "Third-party API key",
    "type": "string",
    "example": "sk_test_abc123"
  },
  "DATABASE_URL": {
    "required": true,
    "desc": "PostgreSQL connection string",
    "type": "string",
    "example": "postgresql://user:pass@localhost:5432/mydb"
  }
}
```

**.env:**
```env
API_KEY=sk_live_xyz789
DATABASE_URL=postgresql://admin:secret@prod.db.com:5432/production
```

#### Number Type

For ports, timeouts, limits, rates, etc.

```json
{
  "PORT": {
    "required": true,
    "desc": "HTTP server port",
    "type": "number",
    "example": 3000
  },
  "MAX_CONNECTIONS": {
    "required": false,
    "desc": "Maximum database connections",
    "type": "number",
    "example": 10
  },
  "RATE_LIMIT": {
    "required": false,
    "desc": "API rate limit per second",
    "type": "number",
    "example": 0.5
  }
}
```

**.env:**
```env
PORT=8080
MAX_CONNECTIONS=20
RATE_LIMIT=1.5
```

#### Boolean Type

For feature flags, debug modes, toggles.

```json
{
  "DEBUG": {
    "required": false,
    "desc": "Enable debug logging",
    "type": "boolean",
    "example": false
  },
  "ENABLE_CACHE": {
    "required": false,
    "desc": "Enable Redis caching",
    "type": "boolean",
    "example": true
  }
}
```

**.env:**
```env
DEBUG=true
ENABLE_CACHE=false
```

**Valid boolean values in .env:**
- `true` or `false` (case-insensitive)

#### Array Type - JSON Format

For lists stored as JSON arrays.

```json
{
  "ALLOWED_ORIGINS": {
    "required": true,
    "desc": "CORS allowed origins",
    "type": "array",
    "itemType": "string",
    "example": ["http://localhost:3000", "https://example.com"]
  },
  "ADMIN_IDS": {
    "required": true,
    "desc": "Admin user IDs",
    "type": "array",
    "itemType": "number",
    "example": [1, 42, 100]
  }
}
```

**.env:**
```env
ALLOWED_ORIGINS=["http://localhost:3000","https://app.example.com","https://admin.example.com"]
ADMIN_IDS=[1,42,100,256]
```

#### Array Type - CSV Format

For simple comma-separated lists.

```json
{
  "FEATURE_FLAGS": {
    "required": false,
    "desc": "Enabled feature flags",
    "type": "array",
    "itemType": "string",
    "delimiter": ",",
    "example": ["new-ui", "beta-api", "analytics"]
  },
  "PORTS": {
    "required": true,
    "desc": "Service ports to expose",
    "type": "array",
    "itemType": "number",
    "delimiter": ",",
    "example": [3000, 3001, 3002]
  }
}
```

**.env:**
```env
FEATURE_FLAGS=new-ui,beta-api,analytics,dark-mode
PORTS=3000,3001,3002,4000
```

**Array validation:**
- `itemType` validates each element in the array
- Supports: `string`, `number`, `boolean`
- Both JSON and CSV formats are validated
- envspec automatically detects JSON arrays vs delimiter-based arrays. If the value starts with `[` it is parsed as JSON.

#### Object Type

For complex configuration stored as JSON.

```json
{
  "DATABASE_CONFIG": {
    "required": true,
    "desc": "Database configuration object",
    "type": "object",
    "example": {
      "host": "localhost",
      "port": 5432,
      "ssl": true
    }
  },
  "AWS_CONFIG": {
    "required": true,
    "desc": "AWS service configuration",
    "type": "object",
    "example": {
      "region": "us-east-1",
      "bucket": "my-bucket"
    }
  }
}
```

**.env:**
```env
DATABASE_CONFIG={"host":"prod.db.com","port":5432,"ssl":true,"poolSize":20}
AWS_CONFIG={"region":"eu-west-1","bucket":"production-assets"}
```

**Note**: Objects are stored as compact JSON strings (no newlines) in `.env` files.

#### Enum Validation

Restrict values to a specific set of options.

```json
{
  "NODE_ENV": {
    "required": true,
    "desc": "Application environment",
    "type": "string",
    "enum": ["development", "staging", "production"],
    "example": "development"
  },
  "LOG_LEVEL": {
    "required": false,
    "desc": "Logging verbosity",
    "type": "string",
    "enum": ["debug", "info", "warn", "error"],
    "example": "info"
  },
  "MAX_RETRIES": {
    "required": false,
    "desc": "Maximum retry attempts",
    "type": "number",
    "enum": [1, 3, 5, 10],
    "example": 3
  }
}
```

**.env:**
```env
NODE_ENV=production
LOG_LEVEL=warn
MAX_RETRIES=5
```

**Validation**: `envspec validate` will fail if the value is not in the enum list.

### Complete Schema Example

Here's a real-world schema combining all features:

```json
{
  "$schemaVersion": 1,
  "vars": {
    "NODE_ENV": {
      "required": true,
      "desc": "Application environment",
      "type": "string",
      "enum": ["development", "production", "test"],
      "example": "development"
    },
    "PORT": {
      "required": true,
      "desc": "HTTP server port",
      "type": "number",
      "example": 3000
    },
    "DATABASE_URL": {
      "required": true,
      "desc": "PostgreSQL connection string",
      "type": "string",
      "example": "postgresql://localhost:5432/myapp"
    },
    "REDIS_URL": {
      "required": false,
      "desc": "Redis connection string for caching",
      "type": "string",
      "example": "redis://localhost:6379"
    },
    "DEBUG": {
      "required": false,
      "desc": "Enable debug mode",
      "type": "boolean",
      "example": false
    },
    "ALLOWED_ORIGINS": {
      "required": true,
      "desc": "CORS allowed origins",
      "type": "array",
      "itemType": "string",
      "example": ["http://localhost:3000"]
    },
    "FEATURE_FLAGS": {
      "required": false,
      "desc": "Enabled feature flags",
      "type": "array",
      "itemType": "string",
      "delimiter": ",",
      "example": ["new-ui", "beta-api"]
    },
    "AWS_CONFIG": {
      "required": true,
      "desc": "AWS configuration",
      "type": "object",
      "example": {
        "region": "us-east-1",
        "bucket": "my-bucket"
      }
    },
    "LOG_LEVEL": {
      "required": false,
      "desc": "Logging level",
      "type": "string",
      "enum": ["debug", "info", "warn", "error"],
      "example": "info"
    }
  }
}
```

## Global Options

- `--debug` - Show full error stack traces

**Example:**
```bash
envspec validate --debug
```

## Workflow Examples

### 1. Start a new project

```bash
# Initialize envspec
envspec init

# Edit envspec.json to define your schema
# Add your variables with types and requirements

# Generate .env template
envspec create

# Fill in actual values in .env

# Validate configuration
envspec validate

# Protect from git commits
envspec git-protect
```

### 2. Migrate existing project

```bash
# Generate schema from existing .env
envspec init --from-env --all-required

# Review and edit envspec.json
# Add descriptions, examples, enums as needed

# Validate current setup
envspec validate

# Protect from git commits
envspec git-protect

# Commit envspec.json to version control
git add envspec.json
git commit -m "Add environment variable schema"
```

### 3. Team onboarding

```bash
# Clone repository
git clone <repo-url>
cd <project>

# Install dependencies
npm install

# Generate .env from schema
envspec create

# Fill in your local values in .env

# Validate before running
envspec validate

# Start development
npm run dev
```

## CI/CD Integration

Add validation to your CI pipeline:

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  validate-env:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install -g envspec
      - run: envspec schema:validate
```

## License

MIT

## Author

Akshay Kumar Das

## Contributing

Issues and pull requests are welcome at https://github.com/akshayxemo/envspec

## Links

- [GitHub Repository](https://github.com/akshayxemo/envspec)
- [Report Issues](https://github.com/akshayxemo/envspec/issues)

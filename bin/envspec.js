#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "../src/commands/init.js";
import { createCommand } from "../src/commands/create.js";
import { protectCommmitToGitCommand } from "../src/commands/protect.js";
import { validateCommand } from "../src/commands/validate.js";
import { schemaValidateCommand } from "../src/commands/schemaValidate.js";
import { statusCommand } from "../src/commands/status.js";
import { templateCommand } from "../src/commands/template.js";

const program = new Command();

program
  .name("envspec")
  .description("Schema-driven environment variable workflow")
  .option("--debug", "Show full error stack traces");

program
  .command("init")
  .option("--from-env", "create schema from existing .env file")
  .option("--all-required", "Mark all inferred vars as required")
  .option("-i, --interactive", "Interactive mode with guided prompts")
  .description("Initialize envspec in the project")
  .action(initCommand)

program
  .command("create")
  .description("Generate environment files from envspec.json")
  .option("-o, --output <file>", "Output file", ".env")
  .option("-e, --env <environment>", "Environment (development, production, staging, etc.)")
  .option("--example", "Use example values from schema")
  .option("--overwrite", "Allow overwriting existing file")
  .option("--force", "Skip confirmation prompts")
  .option("--dry-run", "Show what would be generated without writing")
  .action(createCommand);

program
  .command("git-protect")
  .description("Ensure env files are safely ignored by git")
  .action(protectCommmitToGitCommand);

program
  .command("validate")
  .description("Validate .env against envspec.json")
  .option("-f, --file <path>", "Env file to validate", ".env")
  .option("-e, --env <environment>", "Environment (development, production, staging, etc.)")
  .action(validateCommand);

program
  .command("schema:validate")
  .description("Validate envspec.json structure")
  .action(schemaValidateCommand);

program
  .command("status")
  .description("Show current status of environment variables and schema")
  .option("-e, --env <environment>", "Check specific environment")
  .action(statusCommand);

program
  .command("template [name]")
  .description("List available templates or apply a specific template")
  .action(templateCommand);

program.hook("preAction", (thisCommand) => {
  if (thisCommand.opts().debug) {
    process.env.ENVSPEC_DEBUG = "1";
  }
});
program.parse(process.argv);
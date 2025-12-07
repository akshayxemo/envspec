#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "../src/commands/init.js";

const program = new Command();

program
  .name("envspec")
  .description("Schema-driven environment variable workflow");

program
  .command("init")
  .option("--from-env", "create schema from existing .env file")
  .description("Initialize envspec in the project")
  .action(initCommand)

program.parse(process.argv);
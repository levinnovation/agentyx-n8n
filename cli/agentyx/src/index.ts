#!/usr/bin/env node

import { program } from "commander";
import { compileCommand } from "./commands/compile.js";
import { deployCommand } from "./commands/deploy.js";
import { diffCommand } from "./commands/diff.js";
import { migrateCommand } from "./commands/migrate.js";
import { credentialsCommand } from "./commands/credentials.js";
import { auditCommand } from "./commands/audit.js";

program
  .name("agentyx")
  .description("Agentyx CLI for deterministic n8n SDLC")
  .version("1.0.0");

program.addCommand(compileCommand);
program.addCommand(deployCommand);
program.addCommand(diffCommand);
program.addCommand(migrateCommand);
program.addCommand(credentialsCommand);
program.addCommand(auditCommand);

program.parse();

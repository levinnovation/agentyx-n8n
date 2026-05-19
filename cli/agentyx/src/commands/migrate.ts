import { Command } from "commander";
import axios from "axios";

export const migrateCommand = new Command("n8n migrate")
  .description("Migrate workflows between repo and live n8n")
  .option("-t, --tenant <tenant>", "Tenant slug", "levinnovation")
  .option("-e, --env <env>", "Environment (dev/prod)", "dev")
  .requiredOption("--direction <dir>", "live-to-repo or repo-to-live")
  .option("--output-dir <dir>", "Output directory for live-to-repo")
  .option("--asset-names <names...>", "Specific asset names to migrate")
  .action(async (options) => {
    const compilerUrl = process.env.AGENTYX_COMPILER_URL ?? "http://localhost:3000";
    const compilerToken = process.env.AGENTYX_COMPILER_TOKEN ?? "";

    try {
      const resp = await axios.post(
        `${compilerUrl}/migrate`,
        {
          tenant: options.tenant,
          direction: options.direction,
          outputDir: options.outputDir,
          assetNames: options.assetNames,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${compilerToken}`,
          },
        },
      );
      console.log("Migration result:");
      console.log(JSON.stringify(resp.data, null, 2));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error("Migrate failed:", err.response?.data ?? err.message);
      } else {
        console.error("Migrate failed:", err);
      }
      process.exit(1);
    }
  });

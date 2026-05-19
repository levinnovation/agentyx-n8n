import { Command } from "commander";
import axios from "axios";

export const diffCommand = new Command("n8n diff")
  .description("Compare repo workflows against live n8n instance")
  .option("-t, --tenant <tenant>", "Tenant slug", "levinnovation")
  .option("-e, --env <env>", "Environment (dev/prod)", "dev")
  .option("-a, --asset <asset>", "Specific asset name")
  .action(async (options) => {
    const compilerUrl = process.env.AGENTYX_COMPILER_URL ?? "http://localhost:3000";
    const compilerToken = process.env.AGENTYX_COMPILER_TOKEN ?? "";

    try {
      const resp = await axios.post(
        `${compilerUrl}/diff`,
        {
          tenant: options.tenant,
          assets: options.asset ? [options.asset] : undefined,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${compilerToken}`,
          },
        },
      );
      console.log("Diff results:");
      console.log(JSON.stringify(resp.data, null, 2));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error("Diff failed:", err.response?.data ?? err.message);
      } else {
        console.error("Diff failed:", err);
      }
      process.exit(1);
    }
  });

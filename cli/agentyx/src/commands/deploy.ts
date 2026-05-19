import { Command } from "commander";
import axios from "axios";
import { execSync } from "node:child_process";

export const deployCommand = new Command("n8n deploy")
  .description("Deploy compiled n8n assets to a running instance")
  .option("-t, --tenant <tenant>", "Tenant slug", "levinnovation")
  .option("-e, --env <env>", "Environment (dev/prod)", "dev")
  .option("-a, --asset <asset>", "Asset name (optional)")
  .option("--all", "Deploy all assets for tenant")
  .option("--dry-run", "Show diff but do not deploy")
  .action(async (options) => {
    const compilerUrl = process.env.AGENTYX_COMPILER_URL ?? "http://localhost:3000";
    const compilerToken = process.env.AGENTYX_COMPILER_TOKEN ?? "";

    if (!compilerToken) {
      console.error("Error: AGENTYX_COMPILER_TOKEN is required");
      process.exit(1);
    }

    const commitHash = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
    const author = execSync("git log -1 --pretty=format:'%an <%ae>'", { encoding: "utf-8" }).trim();
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${compilerToken}`,
      "X-Agentyx-CLI-Version": "1.0.0",
      "X-Agentyx-Git-Commit": commitHash,
      "X-Agentyx-Git-Author": author,
      "X-Agentyx-Git-Branch": branch,
      "X-Agentyx-Local-Timestamp": new Date().toISOString(),
    };

    try {
      const resp = await axios.post(
        `${compilerUrl}/deploy`,
        {
          tenant: options.tenant,
          assets: options.asset ? [options.asset] : undefined,
          all: options.all,
          commitHash,
          authorName: author,
          branch,
          dryRun: options.dryRun ?? false,
        },
        { headers },
      );
      console.log("Deployment receipt:");
      console.log(JSON.stringify(resp.data, null, 2));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error("Deploy failed:", err.response?.data ?? err.message);
      } else {
        console.error("Deploy failed:", err);
      }
      process.exit(1);
    }
  });

import { Command } from "commander";
import axios from "axios";

export const auditCommand = new Command("n8n audit")
  .description("Query the n8n deployment audit log")
  .option("-t, --tenant <tenant>", "Tenant slug", "levinnovation")
  .option("--workflow <name>", "Filter by workflow name")
  .option("--since <date>", "Filter by date (YYYY-MM-DD)")
  .option("--limit <n>", "Limit results", "20")
  .action(async (options) => {
    const compilerUrl = process.env.AGENTYX_COMPILER_URL ?? "http://localhost:3000";
    const compilerToken = process.env.AGENTYX_COMPILER_TOKEN ?? "";

    const params = new URLSearchParams();
    params.append("tenant", options.tenant);
    if (options.workflow) params.append("objectName", options.workflow);
    if (options.since) params.append("since", options.since);
    params.append("limit", options.limit);

    try {
      const resp = await axios.get(`${compilerUrl}/audit?${params.toString()}`, {
        headers: {
          "Authorization": `Bearer ${compilerToken}`,
        },
      });
      console.log("Audit log:");
      console.log(JSON.stringify(resp.data, null, 2));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error("Audit query failed:", err.response?.data ?? err.message);
      } else {
        console.error("Audit query failed:", err);
      }
      process.exit(1);
    }
  });

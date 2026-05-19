import { Command } from "commander";
import axios from "axios";
import { readFileSync } from "node:fs";
import YAML from "yaml";

export const credentialsCommand = new Command("n8n credentials")
  .description("Manage n8n credentials via YAML specs");

credentialsCommand
  .command("encrypt")
  .description("Encrypt a credential YAML file")
  .option("-t, --tenant <tenant>", "Tenant slug", "levinnovation")
  .requiredOption("-f, --file <file>", "Path to credential YAML file")
  .action(async (options) => {
    const compilerUrl = process.env.AGENTYX_COMPILER_URL ?? "http://localhost:3000";
    const compilerToken = process.env.AGENTYX_COMPILER_TOKEN ?? "";

    const yamlContent = readFileSync(options.file, "utf-8");
    const parsed = YAML.parse(yamlContent) as Record<string, unknown>;
    const spec = parsed.spec as Record<string, unknown>;

    try {
      const resp = await axios.post(
        `${compilerUrl}/credentials/encrypt`,
        {
          type: spec.type,
          data: spec.data,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${compilerToken}`,
          },
        },
      );
      console.log("Encrypted credential:");
      console.log(JSON.stringify(resp.data, null, 2));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error("Encrypt failed:", err.response?.data ?? err.message);
      } else {
        console.error("Encrypt failed:", err);
      }
      process.exit(1);
    }
  });

credentialsCommand
  .command("scaffold")
  .description("Scaffold a new credential YAML file")
  .option("-t, --tenant <tenant>", "Tenant slug", "levinnovation")
  .requiredOption("-n, --name <name>", "Credential name")
  .requiredOption("--type <type>", "n8n credential type ID")
  .action((options) => {
    const template = `apiVersion: agentyx.io/v1
kind: N8nCredential
metadata:
  name: ${options.name}
  tenant: ${options.tenant}
spec:
  type: ${options.type}
  description: "TODO: describe this credential"
  data:
    # TODO: add credential fields with vault references
    # example: accessToken: "\${VAULT::${options.tenant}/service/key}"
  scopes: []
  notes: []
`;
    console.log(template);
  });

credentialsCommand
  .command("list")
  .description("List credentials for a tenant")
  .option("-t, --tenant <tenant>", "Tenant slug", "levinnovation")
  .action(async (options) => {
    // TODO: Implement credential listing via compiler service
    console.log("Listing credentials for tenant:", options.tenant);
  });

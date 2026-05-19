import { Router, type Request, type Response } from "express";
import { config } from "../config.js";
import { ApiDeployer } from "../deployer/apiDeployer.js";

const router = Router();
const apiDeployer = new ApiDeployer(config.n8nApiUrl, config.n8nApiKey);

interface MigrateRequestBody {
  tenant: string;
  direction: "live-to-repo" | "repo-to-live";
  outputDir?: string;
  assetNames?: string[];
}

router.post("/", async (req: Request, res: Response) => {
  const body = req.body as MigrateRequestBody;
  if (!body.tenant || !body.direction) {
    res.status(400).json({ error: "tenant and direction are required" });
    return;
  }

  try {
    if (body.direction === "live-to-repo") {
      const liveWorkflows = await apiDeployer.listWorkflows();
      const migrated = [];

      for (const wf of liveWorkflows) {
        if (body.assetNames && !body.assetNames.includes(wf.name)) continue;

        const full = await apiDeployer.getWorkflow(wf.id);
        migrated.push({
          name: wf.name,
          id: wf.id,
          active: wf.active,
          nodesCount: Array.isArray(full.nodes) ? full.nodes.length : 0,
          // TODO: generate workflow.yaml, asset.yaml, README.md
          exportedJson: full,
        });
      }

      res.status(200).json({
        tenant: body.tenant,
        direction: body.direction,
        migratedCount: migrated.length,
        migrated,
        note: "Credential stubs generated with [MIGRATED_FROM_LIVE — MANUAL_ENTRY_REQUIRED]",
      });
    } else {
      res.status(400).json({ error: "repo-to-live not yet implemented" });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export { router as migrateRouter };

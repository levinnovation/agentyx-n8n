import { Router, type Request, type Response } from "express";
import { config } from "../config.js";
import { ApiDeployer } from "../deployer/apiDeployer.js";

const router = Router();
const apiDeployer = new ApiDeployer(config.n8nApiUrl, config.n8nApiKey);

interface DiffRequestBody {
  tenant: string;
  assets?: string[];
}

router.post("/", async (req: Request, res: Response) => {
  const body = req.body as DiffRequestBody;
  if (!body.tenant) {
    res.status(400).json({ error: "tenant is required" });
    return;
  }

  try {
    const liveWorkflows = await apiDeployer.listWorkflows();
    // TODO: Load repo workflows from filesystem and compare
    const diffs = liveWorkflows.map((wf) => ({
      name: wf.name,
      liveId: wf.id,
      liveUpdatedAt: wf.updatedAt,
      repoExists: false, // placeholder
      repoVersion: null, // placeholder
      diffStatus: "unknown", // placeholder: unchanged, modified, missing_in_repo, missing_in_live
    }));

    res.status(200).json({
      tenant: body.tenant,
      comparedAt: new Date().toISOString(),
      liveCount: liveWorkflows.length,
      diffs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export { router as diffRouter };

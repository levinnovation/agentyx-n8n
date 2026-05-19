import { Router, type Request, type Response } from "express";
import { AppDataSource } from "../deployer/dbDeployer.js";
import { N8nChangeLog } from "../entities/audit.js";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const tenant = req.query.tenant as string;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const objectName = req.query.objectName as string | undefined;
  const since = req.query.since as string | undefined;

  if (!tenant) {
    res.status(400).json({ error: "tenant query param is required" });
    return;
  }

  try {
    const repo = AppDataSource.getRepository(N8nChangeLog);
    const qb = repo.createQueryBuilder("log")
      .where("log.tenant = :tenant", { tenant })
      .orderBy("log.deployedAt", "DESC")
      .take(limit);

    if (objectName) {
      qb.andWhere("log.objectName = :objectName", { objectName });
    }
    if (since) {
      qb.andWhere("log.deployedAt >= :since", { since: new Date(since) });
    }

    const rows = await qb.getMany();
    res.status(200).json({ tenant, count: rows.length, rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export { router as auditRouter };

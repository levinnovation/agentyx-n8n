import { Router, type Request, type Response } from "express";
import { CredentialCompiler } from "../compiler/credentialCompiler.js";
import { config } from "../config.js";

const router = Router();
const credentialCompiler = new CredentialCompiler(config.n8nEncryptionKey);

interface EncryptRequestBody {
  type: string;
  data: Record<string, unknown>;
}

router.post("/encrypt", async (req: Request, res: Response) => {
  const body = req.body as EncryptRequestBody;
  if (!body.type || !body.data) {
    res.status(400).json({ error: "type and data are required" });
    return;
  }

  try {
    const encrypted = credentialCompiler.compile(body.data);
    res.status(200).json({
      type: body.type,
      encryptedData: encrypted,
      note: "This encrypted blob is ready for insertion into credentials_entity.data",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export { router as credentialsRouter };

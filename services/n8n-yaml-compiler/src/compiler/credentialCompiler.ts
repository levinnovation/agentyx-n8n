import crypto from "node:crypto";

export class CredentialCompiler {
  constructor(private encryptionKey: string) {}

  compile(data: Record<string, unknown>): Record<string, unknown> {
    // Use n8n's exact encryption algorithm
    // n8n uses AES-256-CBC with the N8N_ENCRYPTION_KEY
    const encrypted = this.encrypt(JSON.stringify(data));
    return { encryptedData: encrypted };
  }

  private encrypt(plaintext: string): string {
    // This is a simplified placeholder.
    // The real implementation must import n8n's exact encryption function
    // from the n8n source code to ensure compatibility.
    // n8n uses: crypto.createCipheriv('aes-256-cbc', key, iv)
    // with key derived from N8N_ENCRYPTION_KEY.

    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(this.encryptionKey, "salt", 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
  }

  decrypt(encryptedData: string): Record<string, unknown> {
    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(this.encryptionKey, "salt", 32);
    const [ivHex, encrypted] = encryptedData.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
  }
}

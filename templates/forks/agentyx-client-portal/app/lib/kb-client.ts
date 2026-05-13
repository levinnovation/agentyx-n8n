import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export interface KbDocument {
  id: string;
  title: string;
  product: string;
  mime: string;
  version: number;
  updated_at: string;
  visibility: string;
  chars: number;
  signed_url?: string;
}

export async function getDocuments(tenantSlug: string): Promise<KbDocument[]> {
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `SELECT id, title, product, mime, version, updated_at, visibility, chars
       FROM public.cs_documents
       WHERE tenant_slug = $1
       ORDER BY updated_at DESC`,
      [tenantSlug]
    );
    return res.rows;
  } finally {
    client.release();
  }
}

export async function insertDocument(
  tenantSlug: string,
  title: string,
  mime: string,
  content: string,
  visibility: string = "context_only",
  product: string = "default"
): Promise<KbDocument> {
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `INSERT INTO public.cs_documents (tenant_slug, title, mime, content, visibility, product, chars)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, product, mime, version, updated_at, visibility, chars`,
      [tenantSlug, title, mime, content, visibility, product, content.length]
    );
    return res.rows[0];
  } finally {
    client.release();
  }
}

export async function deleteDocument(tenantSlug: string, docId: string): Promise<boolean> {
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `DELETE FROM public.cs_documents WHERE tenant_slug = $1 AND id = $2`,
      [tenantSlug, docId]
    );
    return (res.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

export async function getDocumentById(tenantSlug: string, docId: string): Promise<KbDocument | null> {
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `SELECT id, title, product, mime, version, updated_at, visibility, chars
       FROM public.cs_documents
       WHERE tenant_slug = $1 AND id = $2`,
      [tenantSlug, docId]
    );
    return res.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function updateDocumentVisibility(
  tenantSlug: string,
  docId: string,
  visibility: string
): Promise<boolean> {
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `UPDATE public.cs_documents SET visibility = $1, updated_at = now() WHERE tenant_slug = $2 AND id = $3`,
      [visibility, tenantSlug, docId]
    );
    return (res.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

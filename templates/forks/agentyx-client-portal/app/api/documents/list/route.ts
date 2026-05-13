import { NextRequest, NextResponse } from "next/server";
import { getDocuments } from "@/app/lib/kb-client";
import { resolveTenantSlug } from "@/app/lib/tenant-slug";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const tenantSlug = resolveTenantSlug(request.url, request);
    const docs = await getDocuments(tenantSlug);
    return NextResponse.json({ documents: docs });
  } catch (error) {
    console.error("Error listing documents:", error);
    return NextResponse.json({ error: "Failed to list documents" }, { status: 500 });
  }
}

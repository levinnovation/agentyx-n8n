import { NextRequest, NextResponse } from "next/server";
import { deleteDocument } from "@/app/lib/kb-client";
import { resolveTenantSlug } from "@/app/lib/tenant-slug";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get("id");

    if (!docId) {
      return NextResponse.json({ error: "Missing document id" }, { status: 400 });
    }

    const tenantSlug = resolveTenantSlug(request.url, request);
    const deleted = await deleteDocument(tenantSlug, docId);

    if (!deleted) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}

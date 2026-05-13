import { NextRequest, NextResponse } from "next/server";
import { getDocumentById, updateDocumentVisibility } from "@/app/lib/kb-client";
import { resolveTenantSlug } from "@/app/lib/tenant-slug";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  try {
    const { docId, visibility } = await request.json();

    if (!docId || !visibility) {
      return NextResponse.json({ error: "Missing docId or visibility" }, { status: 400 });
    }

    if (visibility !== "context_only" && visibility !== "shareable") {
      return NextResponse.json(
        { error: "Visibility must be 'context_only' or 'shareable'" },
        { status: 400 }
      );
    }

    const tenantSlug = resolveTenantSlug(request.url, request);

    // Verify document exists
    const doc = await getDocumentById(tenantSlug, docId);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const updated = await updateDocumentVisibility(tenantSlug, docId, visibility);

    if (!updated) {
      return NextResponse.json({ error: "Failed to update visibility" }, { status: 500 });
    }

    return NextResponse.json({ success: true, visibility });
  } catch (error) {
    console.error("Error updating document visibility:", error);
    return NextResponse.json({ error: "Failed to update visibility" }, { status: 500 });
  }
}

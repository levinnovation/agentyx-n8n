import { NextRequest, NextResponse } from "next/server";
import { upsertDocument } from "@/app/lib/kb-client";
import { resolveTenantSlug } from "@/app/lib/tenant-slug";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const visibility = (formData.get("visibility") as string) || "context_only";
    const product = (formData.get("product") as string) || "default";

    if (!title || !content) {
      return NextResponse.json({ error: "Missing title or content" }, { status: 400 });
    }

    if (visibility !== "context_only" && visibility !== "shareable") {
      return NextResponse.json(
        { error: "Visibility must be 'context_only' or 'shareable'" },
        { status: 400 }
      );
    }

    const tenantSlug = resolveTenantSlug(request.url, request);
    const mime = formData.get("mime") as string || "text/plain";

    const doc = await upsertDocument(tenantSlug, title, mime, content, visibility, product);

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}

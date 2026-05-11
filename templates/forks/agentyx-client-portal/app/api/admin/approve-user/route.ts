import { NextRequest } from "next/server";
import { proxyToBetterAuth } from "../_lib";

export async function POST(req: NextRequest) {
  const payload = await req.json();
  return proxyToBetterAuth(req, "/api/admin/approve-user", "POST", payload);
}

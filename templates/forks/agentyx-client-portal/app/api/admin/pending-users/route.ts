import { NextRequest } from "next/server";
import { proxyToBetterAuth } from "../_lib";

export async function GET(req: NextRequest) {
  return proxyToBetterAuth(req, "/api/admin/pending-users", "GET");
}

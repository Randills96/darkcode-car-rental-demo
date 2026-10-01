import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public liveness probe only. Does not report database, auth, or environment details.
 */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}

import { NextResponse } from "next/server";
import { ApiAuthError, requirePermissionApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { generateOwnerSettlementReceiptPdf } from "@/lib/services/owner-settlement-receipt";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requirePermissionApi("settlements.view");
    const { id } = await context.params;

    const pdf = await generateOwnerSettlementReceiptPdf(id);
    if (!pdf) {
      return NextResponse.json({ error: "Owner settlement not found." }, { status: 400 });
    }

    // Default to `inline` so mobile browsers render the PDF in their built-in
    // viewer. `attachment` combined with an <a download target="_blank"> opens a
    // blank tab and silently drops the file on iOS Safari and in-app browsers.
    // Pass ?dl=1 to force a download instead.
    const forceDownload = new URL(request.url).searchParams.get("dl") === "1";
    const settlement = await prisma.ownerSettlement.findUnique({
      where: { id },
      select: { rental: { select: { bookingNumber: true } } },
    });
    const filename = `owner-price-breakdown-${settlement?.rental.bookingNumber ?? id}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return error.response;
    }
    console.error("owner settlement receipt PDF:", error);
    return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 });
  }
}

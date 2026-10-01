import { NextResponse } from "next/server";
import { ApiAuthError, requirePermissionApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { generateBrokerSettlementReceiptPdf } from "@/lib/services/broker-settlement-receipt";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requirePermissionApi("settlements.view");
    const { id } = await context.params;

    const pdf = await generateBrokerSettlementReceiptPdf(id);
    if (!pdf) {
      return NextResponse.json(
        { error: "Could not generate the broker settlement slip for this hire." },
        { status: 400 }
      );
    }

    // See the owner receipt route: `inline` keeps mobile browsers able to open
    // the file. Pass ?dl=1 to force a download instead.
    const forceDownload = new URL(request.url).searchParams.get("dl") === "1";
    const commission = await prisma.brokerCommission.findUnique({
      where: { id },
      select: { rental: { select: { bookingNumber: true } } },
    });
    const filename = `broker-commission-${commission?.rental.bookingNumber ?? id}.pdf`;

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
    console.error("broker settlement receipt PDF:", error);
    return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 });
  }
}

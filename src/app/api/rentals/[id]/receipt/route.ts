import { NextResponse } from "next/server";
import { ApiAuthError, requirePermissionApi } from "@/lib/auth/session";
import { generateCustomerReceiptPdf } from "@/lib/services/customer-receipt";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requirePermissionApi("rentals.receipt");
    const { id } = await context.params;

    const pdf = await generateCustomerReceiptPdf(id);
    if (!pdf) {
      return NextResponse.json(
        {
          error:
            "Receipt is available only after the rental is returned/completed and fully paid.",
        },
        { status: 400 }
      );
    }

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="customer-receipt-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return error.response;
    }
    console.error("customer receipt PDF:", error);
    return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { ApiAuthError, requirePermissionApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  buildDocumentDownloadName,
  readCustomerDocumentFile,
} from "@/lib/uploads/customer-documents";

interface RouteContext {
  params: Promise<{ documentId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requirePermissionApi("customers.view");

    const { documentId } = await context.params;
    const download = new URL(request.url).searchParams.get("download") === "1";

    const document = await prisma.customerDocument.findUnique({
      where: { id: documentId },
      select: {
        filePath: true,
        documentType: true,
        documentNumber: true,
        customerId: true,
      },
    });

    if (!document?.filePath) {
      return NextResponse.json({ error: "Document file not found" }, { status: 404 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: document.customerId },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Document file not found" }, { status: 404 });
    }

    const fileBuffer = await readCustomerDocumentFile(document.filePath);
    const fileName = buildDocumentDownloadName({
      documentType: document.documentType,
      documentNumber: document.documentNumber,
      extension: "jpg",
    });

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(fileBuffer.byteLength),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
      },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return error.response;
    }
    console.error("customer document file GET:", error);
    return NextResponse.json({ error: "Unable to load document file" }, { status: 500 });
  }
}

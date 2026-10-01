import { NextResponse } from "next/server";
import { ApiAuthError, requirePermissionApi } from "@/lib/auth/session";
import { generateReportPdf, getReportPdfFilename } from "@/lib/services/report-pdf";
import { reportExportSchema } from "@/lib/validations/report";

export async function GET(request: Request) {
  try {
    await requirePermissionApi("reports.export");

    const { searchParams } = new URL(request.url);
    const parsed = reportExportSchema.safeParse({
      reportType: searchParams.get("reportType"),
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid export parameters" }, { status: 400 });
    }

    const { reportType, from, to } = parsed.data;
    const pdf = await generateReportPdf(reportType, from, to);
    const filename = getReportPdfFilename(reportType);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return error.response;
    }
    console.error("report PDF export:", error);
    return NextResponse.json({ error: "Failed to generate report PDF" }, { status: 500 });
  }
}

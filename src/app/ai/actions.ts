"use server";

import { requireAuth, requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import {
  scanCustomerDocumentImage,
  scanDrivingLicenceImages,
  type DocumentScanResult,
  type DrivingLicenceScanResult,
} from "@/lib/ai/document-scan";
import {
  generateReminderDraft,
  upcomingJobToReminderInput,
  type ReminderChannel,
} from "@/lib/ai/reminder-draft";
import {
  generateDashboardSummary,
  type DashboardSummaryInput,
} from "@/lib/ai/dashboard-summary";
import { getDashboardData } from "@/lib/services/dashboard";
import { getSystemSettings } from "@/lib/services/settings";
import { isAiEnabled } from "@/lib/ai/config";
import type { UpcomingJobType } from "@/lib/services/upcoming-jobs";

export type AiActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

export async function getAiStatus(): Promise<{ enabled: boolean }> {
  await requireAuth();
  return { enabled: isAiEnabled() };
}

export async function scanCustomerDocument(
  formData: FormData
): Promise<AiActionResult<{ result: DocumentScanResult; source: "ai" }>> {
  try {
    await requirePermission("customers.edit");

    const file = formData.get("file");
    const documentType = String(formData.get("documentType") ?? "");

    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Please upload a document image first" };
    }

    if (!file.type.startsWith("image/")) {
      return { success: false, error: "Only image files can be scanned" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { result, source } = await scanCustomerDocumentImage({
      buffer,
      mimeType: file.type,
      documentType: documentType || undefined,
    });

    return {
      success: true,
      data: { result, source },
      message: "Document details extracted — review before saving",
    };
  } catch (error) {
    console.error("scanCustomerDocument:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to scan document",
    };
  }
}

function isUploadedImage(file: FormDataEntryValue | null): file is File {
  if (!file || typeof file !== "object" || typeof (file as File).arrayBuffer !== "function") {
    return false;
  }
  const upload = file as File;
  if (!upload.size) return false;
  const type = String(upload.type || "").toLowerCase();
  const name = String(upload.name || "").toLowerCase();
  return type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|tif{1,2}|heic|heif|avif)$/.test(name);
}

async function readCompressedScanImage(file: FormDataEntryValue | null, label: string) {
  if (!isUploadedImage(file)) {
    return null;
  }

  const { compressDocumentImage } = await import("@/lib/uploads/image-compress");
  const compressed = await compressDocumentImage(Buffer.from(await file.arrayBuffer()));
  return {
    buffer: compressed.buffer,
    mimeType: compressed.mimeType,
    label,
  };
}

export async function scanDrivingLicence(
  formData: FormData
): Promise<AiActionResult<{ result: DrivingLicenceScanResult; source: "ai" }>> {
  try {
    const session = await requireAuth();
    if (
      !hasPermission(session.user.role, "customers.create") &&
      !hasPermission(session.user.role, "customers.edit")
    ) {
      return { success: false, error: "You do not have permission to scan a driving licence" };
    }

    const front = await readCompressedScanImage(formData.get("front"), "licence front");
    const back = await readCompressedScanImage(formData.get("back"), "licence back");
    const images = [front, back].filter(
      (image): image is NonNullable<typeof front> => Boolean(image)
    );

    if (images.length === 0) {
      return { success: false, error: "Upload a driving licence photo first" };
    }

    const { result, source } = await scanDrivingLicenceImages({ images });
    const filledCount = [
      result.fullName,
      result.nic,
      result.address,
      result.drivingLicenceNumber,
    ].filter(Boolean).length;

    return {
      success: true,
      data: { result, source },
      message:
        filledCount > 0
          ? `Filled ${filledCount} field${filledCount === 1 ? "" : "s"} from the licence — review and edit if needed`
          : "Could not read licence details clearly — enter them manually",
    };
  } catch (error) {
    console.error("scanDrivingLicence:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to scan driving licence",
    };
  }
}

export async function draftJobReminderMessage(input: {
  jobType: UpcomingJobType;
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  vehicleLabel: string;
  scheduledDate: string;
  scheduledTime: string;
  location: string | null;
  channel: ReminderChannel;
}): Promise<AiActionResult<{ message: string; source: "ai" | "template" }>> {
  try {
    await requireAuth();

    const settings = await getSystemSettings();
    const scheduledDate = new Date(input.scheduledDate);
    if (Number.isNaN(scheduledDate.getTime())) {
      return { success: false, error: "Invalid schedule date" };
    }

    const draft = await generateReminderDraft(
      {
        jobType: input.jobType,
        bookingNumber: input.bookingNumber,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        vehicleLabel: input.vehicleLabel,
        scheduledDate,
        scheduledTime: input.scheduledTime,
        location: input.location,
        companyName: settings.company_name,
      },
      input.channel
    );

    return { success: true, data: draft };
  } catch (error) {
    console.error("draftJobReminderMessage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate reminder",
    };
  }
}

export async function summarizeDashboardToday(): Promise<
  AiActionResult<{ summary: string; source: "ai" | "template" }>
> {
  try {
    await requireAuth();

    const [data, settings] = await Promise.all([getDashboardData(), getSystemSettings()]);

    const todayJobs = data.upcomingJobs.filter((job) =>
      ["PICKUP_TODAY", "RETURN_TODAY"].includes(job.type)
    ).length;
    const tomorrowReminders = data.upcomingJobs.filter((job) =>
      ["PICKUP_REMINDER", "RETURN_REMINDER"].includes(job.type)
    ).length;

    const input: DashboardSummaryInput = {
      companyName: settings.company_name,
      operations: data.operations,
      financial: {
        todayRevenue: data.financial.todayRevenue,
        monthRevenue: data.financial.monthRevenue,
        monthExpenses: data.financial.monthExpenses,
        monthProfit: data.financial.monthProfit,
        outstandingBalances: data.financial.outstandingBalances,
      },
      compliance: {
        expiringInsurance7: data.compliance.expiringInsurance7,
        expiredInsurance: data.compliance.expiredInsurance,
        serviceDue: data.compliance.serviceDue,
      },
      upcomingJobs: {
        today: todayJobs,
        tomorrowReminders,
        overdue: data.operations.overdueRentals,
      },
      alertCount: data.alerts.length,
    };

    const result = await generateDashboardSummary(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("summarizeDashboardToday:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate summary",
    };
  }
}

// Helper export for typed job conversion if needed elsewhere
export { upcomingJobToReminderInput };

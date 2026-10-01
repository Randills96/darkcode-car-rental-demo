import { formatDate } from "@/lib/utils";
import { createChatCompletion } from "@/lib/ai/openai-client";
import { isAiEnabled } from "@/lib/ai/config";
import type { UpcomingJob, UpcomingJobType } from "@/lib/services/upcoming-jobs";

export type ReminderChannel = "whatsapp" | "sms";

export interface ReminderDraftInput {
  jobType: UpcomingJobType;
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  vehicleLabel: string;
  scheduledDate: Date;
  scheduledTime: string;
  location: string | null;
  companyName: string;
}

function isPickupType(type: UpcomingJobType) {
  return type === "PICKUP_TODAY" || type === "PICKUP_REMINDER";
}

function buildTemplateReminder(input: ReminderDraftInput, channel: ReminderChannel): string {
  const dateLabel = formatDate(input.scheduledDate);
  const action = isPickupType(input.jobType) ? "vehicle pickup" : "vehicle return";
  const when =
    input.jobType === "PICKUP_TODAY" || input.jobType === "RETURN_TODAY"
      ? "today"
      : "tomorrow";
  const location = input.location ? ` Location: ${input.location}.` : "";

  if (channel === "sms") {
    return `Hi ${input.customerName}, ${input.companyName} reminder: ${action} ${when} (${dateLabel} ${input.scheduledTime}) for booking ${input.bookingNumber}. Vehicle: ${input.vehicleLabel}.${location} Call us if you need changes.`;
  }

  return `Hello ${input.customerName},\n\nThis is a friendly reminder from *${input.companyName}* about your *${action}* scheduled for *${when}*.\n\n📅 *Date:* ${dateLabel}\n⏰ *Time:* ${input.scheduledTime}\n🚗 *Vehicle:* ${input.vehicleLabel}\n📋 *Booking:* ${input.bookingNumber}${location ? `\n📍 *Location:* ${input.location}` : ""}\n\nPlease reply or call us if your plans have changed.\n\nThank you,\n${input.companyName}`;
}

export async function generateReminderDraft(
  input: ReminderDraftInput,
  channel: ReminderChannel
): Promise<{ message: string; source: "ai" | "template" }> {
  const template = buildTemplateReminder(input, channel);

  if (!isAiEnabled()) {
    return { message: template, source: "template" };
  }

  const action = isPickupType(input.jobType) ? "pickup" : "return";
  const timing =
    input.jobType === "PICKUP_TODAY" || input.jobType === "RETURN_TODAY"
      ? "today"
      : "tomorrow";

  try {
    const message = await createChatCompletion({
      temperature: 0.4,
      maxTokens: 350,
      messages: [
        {
          role: "system",
          content:
            "You write concise, polite customer reminder messages for a Sri Lankan car rental company. Keep tone professional and warm.",
        },
        {
          role: "user",
          content: `Write a ${channel === "whatsapp" ? "WhatsApp" : "SMS"} reminder for ${action} ${timing}.
Company: ${input.companyName}
Customer: ${input.customerName}
Booking: ${input.bookingNumber}
Vehicle: ${input.vehicleLabel}
Schedule: ${formatDate(input.scheduledDate)} at ${input.scheduledTime}
Location: ${input.location ?? "Not specified"}
Phone: ${input.customerPhone}

Rules:
- ${channel === "whatsapp" ? "Use light WhatsApp formatting (*bold* sparingly). Max ~6 short lines." : "Plain text only, max 320 characters."}
- Do not invent prices or policies.
- End with the company name.`,
        },
      ],
    });

    return { message: message.trim(), source: "ai" };
  } catch {
    return { message: template, source: "template" };
  }
}

export function upcomingJobToReminderInput(
  job: UpcomingJob,
  companyName: string
): ReminderDraftInput {
  return {
    jobType: job.type,
    bookingNumber: job.bookingNumber,
    customerName: job.customerName,
    customerPhone: job.customerPhone,
    vehicleLabel: job.vehicleLabel,
    scheduledDate: job.scheduledDate,
    scheduledTime: job.scheduledTime,
    location: job.location,
    companyName,
  };
}

export function toWhatsAppUrl(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  let normalized = digits;
  if (normalized.startsWith("0")) {
    normalized = `94${normalized.slice(1)}`;
  } else if (!normalized.startsWith("94")) {
    normalized = `94${normalized}`;
  }

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

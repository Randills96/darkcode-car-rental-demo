import { z } from "zod";
import { analyzeImageWithText, analyzeImagesWithText } from "@/lib/ai/openai-client";
import { isAiEnabled } from "@/lib/ai/config";
import { normalizeScannedNic, resolveLicenceExpiry } from "@/lib/ai/licence-text-parse";

const scanResultSchema = z.object({
  documentNumber: z.string().nullable().optional(),
  issueDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  documentTypeGuess: z
    .enum([
      "CUSTOMER_PHOTO",
      "DRIVING_LICENCE",
      "NIC",
      "ADDRESS_VERIFICATION",
      "REGISTRATION",
      "OTHER",
    ])
    .nullable()
    .optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  notes: z.string().nullable().optional(),
});

export type DocumentScanResult = z.infer<typeof scanResultSchema>;

function normalizeDate(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // Handle DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function sanitizeScanResult(raw: DocumentScanResult): DocumentScanResult {
  return {
    documentNumber: raw.documentNumber?.trim() || "",
    issueDate: normalizeDate(raw.issueDate),
    expiryDate: normalizeDate(raw.expiryDate),
    documentTypeGuess: raw.documentTypeGuess ?? undefined,
    confidence: raw.confidence ?? "medium",
    notes: raw.notes?.trim() || "",
  };
}

const licenceScanResultSchema = z.object({
  fullName: z.string().nullable().optional(),
  nic: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  drivingLicenceNumber: z.string().nullable().optional(),
  drivingLicenceIssueDate: z.string().nullable().optional(),
  drivingLicenceExpiry: z.string().nullable().optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  notes: z.string().nullable().optional(),
});

export type DrivingLicenceScanResult = z.infer<typeof licenceScanResultSchema>;

export { normalizeScannedNic } from "@/lib/ai/licence-text-parse";

function collapseSpaces(value: string) {
  return value.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, ", ").replace(/,\s*,+/g, ",").trim();
}

function cleanExtractedName(name: string): string {
  return name
    .replace(/^(\d+(\.\d+)?|name|surname|other names?|holder)[:.\s-]*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeLicenceScanResult(raw: DrivingLicenceScanResult): DrivingLicenceScanResult {
  const issued = normalizeDate(raw.drivingLicenceIssueDate);
  const expiry = normalizeDate(raw.drivingLicenceExpiry);

  let cleanName = raw.fullName ? cleanExtractedName(raw.fullName) : "";
  let cleanAddress = raw.address ? collapseSpaces(raw.address).replace(/^8[.\s-]*/, "").trim() : "";
  let cleanLicence = raw.drivingLicenceNumber
    ? raw.drivingLicenceNumber.replace(/^5[.\s-]*/, "").replace(/[\s-]/g, "").toUpperCase()
    : "";
  let cleanNic = raw.nic ? normalizeScannedNic(raw.nic) : "";

  return {
    fullName: cleanName,
    nic: cleanNic,
    address: cleanAddress,
    drivingLicenceNumber: cleanLicence,
    drivingLicenceExpiry: resolveLicenceExpiry(issued, expiry),
    confidence: raw.confidence ?? "medium",
    notes: raw.notes?.trim() || "",
  };
}

function extractJsonPayload(text: string): unknown {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

export async function scanDrivingLicenceImages(options: {
  images: Array<{ buffer: Buffer; mimeType: string; label: string }>;
}): Promise<{ result: DrivingLicenceScanResult; source: "ai" }> {
  if (!isAiEnabled()) {
    throw new Error(
      "Document scanning requires GEMINI_API_KEY (recommended) or OPENAI_API_KEY in your environment."
    );
  }

  if (options.images.length === 0) {
    throw new Error("Upload a driving licence photo first");
  }

  const sideHint = options.images
    .map((image, index) => `Image ${index + 1} is the ${image.label} of the driving licence.`)
    .join(" ");

  const raw = await analyzeImagesWithText({
    json: true,
    maxTokens: 1200,
    systemPrompt:
      "You are an expert OCR vision engine specialized in Sri Lankan Driving Licences (Department of Motor Traffic - DMT). You extract structured customer details with 100% accuracy following standard DMT numbered fields. Return strict JSON only without any markdown formatting or commentary.",
    userPrompt: `${sideHint}
This is a Sri Lankan Driving Licence (polycarbonate card with chip or new smart card).
The FRONT of the card contains all identity and personal data.
The BACK of the card contains vehicle class categories and endorsement tables — DO NOT copy back-table codes or dates into personal fields.

Carefully identify and read the following standard DMT numbered fields on the FRONT:
- Field 1 = Surname (e.g. PERERA, JAYAWARDHANA)
- Field 1.2 = Other Names or Given Names or Initials (e.g. KASUN CHAMARA, or W. M. K.)
- fullName: Combine 1.2 and 1 in order (e.g. "KASUN CHAMARA RATHNAWEERA" or "W. M. K. PERERA"). Keep all initials and proper spelling. Do NOT include field numbers 1 or 1.2 or the word "Surname". Do NOT put the address in the name.
- Field 8 = Address (Place of Residence): Read the full address lines printed below the name. Join them cleanly into a single line separated by commas (e.g. "No. 45/2, Temple Road, Maharagama"). Do not include the field number 8.
- Field 4c / NIC: National Identity Card number. Look for 12 digits (e.g. 199012345678) or 9 digits ending with 'V' or 'X' (e.g. 901234567V). If 4c says "DMT", locate the NIC number on the front near the photo or labels.
- Field 5 = Driving Licence Number: Usually begins with a capital letter followed by 7 or 8 digits (e.g. B1234567).
- Field 4a = Date of Issue: Format as YYYY-MM-DD in drivingLicenceIssueDate.
- Field 4b = Date of Expiry: Format as YYYY-MM-DD in drivingLicenceExpiry. (NOTE: If 4b is blank or not printed, Sri Lankan DMT licence expiry is exactly 8 years after Field 4a issue date).
- Field 3 = Date of Birth. NEVER use Date of Birth as the licence expiry.
- confidence: "high" if clear, "medium" if slightly blurry or glare present, "low" if unreadable.
- notes: Note any observations, such as "Read from 2009 laminated card" or "Glare on NIC field".

Return strict JSON with exactly these keys:
{
  "fullName": string | null,
  "nic": string | null,
  "address": string | null,
  "drivingLicenceNumber": string | null,
  "drivingLicenceIssueDate": string | null,
  "drivingLicenceExpiry": string | null,
  "confidence": "high" | "medium" | "low",
  "notes": string | null
}
If any field cannot be determined, use null.`,
    images: options.images.map((image) => ({
      base64: image.buffer.toString("base64"),
      mimeType: image.mimeType,
    })),
  });

  let parsed: unknown;
  try {
    parsed = extractJsonPayload(raw);
  } catch (err) {
    console.error("Failed to parse driving licence scan JSON:", raw, err);
    throw new Error("Could not parse driving licence scan results");
  }

  const validated = licenceScanResultSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("Driving licence scan returned invalid data structure");
  }

  return { result: sanitizeLicenceScanResult(validated.data), source: "ai" };
}

export async function scanCustomerDocumentImage(options: {
  buffer: Buffer;
  mimeType: string;
  documentType?: string;
}): Promise<{ result: DocumentScanResult; source: "ai" }> {
  if (!isAiEnabled()) {
    throw new Error(
      "Document scanning requires GEMINI_API_KEY (recommended) or OPENAI_API_KEY in your environment."
    );
  }

  const documentHint = options.documentType
    ? `The user selected document type: ${options.documentType}.`
    : "Infer the most likely document type.";

  const raw = await analyzeImageWithText({
    json: true,
    systemPrompt:
      "You extract structured data from Sri Lankan customer identity and vehicle documents for a car rental back office. Return strict JSON only without markdown formatting.",
    userPrompt: `${documentHint} Extract documentNumber, issueDate (YYYY-MM-DD), expiryDate (YYYY-MM-DD), documentTypeGuess (CUSTOMER_PHOTO, DRIVING_LICENCE, NIC, ADDRESS_VERIFICATION, REGISTRATION, OTHER), confidence (high|medium|low), and short notes if anything is unclear. For NIC use formats like 199012345678 or 901234567V. If a field is missing or unreadable, use null.`,
    imageBase64: options.buffer.toString("base64"),
    mimeType: options.mimeType,
  });

  let parsed: unknown;
  try {
    parsed = extractJsonPayload(raw);
  } catch {
    throw new Error("Could not parse document scan results");
  }

  const validated = scanResultSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("Document scan returned invalid data");
  }

  return { result: sanitizeScanResult(validated.data), source: "ai" };
}

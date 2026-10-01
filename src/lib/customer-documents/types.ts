export const CUSTOMER_DOCUMENT_TYPES = [
  { value: "CUSTOMER_PHOTO", label: "Customer Photo" },
  { value: "DRIVING_LICENCE", label: "Driving Licence" },
  { value: "NIC", label: "NIC / ID Card" },
  { value: "ADDRESS_VERIFICATION", label: "Address Verification" },
  { value: "REGISTRATION", label: "Registration" },
  { value: "OTHER", label: "Other" },
] as const;

export type CustomerDocumentTypeValue =
  (typeof CUSTOMER_DOCUMENT_TYPES)[number]["value"];

export const TWO_SIDED_DOCUMENT_TYPES = ["DRIVING_LICENCE", "NIC"] as const;

export type TwoSidedDocumentType = (typeof TWO_SIDED_DOCUMENT_TYPES)[number];

export function isTwoSidedDocumentType(type: string): type is TwoSidedDocumentType {
  return TWO_SIDED_DOCUMENT_TYPES.includes(type as TwoSidedDocumentType);
}

export const DOCUMENT_SIDE_NOTES = {
  FRONT: "Front side",
  BACK: "Back side",
} as const;

export function buildDocumentSideNote(type: string, side: "FRONT" | "BACK"): string {
  const label =
    type === "DRIVING_LICENCE"
      ? "Driving licence"
      : type === "NIC"
        ? "NIC"
        : "Document";
  return `${label} ${DOCUMENT_SIDE_NOTES[side].toLowerCase()}`;
}

export function getCustomerDocumentTypeLabel(type: string, notes?: string | null): string {
  const base =
    CUSTOMER_DOCUMENT_TYPES.find((entry) => entry.value === type)?.label ??
    type.replace(/_/g, " ");

  if (!notes || !isTwoSidedDocumentType(type)) {
    return base;
  }

  const normalized = notes.toLowerCase();
  if (normalized.includes("front")) return `${base} (Front)`;
  if (normalized.includes("back")) return `${base} (Back)`;
  return base;
}

export type ParsedLicenceScan = {
  fullName?: string | null;
  nic?: string | null;
  address?: string | null;
  drivingLicenceNumber?: string | null;
  drivingLicenceExpiry?: string | null;
  confidence?: "high" | "medium" | "low";
  notes?: string | null;
};

const HEADER_NAME =
  /^(democratic|socialist|republic|of|sri|lanka|driving|licen[cs]e|identity|motor|traffic|department|holder|photograph|categories?|class|blood|signature|other|names?|surname|family|given)$/i;

const NAME_LABEL =
  /\b(other names?|surname|family name|given names?|first name|last name|full name|name of holder|name)\b/gi;

const ADDRESS_HINT =
  /\b(road|rd\.?|lane|ln\.?|street|st\.?|ave|avenue|mawatha|mw\.?|place|garden|watta|colombo|galle|kandy|gampaha|negombo|matara|kurunegala|kalutara|jaffna|anuradhapura|ratnapura|badulla|nuwara|eliya|no\.?|n[o0]\.?)\b/i;

const SINHALA_TEXT = /[\u0D80-\u0DFF]{2,}/;

const CLASS_CODE = /^(?:A1?|B1?|C1?|CE|D1?|DE|G1?|J|PT)$/i;

type FieldId = "1" | "1.2" | "3" | "4a" | "4b" | "4c" | "5" | "8" | "9";

function collapseSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeScannedNic(value: string) {
  return value.toUpperCase().replace(/[\s-]/g, "");
}

export function addYearsToIsoDate(iso: string, years: number) {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString().slice(0, 10);
}

export function resolveLicenceExpiry(issueIso: string, printedExpiryIso: string) {
  const plus8 = issueIso ? addYearsToIsoDate(issueIso, 8) : "";
  if (printedExpiryIso && plus8 && printedExpiryIso !== plus8) return printedExpiryIso;
  return plus8 || printedExpiryIso;
}

function toIsoDate(value: string) {
  const trimmed = collapseSpaces(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const dotted = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/);
  if (dotted) {
    const day = dotted[1].padStart(2, "0");
    const month = dotted[2].padStart(2, "0");
    const year = dotted[3].length === 2 ? (Number(dotted[3]) > 30 ? `19${dotted[3]}` : `20${dotted[3]}`) : dotted[3];
    const iso = `${year}-${month}-${day}`;
    if (!Number.isNaN(new Date(`${iso}T00:00:00Z`).getTime()) && Number(month) <= 12 && Number(day) <= 31) {
      return iso;
    }
  }

  const isoish = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (isoish) {
    return `${isoish[1]}-${isoish[2].padStart(2, "0")}-${isoish[3].padStart(2, "0")}`;
  }

  return "";
}

function latinLetters(value: string) {
  return collapseSpaces(value.replace(/[^\x00-\x7F]/g, " ").replace(/[^A-Za-z .'-]/g, " "));
}

function looksLikeNic(value: string) {
  return /^(?:\d{12}|\d{9}[VX])$/i.test(value);
}

function looksLikeDateLine(value: string) {
  return /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(collapseSpaces(value));
}

function hasDateToken(value: string) {
  return /\b\d{1,4}[./-]\d{1,2}[./-]\d{2,4}\b/.test(value);
}

function compactAlnum(value: string) {
  return collapseSpaces(value).replace(/\s+/g, "");
}

function looksLikeLicenceNumber(value: string) {
  const compact = compactAlnum(value);
  return /^[A-Z]\d{5,8}$/i.test(compact);
}

function looksLikeNameRest(value: string) {
  const text = collapseSpaces(value);
  if (!text) return true;
  if (ADDRESS_HINT.test(text) || /^[\d/,]/.test(text)) return false;
  if (looksLikeDateLine(text) || looksLikeNic(normalizeScannedNic(text))) return false;
  return /[A-Za-z]/.test(text);
}

function looksLikeAddressLine(value: string) {
  if (ADDRESS_HINT.test(value)) return true;
  if (SINHALA_TEXT.test(value) && (/\d/.test(value) || /[,./]/.test(value))) return true;
  return false;
}

function looksLikeClassTable(value: string) {
  const tokens = collapseSpaces(value).split(" ");
  const codes = tokens.filter((token) => CLASS_CODE.test(token));
  return codes.length >= 3;
}

function isHeaderLine(value: string) {
  return /^(democratic|socialist republic|driving licen|department of motor|commissioner general|motor traffic)/i.test(
    collapseSpaces(value)
  );
}

function classifyLine(line: string): { id: FieldId | null; rest: string } {
  const text = collapseSpaces(line);
  if (looksLikeDateLine(text) || /^12[./-]\d/.test(text)) {
    return { id: null, rest: text };
  }

  const residence = text.match(/^(?:place of residence|permanent address|address)\s*[:.#-]*\s*(.*)$/i);
  if (residence) {
    return { id: "8", rest: residence[1] || "" };
  }

  const field12 = text.match(/^(?:1\s*[.,]\s*2|[lI]\s*[.,]\s*2)\s*[.:\-]?\s*(.*)$/i);
  if (field12 && looksLikeNameRest(field12[1])) {
    return { id: "1.2", rest: field12[1] || "" };
  }

  const field12Ocr = text.match(/^12\s*[.:\-]?\s*(.*)$/);
  if (field12Ocr && looksLikeNameRest(field12Ocr[1]) && !looksLikeAddressLine(text)) {
    return { id: "1.2", rest: field12Ocr[1] || "" };
  }

  const field4 = text.match(/^4\s*[.,]?\s*([abcd])\s*[.:\-]?\s*(.*)$/i);
  if (field4) {
    return { id: `4${field4[1].toLowerCase()}` as FieldId, rest: field4[2] || "" };
  }

  const field3 = text.match(/^3(?!\d)\s*[.:\-]?\s*(.*)$/);
  if (field3 && (!field3[1] || looksLikeDateLine(field3[1]) || hasDateToken(field3[1]))) {
    return { id: "3", rest: field3[1] || "" };
  }

  const field5 = text.match(/^5(?!\d)\s*[.:\-]?\s*(.*)$/);
  if (field5 && (!field5[1] || looksLikeLicenceNumber(field5[1]) || /^\d{5,8}$/.test(compactAlnum(field5[1])))) {
    return { id: "5", rest: field5[1] || "" };
  }

  const field8 = text.match(/^8(?!\d)\s*[.:]?\s*(.*)$/);
  if (field8 && !/^blood/i.test(text)) {
    return { id: "8", rest: field8[1] || "" };
  }

  const field9 = text.match(/^9(?!\d)\s*[.:\-]?\s*(.*)$/);
  if (field9 && !ADDRESS_HINT.test(field9[1] || "")) {
    return { id: "9", rest: field9[1] || "" };
  }

  const field1 = text.match(/^1(?!\s*[.,]?\s*2)(?!\d)\s*[.:\-]?\s*(.*)$/);
  if (field1 && looksLikeNameRest(field1[1]) && !looksLikeDateLine(field1[1])) {
    return { id: "1", rest: field1[1] || "" };
  }

  return { id: null, rest: text };
}

function canContinue(current: FieldId, line: string) {
  if (classifyLine(line).id) return false;
  if (isHeaderLine(line) || looksLikeClassTable(line)) return false;
  if (/^(?:date of|issued|expir|nic|name|licen|signature|blood)/i.test(line)) return false;

  if (current === "1" || current === "1.2") {
    return looksLikeNameRest(line) && !looksLikeAddressLine(line);
  }
  if (current === "8") {
    if (looksLikeDateLine(line) || looksLikeNic(normalizeScannedNic(line))) return false;
    if (looksLikeLicenceNumber(line)) return false;
    return true;
  }
  return false;
}

function collectFields(text: string) {
  const fields: Record<string, string[]> = {};
  let current: FieldId | null = null;

  const push = (id: FieldId, value?: string) => {
    if (!fields[id]) fields[id] = [];
    if (value) fields[id].push(value);
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = collapseSpaces(rawLine);
    if (!line || isHeaderLine(line) || looksLikeClassTable(line)) {
      if (looksLikeClassTable(line)) current = null;
      continue;
    }

    const classified = classifyLine(line);
    if (classified.id) {
      current = classified.id;
      push(current, classified.rest);
      continue;
    }

    if ((current === "1" || current === "1.2") && looksLikeAddressLine(line)) {
      current = "8";
      push("8", line);
      continue;
    }

    if (current && canContinue(current, line)) {
      push(current, line);
      continue;
    }

    current = null;
  }

  return Object.fromEntries(
    Object.entries(fields).map(([key, lines]) => [
      key,
      key === "8"
        ? lines.map((line) => collapseSpaces(line)).filter(Boolean).join("\n")
        : collapseSpaces(lines.join(" ")),
    ])
  ) as Partial<Record<FieldId, string>>;
}

function cleanName(value: string) {
  const withoutLabels = latinLetters(value.replace(NAME_LABEL, " "));
  const words = withoutLabels
    .split(" ")
    .map((word) => word.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, ""))
    .filter((word) => (word.length > 1 || /^[A-Za-z]$/.test(word)) && !HEADER_NAME.test(word));
  return words.join(" ").replace(/\s+/g, " ").trim();
}

function composeFullName(surname: string, otherNames: string) {
  const given = cleanName(otherNames);
  const family = cleanName(surname);
  if (given && family) {
    const givenUpper = given.toUpperCase();
    const familyUpper = family.toUpperCase();
    if (givenUpper.includes(familyUpper)) return given;
    return `${given} ${family}`.replace(/\s+/g, " ").trim();
  }
  return given || family;
}

function fallbackEnglishName(text: string) {
  const candidates = text
    .split(/\r?\n/)
    .map((line) => collapseSpaces(line))
    .filter((line) => !/^(address|residence|date|nic|licen|issue|expir|name)\b/i.test(line))
    .filter((line) => !ADDRESS_HINT.test(line) && !isHeaderLine(line) && !looksLikeClassTable(line))
    .map((line) => cleanName(line))
    .filter((line) => line.split(" ").length >= 2 && line.length >= 6 && line.length <= 250);
  return candidates.sort((a, b) => b.length - a.length)[0] || "";
}

function extractDateFrom(value?: string) {
  if (!value) return "";
  const token = value.match(/\b(\d{1,4}[./-]\d{1,2}[./-]\d{2,4})\b/);
  return token ? toIsoDate(token[1]) : "";
}

function extractNicValue(field4c?: string, wholeText = "") {
  const fromField = normalizeScannedNic(field4c || "");
  if (looksLikeNic(fromField)) return fromField;

  const fieldMatch = (field4c || "").match(/([0-9][0-9\s-]{8,14}[0-9VvXx])/);
  if (fieldMatch?.[1] && looksLikeNic(normalizeScannedNic(fieldMatch[1]))) {
    return normalizeScannedNic(fieldMatch[1]);
  }

  const labeled = wholeText.match(
    /(?:n\.?\s*i\.?\s*c\.?|national identity(?: card)?(?: no| number)?)\s*[:.#-]*\s*([0-9][0-9\s-]{8,14}[0-9VvXx])/i
  );
  if (labeled?.[1] && looksLikeNic(normalizeScannedNic(labeled[1]))) {
    return normalizeScannedNic(labeled[1]);
  }

  const newFormat = wholeText.match(/\b((?:19|20)\d{10})\b/);
  if (newFormat?.[1]) return newFormat[1];
  const oldFormat = wholeText.match(/\b(\d{9}\s*[VvXx])\b/);
  if (oldFormat?.[1]) return normalizeScannedNic(oldFormat[1]);
  return "";
}

function extractLicenceValue(field5?: string, wholeText = "") {
  if (field5 && looksLikeLicenceNumber(field5)) {
    return compactAlnum(field5).toUpperCase();
  }
  const labeled = wholeText.match(
    /(?:driving\s*)?licen[cs]e\s*(?:no|number|#)?\s*[:.#-]*\s*([A-Z]\s*\d{5,8})/i
  );
  if (labeled?.[1]) return compactAlnum(labeled[1]).toUpperCase();

  const matches = [...wholeText.matchAll(/\b([A-Z]\s*\d{5,8})\b/gi)]
    .map((match) => compactAlnum(match[1]).toUpperCase())
    .filter((licence) => !looksLikeNic(licence));
  return matches[0] || "";
}

function cleanAddress(value: string) {
  const cut = value
    .replace(/\b(?:signature|blood group|vehicle categories|categories)\b[\s\S]*$/i, "")
    .replace(/[|]{2,}/g, " ");
  const lines = cut
    .split(/\r?\n/)
    .map((line) => collapseSpaces(line))
    .filter(Boolean);
  if (lines[0]) {
    lines[0] = lines[0].replace(/^8(?:\s*[.:]\s*|\s+)/, "");
  }
  return lines
    .filter((line) => line && !/^(?:date of|issued|expir|nic|name|licen|signature|blood)/i.test(line))
    .filter((line) => line && !(classifyLine(line).id && classifyLine(line).id !== "8"))
    .filter((line) => !looksLikeClassTable(line))
    .join("\n")
    .trim();
}

function extractAddressValue(field8: string | undefined, wholeText: string) {
  const fromField = field8 ? cleanAddress(field8) : "";
  if (fromField.length >= 5 || (fromField && SINHALA_TEXT.test(fromField))) return fromField;

  const labeled = wholeText.match(
    /(?:address|residence|place of residence|permanent address)\s*[:.#-]*\s*([^\n]+(?:\n[^\n]+){0,6})/i
  );
  if (labeled?.[1]) {
    const cleaned = cleanAddress(labeled[1]);
    if (cleaned.length >= 5 || SINHALA_TEXT.test(cleaned)) return cleaned;
  }

  return "";
}

function addressScore(value?: string | null) {
  if (!value) return 0;
  let score = value.length;
  if (ADDRESS_HINT.test(value)) score += 40;
  if (SINHALA_TEXT.test(value)) score += 30;
  if (/\d/.test(value)) score += 10;
  if (looksLikeClassTable(value)) score -= 80;
  return score;
}

function filledCount(result: ParsedLicenceScan) {
  return [result.fullName, result.nic, result.address, result.drivingLicenceNumber].filter(Boolean).length;
}

export function parseDrivingLicenceText(text: string): ParsedLicenceScan {
  const cleaned = text.replace(/\u0000/g, " ").replace(/[|]/g, "I");
  const fields = collectFields(cleaned);
  const labeledName = cleaned.match(
    /(?:name of (?:the )?holder|holder'?s name|full name|^name)\s*[:.#-]*\s*([^\n]+)/im
  );
  const fullName =
    composeFullName(fields["1"] || "", fields["1.2"] || "") ||
    (labeledName?.[1] ? cleanName(labeledName[1]) : "") ||
    fallbackEnglishName(cleaned);

  const issued =
    extractDateFrom(fields["4a"]) ||
    extractDateFrom(cleaned.match(/(?:date of issue|issued(?: on)?)\s*[:.#-]*\s*([0-9./-]+)/i)?.[1] || "");
  const printedExpiry =
    extractDateFrom(fields["4b"]) ||
    extractDateFrom(
      cleaned.match(
        /(?:date of expiry|expir(?:y|ation)|valid\s*(?:till|until|to|upto))\s*[:.#-]*\s*([0-9]{1,4}[./-][0-9]{1,2}[./-][0-9]{2,4})/i
      )?.[1] || ""
    );

  const result: ParsedLicenceScan = {
    fullName,
    nic: extractNicValue(fields["4c"], cleaned),
    address: extractAddressValue(fields["8"], cleaned),
    drivingLicenceNumber: extractLicenceValue(fields["5"], cleaned),
    drivingLicenceExpiry: resolveLicenceExpiry(issued, printedExpiry),
    confidence: "medium",
    notes: "",
  };

  const count = filledCount(result);
  result.confidence = count >= 3 ? "high" : count >= 1 ? "medium" : "low";
  if (count === 0) {
    result.notes = "Could not read printed licence fields from the photo";
  }
  return result;
}

export function mergeLicenceScanResults(
  first: ParsedLicenceScan,
  second: ParsedLicenceScan
): ParsedLicenceScan {
  const merged: ParsedLicenceScan = {
    fullName: (first.fullName || "").length >= (second.fullName || "").length ? first.fullName : second.fullName,
    nic: first.nic || second.nic,
    address:
      addressScore(first.address) >= addressScore(second.address)
        ? first.address || second.address
        : second.address,
    drivingLicenceNumber: first.drivingLicenceNumber || second.drivingLicenceNumber,
    drivingLicenceExpiry: first.drivingLicenceExpiry || second.drivingLicenceExpiry,
    confidence: first.confidence || second.confidence,
    notes: [first.notes, second.notes].filter(Boolean).join(" ").trim(),
  };
  const count = filledCount(merged);
  merged.confidence = count >= 3 ? "high" : count >= 1 ? "medium" : "low";
  return merged;
}

export function licenceScanFilledCount(result: ParsedLicenceScan) {
  return filledCount(result);
}

export function mergeLicencePageTexts(pages: string[]): ParsedLicenceScan {
  let merged: ParsedLicenceScan = {};
  for (const page of pages) {
    merged = mergeLicenceScanResults(merged, parseDrivingLicenceText(page));
  }
  if (pages.length > 1) {
    merged = mergeLicenceScanResults(merged, parseDrivingLicenceText(pages.join("\n\n")));
  }
  return merged;
}

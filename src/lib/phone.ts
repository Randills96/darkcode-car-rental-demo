/** Sri Lankan mobile numbers are stored as 0771234567. */
export function toInternationalDigits(phone: string, countryCode = "94"): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return `${countryCode}${digits.slice(1)}`;
  if (digits.startsWith(countryCode)) return digits;
  return `${countryCode}${digits}`;
}

export function toTelUrl(phone: string): string | null {
  const international = toInternationalDigits(phone);
  return international ? `tel:+${international}` : null;
}

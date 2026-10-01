import { prisma } from "@/lib/db";
import { setDefaultCurrencySymbol } from "@/lib/utils";
import type { SettingsFormValues } from "@/lib/validations/settings";
import { COMPANY_NAME } from "@/lib/branding";

const SETTING_KEYS: (keyof SettingsFormValues)[] = [
  "rental_day_start_time",
  "default_included_km",
  "default_included_km_extra_day",
  "currency",
  "currency_symbol",
  "block_blacklisted_booking",
  "company_name",
  "default_owner_commission",
  "default_broker_commission",
  "annual_fee_amount",
  "bank_name",
  "bank_account_name",
  "bank_account_number",
  "bank_branch",
];

export const ANNUAL_FEE_SETTING_KEYS = [
  "annual_fee_amount",
  "bank_name",
  "bank_account_name",
  "bank_account_number",
  "bank_branch",
] as const satisfies readonly (keyof SettingsFormValues)[];

export function hideAnnualFeeSettings(settings: SettingsFormValues): SettingsFormValues {
  return {
    ...settings,
    annual_fee_amount: 0,
    bank_name: "",
    bank_account_name: "",
    bank_account_number: "",
    bank_branch: "",
  };
}

export async function getSystemSettings(): Promise<SettingsFormValues> {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: [...SETTING_KEYS] } },
  });

  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const result: SettingsFormValues = {
    rental_day_start_time: map.rental_day_start_time ?? "19:00",
    default_included_km: Number(map.default_included_km ?? "200"),
    default_included_km_extra_day: Number(map.default_included_km_extra_day ?? "200"),
    currency: map.currency ?? "LKR",
    currency_symbol: map.currency_symbol ?? "Rs.",
    block_blacklisted_booking: (map.block_blacklisted_booking ?? "false") as "true" | "false",
    company_name: map.company_name ?? COMPANY_NAME,
    default_owner_commission: Number(map.default_owner_commission ?? "30000"),
    default_broker_commission: Number(map.default_broker_commission ?? "5000"),
    annual_fee_amount: Number(map.annual_fee_amount ?? "30000"),
    bank_name: map.bank_name ?? "",
    bank_account_name: map.bank_account_name ?? "",
    bank_account_number: map.bank_account_number ?? "",
    bank_branch: map.bank_branch ?? "",
  };
  setDefaultCurrencySymbol(result.currency_symbol);
  return result;
}

export async function updateSystemSettings(values: Partial<SettingsFormValues>) {
  const entries = (Object.entries(values) as [keyof SettingsFormValues, string | number | undefined][]).filter(
    (entry): entry is [keyof SettingsFormValues, string | number] =>
      SETTING_KEYS.includes(entry[0]) && entry[1] !== undefined
  );

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
  );
}

export async function getSettingsMetadata() {
  return prisma.systemSetting.findMany({
    where: { key: { in: [...SETTING_KEYS] } },
    select: { key: true, description: true, updatedAt: true },
    orderBy: { key: "asc" },
  });
}

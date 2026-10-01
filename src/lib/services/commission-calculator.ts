import { decimalToNumber } from "@/lib/utils";

export interface BrokerCommissionInput {
  brokerId: string | null;
  brokerCommissionPerDay: number | null;
  brokerCommissionPerExtraKm: number | null;
  rentalDays: number;
  extraKm: number;
  fallbackFlatCommission?: number;
}

export interface BrokerCommissionResult {
  commissionPerDay: number;
  commissionPerExtraKm: number;
  billableDays: number;
  billableExtraKm: number;
  commissionAmount: number;
  usesFormula: boolean;
}

export interface OwnerSettlementInput {
  ownershipType: string | null | undefined;
  ownerId: string | null | undefined;
  ownerDailyRate: number | null;
  ownerExtraKmRate: number | null;
  customerDailyRate: number;
  customerExtraKmRate: number;
  rentalDays: number;
  extraKm: number;
  finalTotal: number;
  fallbackFlatCommission?: number;
}

export interface OwnerSettlementResult {
  ownerDailyRate: number;
  ownerExtraKmRate: number;
  billableDays: number;
  billableExtraKm: number;
  ownerPayable: number;
  companyCommission: number;
  rentalRevenue: number;
  usesFormula: boolean;
}

export function calculateBrokerCommission(input: BrokerCommissionInput): BrokerCommissionResult | null {
  if (!input.brokerId) return null;

  const perDay = input.brokerCommissionPerDay ?? 0;
  const perKm = input.brokerCommissionPerExtraKm ?? 0;
  const usesFormula = perDay > 0 || perKm > 0;

  if (usesFormula) {
    const commissionAmount = perDay * input.rentalDays + perKm * input.extraKm;
    return {
      commissionPerDay: perDay,
      commissionPerExtraKm: perKm,
      billableDays: input.rentalDays,
      billableExtraKm: input.extraKm,
      commissionAmount: Math.max(0, commissionAmount),
      usesFormula: true,
    };
  }

  const flat = input.fallbackFlatCommission ?? 0;
  return {
    commissionPerDay: 0,
    commissionPerExtraKm: 0,
    billableDays: input.rentalDays,
    billableExtraKm: input.extraKm,
    commissionAmount: Math.max(0, flat),
    usesFormula: false,
  };
}

export function calculateOwnerSettlement(input: OwnerSettlementInput): OwnerSettlementResult | null {
  if (!input.ownerId) return null;

  const ownerDaily = input.ownerDailyRate;
  const ownerExtra = input.ownerExtraKmRate;
  const usesFormula = ownerDaily != null && ownerExtra != null;

  if (usesFormula) {
    const ownerPayable = ownerDaily * input.rentalDays + ownerExtra * input.extraKm;
    const companyCommission =
      Math.max(0, input.customerDailyRate - ownerDaily) * input.rentalDays +
      Math.max(0, input.customerExtraKmRate - ownerExtra) * input.extraKm;

    return {
      ownerDailyRate: ownerDaily,
      ownerExtraKmRate: ownerExtra,
      billableDays: input.rentalDays,
      billableExtraKm: input.extraKm,
      ownerPayable: Math.max(0, ownerPayable),
      companyCommission: Math.max(0, companyCommission),
      rentalRevenue: input.finalTotal,
      usesFormula: true,
    };
  }

  const flatCommission = Math.max(0, input.fallbackFlatCommission ?? 0);
  // A large company-keep setting (e.g. Rs. 30,000) must not wipe a small daily hire.
  if (flatCommission <= 0 || flatCommission >= input.finalTotal) {
    return {
      ownerDailyRate: 0,
      ownerExtraKmRate: 0,
      billableDays: input.rentalDays,
      billableExtraKm: input.extraKm,
      ownerPayable: Math.max(0, input.finalTotal),
      companyCommission: 0,
      rentalRevenue: input.finalTotal,
      usesFormula: false,
    };
  }

  return {
    ownerDailyRate: 0,
    ownerExtraKmRate: 0,
    billableDays: input.rentalDays,
    billableExtraKm: input.extraKm,
    ownerPayable: Math.max(0, input.finalTotal - flatCommission),
    companyCommission: flatCommission,
    rentalRevenue: input.finalTotal,
    usesFormula: false,
  };
}

export function vehiclePaysAnOwner(input: {
  ownerId?: string | null;
  ownershipType?: string | null;
}): boolean {
  return Boolean(input.ownerId) || input.ownershipType === "PERSONALLY_OWNED" || input.ownershipType === "THIRD_PARTY_OWNED";
}

export function deriveOwnerRatesFromCustomerRates(options: {
  customerDailyRate: number;
  customerExtraKmRate: number;
  ownerDailyRate?: number | null;
  ownerExtraKmRate?: number | null;
}) {
  const ownerDailyRate = options.ownerDailyRate ?? null;
  const ownerExtraKmRate = options.ownerExtraKmRate ?? null;

  const companyDailyMargin =
    ownerDailyRate != null ? Math.max(0, options.customerDailyRate - ownerDailyRate) : null;
  const companyExtraKmMargin =
    ownerExtraKmRate != null ? Math.max(0, options.customerExtraKmRate - ownerExtraKmRate) : null;

  return { ownerDailyRate, ownerExtraKmRate, companyDailyMargin, companyExtraKmMargin };
}

export function rentalCommissionFieldsFromForm(options: {
  brokerId?: string | null;
  brokerCommissionPerDay?: number | null;
  brokerCommissionPerExtraKm?: number | null;
  vehicleOwnershipType?: string | null;
  ownerId?: string | null;
  ownerDailyRate?: number | null;
  ownerExtraKmRate?: number | null;
}) {
  const hasBroker = Boolean(options.brokerId);
  const paysOwner = vehiclePaysAnOwner({
    ownerId: options.ownerId,
    ownershipType: options.vehicleOwnershipType,
  });

  return {
    brokerCommissionPerDay: hasBroker ? (options.brokerCommissionPerDay ?? 0) : null,
    brokerCommissionPerExtraKm: hasBroker ? (options.brokerCommissionPerExtraKm ?? 0) : null,
    ownerDailyRate: paysOwner || options.ownerDailyRate != null ? (options.ownerDailyRate ?? null) : null,
    ownerExtraKmRate: paysOwner || options.ownerExtraKmRate != null ? (options.ownerExtraKmRate ?? null) : null,
  };
}

export function decimalField(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return decimalToNumber(value);
}

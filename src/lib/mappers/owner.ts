import type { OwnerFormValues } from "@/lib/validations/owner";

export function ownerToFormValues(owner: {
  name: string;
  nic: string | null;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankBranch: string | null;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE";
}): OwnerFormValues {
  return {
    name: owner.name,
    nic: owner.nic ?? "",
    phone: owner.phone,
    whatsapp: owner.whatsapp ?? "",
    email: owner.email ?? "",
    address: owner.address ?? "",
    bankName: owner.bankName ?? "",
    bankAccount: owner.bankAccount ?? "",
    bankBranch: owner.bankBranch ?? "",
    notes: owner.notes ?? "",
    status: owner.status,
  };
}

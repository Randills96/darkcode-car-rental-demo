import type { CustomerFormValues } from "@/lib/validations/customer";
import { toDateInputValue } from "@/lib/utils";

export function customerToFormValues(customer: {
  fullName: string;
  nic: string;
  passportNumber: string | null;
  phone: string;
  whatsapp: string | null;
  address: string;
  drivingLicenceNumber: string | null;
  drivingLicenceExpiry: Date | string | null;
  emergencyContact: string | null;
  notes: string | null;
}): CustomerFormValues {
  return {
    fullName: customer.fullName ?? "",
    nic: customer.nic ?? "",
    passportNumber: customer.passportNumber ?? "",
    phone: customer.phone ?? "",
    whatsapp: customer.whatsapp ?? "",
    address: customer.address ?? "",
    drivingLicenceNumber: customer.drivingLicenceNumber ?? "",
    drivingLicenceExpiry: toDateInputValue(customer.drivingLicenceExpiry),
    emergencyContact: customer.emergencyContact ?? "",
    notes: customer.notes ?? "",
  };
}

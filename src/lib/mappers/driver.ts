import type { DriverFormValues } from "@/lib/validations/driver";
import { decimalToNumber, toDateInputValue } from "@/lib/utils";

export function driverToFormValues(driver: {
  name: string;
  nic: string;
  phone: string;
  whatsapp: string | null;
  address: string | null;
  drivingLicence: string;
  licenceExpiry: Date | string | null;
  dailyPayment: { toString(): string };
  status: "ACTIVE" | "INACTIVE";
  notes: string | null;
}): DriverFormValues {
  return {
    name: driver.name ?? "",
    nic: driver.nic ?? "",
    phone: driver.phone ?? "",
    whatsapp: driver.whatsapp ?? "",
    address: driver.address ?? "",
    drivingLicence: driver.drivingLicence ?? "",
    licenceExpiry: toDateInputValue(driver.licenceExpiry),
    dailyPayment: decimalToNumber(driver.dailyPayment),
    status: driver.status,
    notes: driver.notes ?? "",
  };
}

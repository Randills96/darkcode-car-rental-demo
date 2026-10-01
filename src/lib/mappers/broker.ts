import type { BrokerFormValues } from "@/lib/validations/broker";

export function brokerToFormValues(broker: {
  name: string;
  nic: string | null;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  defaultCommissionPerDay: { toString(): string };
  defaultCommissionPerExtraKm: { toString(): string };
  status: "ACTIVE" | "INACTIVE";
}): BrokerFormValues {
  return {
    name: broker.name,
    nic: broker.nic ?? "",
    phone: broker.phone,
    whatsapp: broker.whatsapp ?? "",
    email: broker.email ?? "",
    address: broker.address ?? "",
    notes: broker.notes ?? "",
    defaultCommissionPerDay: Number(broker.defaultCommissionPerDay),
    defaultCommissionPerExtraKm: Number(broker.defaultCommissionPerExtraKm),
    status: broker.status,
  };
}

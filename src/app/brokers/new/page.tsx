import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { BrokerForm } from "@/components/brokers/broker-form";
import { requirePermission } from "@/lib/auth/session";

export default async function NewBrokerPage() {
  await requirePermission("brokers.create");
  return (
    <DashboardShell title="Add Broker">
      <PageHeader title="Add New Broker" backHref="/brokers" />
      <BrokerForm mode="create" />
    </DashboardShell>
  );
}

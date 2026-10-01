import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { BrokerForm } from "@/components/brokers/broker-form";
import { brokerToFormValues } from "@/lib/mappers/broker";
import { requirePermission } from "@/lib/auth/session";
import { getBrokerById } from "@/lib/services/broker";

interface EditBrokerPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBrokerPage({ params }: EditBrokerPageProps) {
  await requirePermission("brokers.edit");
  const { id } = await params;
  const broker = await getBrokerById(id);
  if (!broker) notFound();

  return (
    <DashboardShell title={`Edit ${broker.name}`}>
      <PageHeader title="Edit Broker" description={broker.brokerCode} backHref={`/brokers/${broker.id}`} />
      <BrokerForm mode="edit" brokerId={broker.id} defaultValues={brokerToFormValues(broker)} />
    </DashboardShell>
  );
}

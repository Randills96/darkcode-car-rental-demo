import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { BrokerProfile } from "@/components/brokers/broker-profile";
import { DeleteBrokerButton } from "@/components/brokers/delete-broker-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getBrokerById, getBrokerStats, serializeBrokerDetail } from "@/lib/services/broker";

interface BrokerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BrokerDetailPage({ params }: BrokerDetailPageProps) {
  const session = await requirePermission("brokers.view");
  const { id } = await params;
  const broker = await getBrokerById(id);
  if (!broker) notFound();

  const stats = await getBrokerStats(id);
  const canEdit = hasPermission(session.user.role, "brokers.edit");
  const canPaySettlement = hasPermission(session.user.role, "settlements.create");

  return (
    <DashboardShell title={broker.name}>
      <PageHeader
        title={broker.name}
        description={`${broker.brokerCode} · ${broker.phone}`}
        backHref="/brokers"
        actions={
          <>
            <Badge variant={broker.status === "ACTIVE" ? "success" : "secondary"}>{broker.status}</Badge>
            {canEdit && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/brokers/${broker.id}/edit`}><Pencil className="h-4 w-4 mr-2" />Edit</Link>
                </Button>
                <DeleteBrokerButton brokerId={broker.id} brokerName={broker.name} />
              </>
            )}
          </>
        }
      />
      <BrokerProfile broker={serializeBrokerDetail(broker)} stats={stats} canPaySettlement={canPaySettlement} />
    </DashboardShell>
  );
}

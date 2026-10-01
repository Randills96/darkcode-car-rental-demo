import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DamageProfile } from "@/components/damages/damage-profile";
import { DamageStatusBadge, DamagePaymentBadge } from "@/components/damages/damage-status-badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getDamageById, isDamageEditable, serializeDamageDetail } from "@/lib/services/damage";

interface DamageDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DamageDetailPage({ params }: DamageDetailPageProps) {
  const session = await requirePermission("damages.view");
  const { id } = await params;
  const damage = await getDamageById(id);
  if (!damage) notFound();
  const canEdit = hasPermission(session.user.role, "damages.edit");
  const canEditDamage = canEdit && isDamageEditable(damage);
  const damageData = serializeDamageDetail(damage);

  return (
    <DashboardShell title={damage.damageCode}>
      <PageHeader
        title={damage.damageCode}
        description={`${damage.damageType} · ${damage.rental.bookingNumber}`}
        backHref="/damages"
        actions={
          <>
            <DamageStatusBadge status={damage.status} />
            <DamagePaymentBadge status={damage.paymentStatus} />
            {canEditDamage && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/damages/${damage.id}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
            )}
          </>
        }
      />
      <DamageProfile
        damage={damageData}
        canEdit={canEditDamage}
        canRecordPayment={hasPermission(session.user.role, "payments.create")}
      />
    </DashboardShell>
  );
}

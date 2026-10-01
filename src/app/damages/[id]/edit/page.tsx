import { notFound, redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DamageEditForm } from "@/components/damages/damage-edit-form";
import { requirePermission } from "@/lib/auth/session";
import { getDamageById, isDamageEditable, serializeDamageDetail } from "@/lib/services/damage";

interface EditDamagePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDamagePage({ params }: EditDamagePageProps) {
  await requirePermission("damages.edit");
  const { id } = await params;
  const damage = await getDamageById(id);
  if (!damage) notFound();
  if (!isDamageEditable(damage)) redirect(`/damages/${damage.id}`);

  const damageData = serializeDamageDetail(damage);

  return (
    <DashboardShell title={`Edit ${damage.damageCode}`}>
      <PageHeader
        title="Edit Damage"
        description={`${damage.damageCode} · ${damage.rental.bookingNumber}`}
        backHref={`/damages/${damage.id}`}
      />
      <DamageEditForm damage={damageData} />
    </DashboardShell>
  );
}

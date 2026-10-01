import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DamageForm } from "@/components/damages/damage-form";
import { requirePermission } from "@/lib/auth/session";
import { getRentalsForDamageSelect } from "@/lib/services/damage";

interface NewDamagePageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function NewDamagePage({ searchParams }: NewDamagePageProps) {
  await requirePermission("damages.create");
  const params = await searchParams;
  const rentals = await getRentalsForDamageSelect();

  return (
    <DashboardShell title="Report Damage">
      <PageHeader title="Report Damage" description="Record vehicle damage linked to a rental" backHref="/damages" />
      <DamageForm rentals={rentals} defaultRentalId={params.rentalId} />
    </DashboardShell>
  );
}

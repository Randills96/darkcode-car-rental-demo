import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { OwnerForm } from "@/components/owners/owner-form";
import { ownerToFormValues } from "@/lib/mappers/owner";
import { requirePermission } from "@/lib/auth/session";
import { getOwnerById } from "@/lib/services/owner";

interface EditOwnerPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditOwnerPage({ params }: EditOwnerPageProps) {
  await requirePermission("owners.edit");
  const { id } = await params;
  const owner = await getOwnerById(id);
  if (!owner) notFound();

  return (
    <DashboardShell title={`Edit ${owner.name}`}>
      <PageHeader title="Edit Owner" description={owner.ownerCode} backHref={`/owners/${owner.id}`} />
      <OwnerForm mode="edit" ownerId={owner.id} defaultValues={ownerToFormValues(owner)} />
    </DashboardShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerProfile } from "@/components/customers/customer-profile";
import { BlacklistDialog } from "@/components/customers/blacklist-dialog";
import { DeleteCustomerButton } from "@/components/customers/delete-customer-button";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getCustomerById, getCustomerStats } from "@/lib/services/customer";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const session = await requirePermission("customers.view");
  const { id } = await params;

  const customer = await getCustomerById(id);
  if (!customer) notFound();

  const stats = await getCustomerStats(id);

  const canEdit = hasPermission(session.user.role, "customers.edit");
  const canDelete = hasPermission(session.user.role, "customers.delete");
  const canBlacklist = hasPermission(session.user.role, "customers.blacklist");

  return (
    <DashboardShell title={customer.fullName}>
      <PageHeader
        title={customer.fullName}
        description={`${customer.customerCode} · ${customer.nic}`}
        backHref="/customers"
        actions={
          <>
            <CustomerStatusBadge status={customer.status} />
            {canBlacklist && (
              <BlacklistDialog
                customerId={customer.id}
                customerName={customer.fullName}
                status={customer.status}
                canManage={canBlacklist}
              />
            )}
            {canEdit && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/customers/${customer.id}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
            )}
            {canDelete && (
              <DeleteCustomerButton
                customerId={customer.id}
                customerName={customer.fullName}
              />
            )}
          </>
        }
      />

      <CustomerProfile customer={customer} stats={stats} canEdit={canEdit} />
    </DashboardShell>
  );
}

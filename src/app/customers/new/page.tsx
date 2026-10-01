import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerForm } from "@/components/customers/customer-form";
import { requirePermission } from "@/lib/auth/session";

export const maxDuration = 60;

export default async function NewCustomerPage() {
  await requirePermission("customers.create");

  return (
    <DashboardShell title="Add Customer">
      <PageHeader
        title="Add New Customer"
        description="Photograph the driving licence at the top of the form to fill name, NIC, licence number, and address. You can still type or correct any field."
        backHref="/customers"
      />
      <CustomerForm mode="create" />
    </DashboardShell>
  );
}

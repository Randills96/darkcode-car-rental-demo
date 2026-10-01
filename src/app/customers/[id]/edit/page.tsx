import { notFound, unstable_rethrow } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerForm } from "@/components/customers/customer-form";
import { customerToFormValues } from "@/lib/mappers/customer";
import { requirePermission } from "@/lib/auth/session";
import { getCustomerById } from "@/lib/services/customer";

interface EditCustomerPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  try {
    await requirePermission("customers.edit");
    const { id } = await params;

    const customer = await getCustomerById(id);
    if (!customer) notFound();

    return (
      <DashboardShell title={`Edit ${customer.fullName}`}>
        <PageHeader
          title="Edit Customer"
          description={customer.customerCode}
          backHref={`/customers/${customer.id}`}
        />
        <CustomerForm
          mode="edit"
          customerId={customer.id}
          defaultValues={customerToFormValues(customer)}
        />
      </DashboardShell>
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error loading EditCustomerPage:", error);
    throw error;
  }
}

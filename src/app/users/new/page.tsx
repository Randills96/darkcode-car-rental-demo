import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { UserForm } from "@/components/users/user-form";
import { requirePermission } from "@/lib/auth/session";

export default async function NewUserPage() {
  await requirePermission("users.create");

  return (
    <DashboardShell title="Add User">
      <PageHeader title="Add User" description="Create a new system user with role-based access" backHref="/users" />
      <UserForm mode="create" />
    </DashboardShell>
  );
}

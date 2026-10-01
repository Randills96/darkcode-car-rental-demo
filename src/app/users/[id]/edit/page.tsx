import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { UserForm } from "@/components/users/user-form";
import { requirePermission } from "@/lib/auth/session";
import { getUserById } from "@/lib/services/user";
import { formatDate } from "@/lib/utils";

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  await requirePermission("users.edit");
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) notFound();

  return (
    <DashboardShell title="Edit User">
      <PageHeader
        title={`Edit ${user.name}`}
        description={
          user.subscriptionExpiresAt
            ? `${user.email} · Access until ${formatDate(user.subscriptionExpiresAt)}`
            : user.email
        }
        backHref="/users"
      />
      <UserForm
        mode="edit"
        userId={user.id}
        defaultValues={{
          name: user.name,
          email: user.email,
          phone: user.phone ?? "",
          role: user.role,
          status: user.status,
          password: "",
          confirmPassword: "",
        }}
      />
    </DashboardShell>
  );
}

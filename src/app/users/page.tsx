import Link from "next/link";
import { Suspense } from "react";
import { Shield, Plus } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { UserFilters } from "@/components/users/user-filters";
import { UserRoleBadge } from "@/components/users/user-role-badge";
import { UserStatusBadge } from "@/components/users/user-status-badge";
import { DeactivateUserButton } from "@/components/users/deactivate-user-button";
import { ActivateUserButton } from "@/components/users/activate-user-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getUsers } from "@/lib/services/user";
import { userSearchSchema } from "@/lib/validations/user";
import { formatDate } from "@/lib/utils";
import {
  daysUntilExpiry,
  isAnnualFeeRole,
} from "@/lib/services/user-subscription";

interface UsersPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const session = await requirePermission("users.view");
  const params = userSearchSchema.parse(await searchParams);
  const { users, total, page, totalPages } = await getUsers(params);
  const canCreate = hasPermission(session.user.role, "users.create");
  const canEdit = hasPermission(session.user.role, "users.edit");

  return (
    <DashboardShell title="Users">
      <PageHeader
        title="User Management"
        description={`${total} system user${total !== 1 ? "s" : ""}. Manager and Staff accounts deactivate after one year until Super Admin confirms the annual bank payment.`}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/users/new"><Plus className="h-4 w-4 mr-2" />Add User</Link>
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={<div className="h-10 bg-muted animate-pulse rounded-md mb-4" />}>
            <UserFilters />
          </Suspense>

          {users.length === 0 ? (
            <EmptyState icon={Shield} title="No users found" description="Create a user to grant system access." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Access until</TableHead>
                    <TableHead>Created</TableHead>
                    {canEdit && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || "—"}</TableCell>
                      <TableCell><UserRoleBadge role={user.role} /></TableCell>
                      <TableCell><UserStatusBadge status={user.status} /></TableCell>
                      <TableCell>
                        {!isAnnualFeeRole(user.role) || !user.subscriptionExpiresAt ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="space-y-1">
                            <div>{formatDate(user.subscriptionExpiresAt)}</div>
                            {user.status === "ACTIVE" && daysUntilExpiry(user.subscriptionExpiresAt) <= 7 && (
                              <Badge variant="warning">
                                {Math.max(daysUntilExpiry(user.subscriptionExpiresAt), 0)} days left
                              </Badge>
                            )}
                            {user.status === "INACTIVE" && (
                              <Badge variant="secondary">Awaiting payment</Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      {canEdit && (
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/users/${user.id}/edit`}>Edit</Link>
                          </Button>
                          {user.id !== session.user.id &&
                            user.status === "INACTIVE" &&
                            isAnnualFeeRole(user.role) && (
                              <ActivateUserButton userId={user.id} userName={user.name} />
                            )}
                          {user.id !== session.user.id && user.status === "ACTIVE" && (
                            <DeactivateUserButton userId={user.id} userName={user.name} />
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                totalPages={totalPages}
                baseUrl="/users"
                searchParams={{
                  search: params.search,
                  role: params.role !== "ALL" ? params.role : undefined,
                  status: params.status !== "ALL" ? params.status : undefined,
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

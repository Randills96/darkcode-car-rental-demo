import Link from "next/link";
import { Suspense } from "react";
import { Plus, UserCircle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { OwnerFilters } from "@/components/owners/owner-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getOwners } from "@/lib/services/owner";
import { ownerSearchSchema } from "@/lib/validations/owner";

interface OwnersPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function OwnersPage({ searchParams }: OwnersPageProps) {
  const session = await requirePermission("owners.view");
  const params = ownerSearchSchema.parse(await searchParams);
  const { owners, total, page, totalPages } = await getOwners(params);
  const canCreate = hasPermission(session.user.role, "owners.create");

  return (
    <DashboardShell title="Vehicle Owners">
      <PageHeader
        title="Vehicle Owner Management"
        description={`${total} owner${total !== 1 ? "s" : ""}`}
        actions={canCreate ? (
          <Button asChild><Link href="/owners/new"><Plus className="h-4 w-4 mr-2" />Add Owner</Link></Button>
        ) : undefined}
      />
      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={null}><OwnerFilters /></Suspense>
          {owners.length === 0 ? (
            <EmptyState icon={UserCircle} title="No owners found" description="Add vehicle owners to manage third-party and personal vehicles." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Vehicles</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {owners.map((owner) => (
                    <TableRow key={owner.id}>
                      <TableCell><Link href={`/owners/${owner.id}`} className="font-medium text-primary hover:underline">{owner.ownerCode}</Link></TableCell>
                      <TableCell>{owner.name}</TableCell>
                      <TableCell>{owner.phone}</TableCell>
                      <TableCell>{owner._count.vehicles}</TableCell>
                      <TableCell><Badge variant={owner.status === "ACTIVE" ? "success" : "secondary"}>{owner.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={page} totalPages={totalPages} baseUrl="/owners" searchParams={{ search: params.search, status: params.status !== "ALL" ? params.status : undefined }} />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

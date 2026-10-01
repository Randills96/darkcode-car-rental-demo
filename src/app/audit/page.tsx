import { Suspense } from "react";
import { ClipboardList } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { AuditFilters } from "@/components/audit/audit-filters";
import { AuditActionBadge } from "@/components/audit/audit-action-badge";
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
import { getAuditLogs, getAuditEntityTypes } from "@/lib/services/audit";
import { auditSearchSchema } from "@/lib/validations/audit";
import { formatDateTime } from "@/lib/utils";

interface AuditPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  await requirePermission("audit.view");
  const params = auditSearchSchema.parse(await searchParams);
  const [{ logs, total, page, totalPages }, entityTypes] = await Promise.all([
    getAuditLogs(params),
    getAuditEntityTypes(),
  ]);

  return (
    <DashboardShell title="Audit Log">
      <PageHeader
        title="Audit Log"
        description={`${total} recorded action${total !== 1 ? "s" : ""} — immutable trail of system changes`}
      />

      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={<div className="h-10 bg-muted animate-pulse rounded-md mb-4" />}>
            <AuditFilters entityTypes={entityTypes} />
          </Suspense>

          {logs.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No audit entries found"
              description="Actions such as creates, updates, payments, and settlements are logged here."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                      <TableCell>
                        <p className="font-medium">{log.user.name}</p>
                        <p className="text-xs text-muted-foreground">{log.user.email}</p>
                      </TableCell>
                      <TableCell><AuditActionBadge action={log.action} /></TableCell>
                      <TableCell>{log.entityType}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">{log.entityId}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                        {log.details ? JSON.stringify(log.details) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={page}
                totalPages={totalPages}
                baseUrl="/audit"
                searchParams={{
                  search: params.search,
                  entityType: params.entityType !== "ALL" ? params.entityType : undefined,
                  action: params.action !== "ALL" ? params.action : undefined,
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

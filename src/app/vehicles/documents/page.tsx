import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getDocumentExpiryReport } from "@/lib/services/vehicle";
import { documentExpirySearchSchema } from "@/lib/validations/vehicle";
import { formatDate, getDocumentExpiryStatus } from "@/lib/utils";
import { FileWarning, Pencil } from "lucide-react";

interface DocumentsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function VehicleDocumentsPage({ searchParams }: DocumentsPageProps) {
  const session = await requirePermission("vehicles.view");
  const canEdit = hasPermission(session.user.role, "vehicles.edit");
  const params = documentExpirySearchSchema.parse(await searchParams);
  const { documents, total, page, totalPages } = await getDocumentExpiryReport(params);

  return (
    <DashboardShell title="Document Expiry Report">
      <PageHeader
        title="Vehicle Document Expiry Report"
        description={`${total} document${total !== 1 ? "s" : ""} expiring within ${params.days} days or already expired`}
        backHref="/vehicles"
      />

      <Card className="mb-4">
        <CardContent className="pt-6">
          <form method="get" className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-sm font-medium">Within days</label>
              <select name="days" defaultValue={params.days} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                <option value="7">7 days</option>
                <option value="21">21 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Document type</label>
              <select name="documentType" defaultValue={params.documentType || "ALL"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                <option value="ALL">All Types</option>
                <option value="INSURANCE">Insurance</option>
                <option value="REVENUE_LICENCE">Revenue Licence</option>
                <option value="EMISSION_CERTIFICATE">Emission Certificate</option>
                <option value="REGISTRATION">Registration</option>
              </select>
            </div>
            <button type="submit" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Filter
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {documents.length === 0 ? (
            <EmptyState icon={FileWarning} title="No expiring documents" description="All vehicle documents are up to date for the selected period." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit && <TableHead className="text-right">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => {
                    const { label, severity } = getDocumentExpiryStatus(doc.expiryDate);
                    const variant = severity === "expired" || severity === "critical" ? "destructive" : severity === "warning" ? "warning" : "success";
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <Link href={`/vehicles/${doc.vehicle.id}`} className="font-medium text-primary hover:underline">
                            {doc.vehicle.registrationNumber}
                          </Link>
                          <span className="text-xs text-muted-foreground block">{doc.vehicle.make} {doc.vehicle.model}</span>
                        </TableCell>
                        <TableCell>{doc.documentType.replace(/_/g, " ")}</TableCell>
                        <TableCell>{doc.documentNumber || "—"}</TableCell>
                        <TableCell>{formatDate(doc.expiryDate)}</TableCell>
                        <TableCell><Badge variant={variant}>{label}</Badge></TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/vehicles/${doc.vehicle.id}/edit`}>
                                <Pencil className="h-3.5 w-3.5 mr-1" />
                                Update
                              </Link>
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination page={page} totalPages={totalPages} baseUrl="/vehicles/documents" searchParams={{ days: String(params.days), documentType: params.documentType !== "ALL" ? params.documentType : undefined }} />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

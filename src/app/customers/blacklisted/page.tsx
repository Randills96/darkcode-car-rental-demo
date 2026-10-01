import Link from "next/link";
import { Suspense } from "react";
import { Ban } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import { ExportBlacklistedButton } from "@/components/customers/export-blacklisted-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { getBlacklistedCustomers } from "@/lib/services/customer";
import { formatDate } from "@/lib/utils";

interface BlacklistedPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

function SearchForm({ defaultSearch }: { defaultSearch: string }) {
  return (
    <form method="get" className="flex gap-2 max-w-md">
      <Input
        name="search"
        placeholder="Search by name, NIC, or phone..."
        defaultValue={defaultSearch}
      />
      <Button type="submit" variant="secondary">
        Search
      </Button>
    </form>
  );
}

export default async function BlacklistedCustomersPage({ searchParams }: BlacklistedPageProps) {
  const session = await requirePermission("customers.view");
  const params = await searchParams;
  const search = params.search;
  const page = Number(params.page) || 1;

  const { customers, total, totalPages } = await getBlacklistedCustomers({
    search,
    page,
    limit: 20,
  });

  const canExport = hasPermission(session.user.role, "reports.export");

  return (
    <DashboardShell title="Blacklisted Customers">
      <PageHeader
        title="Blacklisted Customers Report"
        description={`${total} blacklisted customer${total !== 1 ? "s" : ""}`}
        backHref="/customers"
        actions={
          <>
            {canExport && <ExportBlacklistedButton search={search} />}
            <Button variant="outline" asChild>
              <Link href="/customers">All Customers</Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <Suspense fallback={null}>
            <SearchForm defaultSearch={search ?? ""} />
          </Suspense>

          {customers.length === 0 ? (
            <EmptyState
              icon={Ban}
              title="No blacklisted customers"
              description={search ? "No results match your search." : "No customers are currently blacklisted."}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>NIC</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Blacklisted By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Rentals</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Link
                          href={`/customers/${customer.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {customer.customerCode}
                        </Link>
                      </TableCell>
                      <TableCell>{customer.fullName}</TableCell>
                      <TableCell>{customer.nic}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {customer.blacklistReason || "-"}
                      </TableCell>
                      <TableCell>{customer.blacklistedBy?.name || "-"}</TableCell>
                      <TableCell>{formatDate(customer.blacklistDate)}</TableCell>
                      <TableCell>{customer._count.rentals}</TableCell>
                      <TableCell>
                        <CustomerStatusBadge status={customer.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Pagination
                page={page}
                totalPages={totalPages}
                baseUrl="/customers/blacklisted"
                searchParams={{ search }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

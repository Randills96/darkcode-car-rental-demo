import Link from "next/link";
import { Suspense } from "react";
import { Plus, Users, Ban } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { CustomerFilters } from "@/components/customers/customer-filters";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import { Button } from "@/components/ui/button";
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
import { getCustomers } from "@/lib/services/customer";
import { customerSearchSchema } from "@/lib/validations/customer";
import { formatDate } from "@/lib/utils";

interface CustomersPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const session = await requirePermission("customers.view");
  const params = customerSearchSchema.parse(await searchParams);
  const { customers, total, page, totalPages } = await getCustomers(params);

  const canCreate = hasPermission(session.user.role, "customers.create");
  const filterParams = {
    search: params.search,
    status: params.status !== "ALL" ? params.status : undefined,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };

  return (
    <DashboardShell title="Customers">
      <PageHeader
        title="Customer Management"
        description={`${total} customer${total !== 1 ? "s" : ""} registered`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/customers/blacklisted">
                <Ban className="h-4 w-4 mr-2" />
                Blacklisted Report
              </Link>
            </Button>
            {canCreate && (
              <Button asChild>
                <Link href="/customers/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Link>
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={<div className="h-10 bg-muted animate-pulse rounded-md mb-4" />}>
            <CustomerFilters />
          </Suspense>

          {customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customers found"
              description="Try adjusting your search or add a new customer."
              action={
                canCreate ? (
                  <Button asChild>
                    <Link href="/customers/new">Add Customer</Link>
                  </Button>
                ) : undefined
              }
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
                    <TableHead>Status</TableHead>
                    <TableHead>Rentals</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Link
                          href={`/customers/${customer.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {customer.customerCode}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/customers/${customer.id}`} className="hover:underline">
                          {customer.fullName}
                        </Link>
                      </TableCell>
                      <TableCell>{customer.nic}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>
                        <CustomerStatusBadge status={customer.status} />
                      </TableCell>
                      <TableCell>{customer._count.rentals}</TableCell>
                      <TableCell>{formatDate(customer.registrationDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Pagination
                page={page}
                totalPages={totalPages}
                baseUrl="/customers"
                searchParams={filterParams}
              />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

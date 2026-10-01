import Link from "next/link";
import { Suspense } from "react";
import { Plus, Handshake } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { BrokerFilters } from "@/components/brokers/broker-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getBrokers } from "@/lib/services/broker";
import { brokerSearchSchema } from "@/lib/validations/broker";

interface BrokersPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function BrokersPage({ searchParams }: BrokersPageProps) {
  const session = await requirePermission("brokers.view");
  const params = brokerSearchSchema.parse(await searchParams);
  const { brokers, total, page, totalPages } = await getBrokers(params);
  const canCreate = hasPermission(session.user.role, "brokers.create");

  return (
    <DashboardShell title="Brokers">
      <PageHeader
        title="Broker Management"
        description={`${total} broker${total !== 1 ? "s" : ""}`}
        actions={canCreate ? (
          <Button asChild><Link href="/brokers/new"><Plus className="h-4 w-4 mr-2" />Add Broker</Link></Button>
        ) : undefined}
      />
      <Card>
        <CardContent className="pt-6">
          <Suspense fallback={null}><BrokerFilters /></Suspense>
          {brokers.length === 0 ? (
            <EmptyState icon={Handshake} title="No brokers found" description="Add brokers who refer rental bookings." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Commissions</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brokers.map((broker) => (
                    <TableRow key={broker.id}>
                      <TableCell><Link href={`/brokers/${broker.id}`} className="font-medium text-primary hover:underline">{broker.brokerCode}</Link></TableCell>
                      <TableCell>{broker.name}</TableCell>
                      <TableCell>{broker.phone}</TableCell>
                      <TableCell>{broker._count.rentals}</TableCell>
                      <TableCell>{broker._count.commissions}</TableCell>
                      <TableCell><Badge variant={broker.status === "ACTIVE" ? "success" : "secondary"}>{broker.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={page} totalPages={totalPages} baseUrl="/brokers" searchParams={{ search: params.search, status: params.status !== "ALL" ? params.status : undefined }} />
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

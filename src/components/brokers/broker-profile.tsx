"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PaySettlementDialog } from "@/components/settlements/pay-settlement-dialog";
import { SettlementReceiptActions } from "@/components/settlements/settlement-receipt-actions";
import type { BrokerDetailClient } from "@/lib/services/broker";
import { formatCurrency, formatDate, formatCommissionBreakdown } from "@/lib/utils";
import { CalendarDays, Wallet } from "lucide-react";

interface BrokerProfileProps {
  broker: BrokerDetailClient;
  stats: {
    totalBookings: number;
    totalRentalRevenue: number;
    totalCommission: number;
    paidCommission: number;
    pendingCommission: number;
  };
  canPaySettlement?: boolean;
}

function settlementBadge(status: string) {
  const variants: Record<string, "success" | "warning" | "destructive"> = {
    PAID: "success",
    PARTIALLY_PAID: "warning",
    PENDING: "destructive",
  };
  return <Badge variant={variants[status] || "outline"}>{status.replace(/_/g, " ")}</Badge>;
}

export function BrokerProfile({ broker, stats, canPaySettlement = false }: BrokerProfileProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Bookings</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalBookings}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rental Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(stats.totalRentalRevenue)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Commission</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(stats.totalCommission)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Paid Commission</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-700">{formatCurrency(stats.paidCommission)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending Commission</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{formatCurrency(stats.pendingCommission)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Details</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle>Broker Information</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Code</span><span>{broker.brokerCode}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">NIC</span><span>{broker.nic || "—"}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Phone</span><span>{broker.phone}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Email</span><span>{broker.email || "—"}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">WhatsApp</span><span>{broker.whatsapp || "—"}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Status</span><Badge variant={broker.status === "ACTIVE" ? "success" : "secondary"}>{broker.status}</Badge></div>
              {broker.address && <div className="sm:col-span-2 py-2"><span className="text-muted-foreground">Address: </span>{broker.address}</div>}
              {broker.notes && <div className="sm:col-span-2 py-2"><span className="text-muted-foreground">Notes: </span>{broker.notes}</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardHeader><CardTitle>Broker Bookings</CardTitle></CardHeader>
            <CardContent>
              {broker.rentals.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No bookings" description="Rentals linked to this broker will appear here." />
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Booking</TableHead><TableHead>Customer</TableHead><TableHead>Vehicle</TableHead><TableHead>Pickup</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {broker.rentals.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.bookingNumber}</TableCell>
                        <TableCell>{r.customer.fullName}</TableCell>
                        <TableCell>{r.vehicle?.registrationNumber || "—"}</TableCell>
                        <TableCell>{formatDate(r.pickupDate)}</TableCell>
                        <TableCell>{formatCurrency(r.finalTotal)}</TableCell>
                        <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <Card>
            <CardHeader><CardTitle>Commission History</CardTitle></CardHeader>
            <CardContent>
              {broker.commissions.length === 0 ? (
                <EmptyState icon={Wallet} title="No commissions" description="Commissions are created when broker-linked rentals are completed." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking</TableHead>
                      <TableHead className="min-w-[200px]">Commission breakdown</TableHead>
                      <TableHead>Rental value</TableHead>
                      <TableHead>Total commission</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {broker.commissions.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.rental.bookingNumber}</TableCell>
                        <TableCell className="max-w-[240px] text-xs leading-relaxed text-muted-foreground">
                          {formatCommissionBreakdown({
                            perDay: c.commissionPerDay,
                            perExtraKm: c.commissionPerExtraKm,
                            days: c.billableDays,
                            extraKm: c.billableExtraKm,
                          })}
                        </TableCell>
                        <TableCell>{formatCurrency(c.rentalValue)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(c.commissionAmount)}</TableCell>
                        <TableCell>{formatCurrency(c.paidAmount)}</TableCell>
                        <TableCell>{settlementBadge(c.status)}</TableCell>
                        <TableCell>{formatDate(c.paymentDate)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <SettlementReceiptActions
                              type="broker"
                              settlementId={c.id}
                              bookingNumber={c.rental.bookingNumber}
                              recipientEmail={broker.email}
                              paidAmount={c.paidAmount}
                              canSendEmail={canPaySettlement}
                              profileEditHref={`/brokers/${broker.id}/edit`}
                              compact
                            />
                            {canPaySettlement && (
                              <PaySettlementDialog
                                type="broker"
                                recordId={c.id}
                                label={c.rental.bookingNumber}
                                payableAmount={c.commissionAmount}
                                paidAmount={c.paidAmount}
                                status={c.status}
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

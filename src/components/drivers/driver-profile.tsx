"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DriverPaymentDialog } from "./driver-payment-dialog";
import { DriverExpenseDialog } from "./driver-expense-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatDate, decimalToNumber, getLicenceExpiryStatus } from "@/lib/utils";
import { CalendarDays, CreditCard, Receipt } from "lucide-react";

interface DriverProfileProps {
  driver: {
    id: string;
    driverCode: string;
    name: string;
    nic: string;
    phone: string;
    whatsapp: string | null;
    address: string | null;
    drivingLicence: string;
    licenceExpiry: Date;
    dailyPayment: { toString(): string };
    status: string;
    notes: string | null;
    rentals: Array<{
      id: string;
      bookingNumber: string;
      status: string;
      pickupDate: Date;
      returnDate: Date;
      rentalDays: number;
      customer: { fullName: string };
      vehicle: { registrationNumber: string; make: string; model: string } | null;
    }>;
    payments: Array<{
      id: string;
      amount: { toString(): string };
      paymentMethod: string;
      paymentDate: Date;
      referenceNumber: string | null;
      rental: { bookingNumber: string } | null;
    }>;
    expenses: Array<{
      id: string;
      expenseType: string;
      amount: { toString(): string };
      expenseDate: Date;
      description: string | null;
      rental: { bookingNumber: string } | null;
    }>;
  };
  stats: {
    totalRentals: number;
    activeRentals: number;
    totalPayments: number;
    totalExpenses: number;
    outstandingPayments: number;
    dailyPayment: number;
  };
  canEdit: boolean;
}

export function DriverProfile({ driver, stats, canEdit }: DriverProfileProps) {
  const licenceStatus = getLicenceExpiryStatus(driver.licenceExpiry);
  const rentalOptions = driver.rentals.map((r) => ({ id: r.id, bookingNumber: r.bookingNumber, status: r.status }));

  return (
    <div className="space-y-6">
      {(licenceStatus.severity === "expired" || licenceStatus.severity === "warning") && (
        <div className={`rounded-lg border p-4 flex items-start gap-3 ${licenceStatus.severity === "expired" ? "border-red-300 bg-red-50" : "border-yellow-300 bg-yellow-50"}`}>
          <AlertTriangle className={`h-5 w-5 shrink-0 ${licenceStatus.severity === "expired" ? "text-red-600" : "text-yellow-600"}`} />
          <div>
            <p className="font-semibold">Driving licence {licenceStatus.label.toLowerCase()}</p>
            <p className="text-sm text-muted-foreground">Expiry: {formatDate(driver.licenceExpiry)}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Rentals</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalRentals}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active Rentals</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.activeRentals}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Daily Payment</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(stats.dailyPayment)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Paid</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(stats.totalPayments)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold ${stats.outstandingPayments > 0 ? "text-red-600" : ""}`}>{formatCurrency(stats.outstandingPayments)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="info">Personal Info</TabsTrigger>
          <TabsTrigger value="rentals">Assigned Rentals</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle>Driver Details</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Code</span><span>{driver.driverCode}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">NIC</span><span>{driver.nic}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Phone</span><span>{driver.phone}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">WhatsApp</span><span>{driver.whatsapp || "—"}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Licence</span><span>{driver.drivingLicence}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Licence Expiry</span><Badge variant={licenceStatus.severity === "expired" ? "destructive" : licenceStatus.severity === "warning" ? "warning" : "success"}>{formatDate(driver.licenceExpiry)}</Badge></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Status</span><Badge variant={driver.status === "ACTIVE" ? "success" : "secondary"}>{driver.status}</Badge></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Total Expenses</span><span>{formatCurrency(stats.totalExpenses)}</span></div>
              {driver.address && <div className="sm:col-span-2 py-2"><span className="text-muted-foreground">Address: </span>{driver.address}</div>}
              {driver.notes && <div className="sm:col-span-2 py-2"><span className="text-muted-foreground">Notes: </span>{driver.notes}</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rentals">
          <Card>
            <CardHeader><CardTitle>Assigned Rentals</CardTitle></CardHeader>
            <CardContent>
              {driver.rentals.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No rentals" description="This driver has not been assigned to any rentals." />
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Booking</TableHead><TableHead>Customer</TableHead><TableHead>Vehicle</TableHead><TableHead>Days</TableHead><TableHead>Pickup</TableHead><TableHead>Return</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {driver.rentals.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.bookingNumber}</TableCell>
                        <TableCell>{r.customer.fullName}</TableCell>
                        <TableCell>{r.vehicle?.registrationNumber || "—"}</TableCell>
                        <TableCell>{r.rentalDays}</TableCell>
                        <TableCell>{formatDate(r.pickupDate)}</TableCell>
                        <TableCell>{formatDate(r.returnDate)}</TableCell>
                        <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Driver Payments</CardTitle>
              {canEdit && <DriverPaymentDialog driverId={driver.id} rentals={rentalOptions} />}
            </CardHeader>
            <CardContent>
              {driver.payments.length === 0 ? (
                <EmptyState icon={CreditCard} title="No payments" description="Record driver payments here." />
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Rental</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {driver.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.paymentDate)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(decimalToNumber(p.amount))}</TableCell>
                        <TableCell>{p.paymentMethod.replace(/_/g, " ")}</TableCell>
                        <TableCell>{p.rental?.bookingNumber || "—"}</TableCell>
                        <TableCell>{p.referenceNumber || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Driver Expenses</CardTitle>
              {canEdit && <DriverExpenseDialog driverId={driver.id} rentals={rentalOptions} />}
            </CardHeader>
            <CardContent>
              {driver.expenses.length === 0 ? (
                <EmptyState icon={Receipt} title="No expenses" description="Record food, accommodation, travel and other expenses." />
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Rental</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {driver.expenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{formatDate(e.expenseDate)}</TableCell>
                        <TableCell>{e.expenseType.replace(/_/g, " ")}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(decimalToNumber(e.amount))}</TableCell>
                        <TableCell>{e.rental?.bookingNumber || "—"}</TableCell>
                        <TableCell>{e.description || "—"}</TableCell>
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

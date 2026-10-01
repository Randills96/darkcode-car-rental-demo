"use client";

import Link from "next/link";
import {
  AlertTriangle,
  FileText,
  CalendarDays,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerStatusBadge } from "./customer-status-badge";
import { DocumentFormDialog } from "./document-form-dialog";
import { DocumentEditDialog } from "./document-edit-dialog";
import { DocumentFileActions } from "./document-file-actions";
import { DeleteDocumentButton } from "./delete-document-button";
import { getCustomerDocumentTypeLabel } from "@/lib/customer-documents/types";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatDate, formatDateTime, decimalToNumber, getLicenceExpiryStatus } from "@/lib/utils";
import type { CustomerStatus } from "@prisma/client";

interface CustomerProfileProps {
  customer: {
    id: string;
    customerCode: string;
    fullName: string;
    nic: string;
    passportNumber: string | null;
    phone: string;
    whatsapp: string | null;
    address: string;
    drivingLicenceNumber: string | null;
    drivingLicenceExpiry: Date | null;
    emergencyContact: string | null;
    registrationDate: Date;
    notes: string | null;
    status: CustomerStatus;
    blacklistReason: string | null;
    blacklistDate: Date | null;
    createdAt: Date;
    createdBy: { name: string };
    updatedBy: { name: string } | null;
    blacklistedBy: { name: string } | null;
    documents: Array<{
      id: string;
      documentType: string;
      documentNumber: string | null;
      issueDate: Date | null;
      expiryDate: Date | null;
      filePath: string | null;
      notes: string | null;
    }>;
    blacklistHistory: Array<{
      id: string;
      action: string;
      reason: string;
      notes: string | null;
      createdAt: Date;
      createdBy: { name: string };
    }>;
    rentals: Array<{
      id: string;
      bookingNumber: string;
      status: string;
      pickupDate: Date;
      returnDate: Date;
      finalTotal: { toString(): string };
      balance: { toString(): string };
      vehicle: { registrationNumber: string; make: string; model: string } | null;
    }>;
    payments: Array<{
      id: string;
      paymentCode: string;
      amount: { toString(): string };
      paymentMethod: string;
      paymentType: string;
      paymentDate: Date;
      rental: { bookingNumber: string };
      recordedBy: { name: string };
    }>;
    damages: Array<{
      id: string;
      damageCode: string;
      damageType: string;
      description: string;
      customerCharge: { toString(): string };
      status: string;
      damageDate: Date;
      vehicle: { registrationNumber: string };
      rental: { bookingNumber: string };
    }>;
  };
  stats: {
    totalRentals: number;
    totalSpending: number;
    outstandingBalance: number;
    previousVehicles: Array<{
      registrationNumber: string;
      make: string;
      model: string;
    } | null>;
  };
  canEdit: boolean;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b last:border-0">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm col-span-2">{value || "-"}</dd>
    </div>
  );
}

export function CustomerProfile({ customer, stats, canEdit }: CustomerProfileProps) {
  const customerPhoto = customer.documents.find(
    (doc) => doc.documentType === "CUSTOMER_PHOTO" && doc.filePath
  );
  const licenceStatus = customer.drivingLicenceExpiry
    ? getLicenceExpiryStatus(customer.drivingLicenceExpiry)
    : null;

  return (
    <div className="space-y-6">
      {licenceStatus &&
        (licenceStatus.severity === "expired" || licenceStatus.severity === "warning") && (
          <div
            className={`rounded-lg border p-4 flex items-start gap-3 ${
              licenceStatus.severity === "expired"
                ? "border-red-300 bg-red-50"
                : "border-yellow-300 bg-yellow-50"
            }`}
          >
            <AlertTriangle
              className={`h-5 w-5 shrink-0 ${
                licenceStatus.severity === "expired" ? "text-red-600" : "text-yellow-600"
              }`}
            />
            <div className="flex-1">
              <p
                className={`font-semibold ${
                  licenceStatus.severity === "expired" ? "text-red-800" : "text-yellow-800"
                }`}
              >
                {licenceStatus.severity === "expired"
                  ? "Driving licence has expired"
                  : "Driving licence expiring soon"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Expiry: {formatDate(customer.drivingLicenceExpiry)} — verify the physical licence
                manually. After renewal, update the expiry date
                {canEdit ? " via Edit Customer or the Documents tab." : "."}
              </p>
              {canEdit && (
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href={`/customers/${customer.id}/edit`}>Update Expiry Date</Link>
                </Button>
              )}
            </div>
          </div>
        )}

      {customer.status === "BLACKLISTED" && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">This customer is blacklisted</p>
            <p className="text-sm text-red-700 mt-1">
              Reason: {customer.blacklistReason}
            </p>
            <p className="text-xs text-red-600 mt-1">
              Blacklisted on {formatDate(customer.blacklistDate)} by{" "}
              {customer.blacklistedBy?.name}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Rentals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalRentals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalSpending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stats.outstandingBalance > 0 ? "text-red-600" : ""}`}>
              {formatCurrency(stats.outstandingBalance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerStatusBadge status={customer.status} />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="info">Personal Info</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="rentals">Rental History</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="damages">Damages</TabsTrigger>
          <TabsTrigger value="blacklist">Blacklist History</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              {customerPhoto && (
                <div className="mb-6 flex items-center gap-4 rounded-xl border bg-muted/20 p-4">
                  <div className="h-24 w-24 overflow-hidden rounded-full border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/customer-documents/${customerPhoto.id}/file`}
                      alt={`${customer.fullName} photo`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{customer.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      Customer photo on file — update from the Documents tab.
                    </p>
                  </div>
                </div>
              )}
              <dl>
                <InfoRow label="Customer Code" value={customer.customerCode} />
                <InfoRow label="Full Name" value={customer.fullName} />
                <InfoRow label="NIC" value={customer.nic} />
                <InfoRow label="Passport" value={customer.passportNumber} />
                <InfoRow label="Phone" value={customer.phone} />
                <InfoRow label="WhatsApp" value={customer.whatsapp} />
                <InfoRow label="Address" value={customer.address} />
                <InfoRow label="Driving Licence" value={customer.drivingLicenceNumber} />
                <InfoRow
                  label="Licence Expiry"
                  value={
                    customer.drivingLicenceExpiry ? (
                      <Badge
                        variant={
                          licenceStatus?.severity === "expired"
                            ? "destructive"
                            : licenceStatus?.severity === "warning"
                              ? "warning"
                              : "success"
                        }
                      >
                        {formatDate(customer.drivingLicenceExpiry)}
                      </Badge>
                    ) : (
                      "-"
                    )
                  }
                />
                <InfoRow label="Emergency Contact" value={customer.emergencyContact} />
                <InfoRow label="Registration Date" value={formatDate(customer.registrationDate)} />
                <InfoRow label="Notes" value={customer.notes} />
                <InfoRow label="Created By" value={customer.createdBy.name} />
                <InfoRow label="Last Updated By" value={customer.updatedBy?.name} />
              </dl>

              {stats.previousVehicles.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-2">Previously Rented Vehicles</h4>
                  <div className="flex flex-wrap gap-2">
                    {stats.previousVehicles.filter(Boolean).map((v, i) => (
                      <Badge key={i} variant="secondary">
                        {v!.registrationNumber} — {v!.make} {v!.model}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              {canEdit && <DocumentFormDialog customerId={customer.id} />}
            </CardHeader>
            <CardContent>
              {customer.documents.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No documents"
                  description="Add customer photo, driving licence, NIC, or other documents."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Number</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Document</TableHead>
                      {canEdit && <TableHead className="w-28">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          {getCustomerDocumentTypeLabel(doc.documentType, doc.notes)}
                        </TableCell>
                        <TableCell>{doc.documentNumber || "-"}</TableCell>
                        <TableCell>{formatDate(doc.issueDate)}</TableCell>
                        <TableCell>{formatDate(doc.expiryDate)}</TableCell>
                        <TableCell>
                          <DocumentFileActions documentId={doc.id} hasFile={!!doc.filePath} />
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DocumentEditDialog customerId={customer.id} document={doc} />
                              <DeleteDocumentButton documentId={doc.id} customerId={customer.id} />
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rentals">
          <Card>
            <CardHeader>
              <CardTitle>Rental History</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.rentals.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No rentals" description="This customer has no rental history yet." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Pickup</TableHead>
                      <TableHead>Return</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.rentals.map((rental) => (
                      <TableRow key={rental.id}>
                        <TableCell>
                          <Link href={`/rentals`} className="font-medium text-primary hover:underline">
                            {rental.bookingNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {rental.vehicle
                            ? `${rental.vehicle.registrationNumber}`
                            : "Unassigned"}
                        </TableCell>
                        <TableCell>{formatDate(rental.pickupDate)}</TableCell>
                        <TableCell>{formatDate(rental.returnDate)}</TableCell>
                        <TableCell>{formatCurrency(decimalToNumber(rental.finalTotal))}</TableCell>
                        <TableCell>
                          {decimalToNumber(rental.balance) > 0 ? (
                            <span className="text-red-600 font-medium">
                              {formatCurrency(decimalToNumber(rental.balance))}
                            </span>
                          ) : (
                            formatCurrency(0)
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{rental.status}</Badge>
                        </TableCell>
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
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.payments.length === 0 ? (
                <EmptyState icon={CreditCard} title="No payments" description="No payment records for this customer." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Recorded By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.paymentCode}</TableCell>
                        <TableCell>{payment.rental.bookingNumber}</TableCell>
                        <TableCell>{payment.paymentType.replace(/_/g, " ")}</TableCell>
                        <TableCell>{payment.paymentMethod.replace(/_/g, " ")}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(decimalToNumber(payment.amount))}
                        </TableCell>
                        <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                        <TableCell>{payment.recordedBy.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="damages">
          <Card>
            <CardHeader>
              <CardTitle>Damage History</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.damages.length === 0 ? (
                <EmptyState icon={AlertTriangle} title="No damages" description="No damage records for this customer." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Charge</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.damages.map((damage) => (
                      <TableRow key={damage.id}>
                        <TableCell>{damage.damageCode}</TableCell>
                        <TableCell>{damage.damageType}</TableCell>
                        <TableCell>{damage.vehicle.registrationNumber}</TableCell>
                        <TableCell>{damage.rental.bookingNumber}</TableCell>
                        <TableCell>{formatCurrency(decimalToNumber(damage.customerCharge))}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{damage.status}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(damage.damageDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blacklist">
          <Card>
            <CardHeader>
              <CardTitle>Blacklist History</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.blacklistHistory.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="No blacklist history"
                  description="This customer has never been blacklisted."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.blacklistHistory.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Badge variant={entry.action === "BLACKLISTED" ? "destructive" : "success"}>
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{entry.reason}</TableCell>
                        <TableCell>{entry.notes || "-"}</TableCell>
                        <TableCell>{entry.createdBy.name}</TableCell>
                        <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
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

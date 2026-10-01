"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VehicleStatusBadge, OwnershipTypeBadge } from "./vehicle-status-badge";
import { VehicleDocumentDialog } from "./vehicle-document-dialog";
import { UnavailablePeriodDialog } from "./unavailable-period-dialog";
import { DeleteVehicleDocumentButton, DeleteUnavailablePeriodButton } from "./delete-vehicle-button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatDate, decimalToNumber, getDocumentExpiryStatus } from "@/lib/utils";
import { Car, FileText, CalendarDays, Wrench, AlertTriangle } from "lucide-react";
import { RentalStatusBadge } from "@/components/rentals/rental-status-badge";

interface VehicleProfileProps {
  vehicle: NonNullable<Awaited<ReturnType<typeof import("@/lib/services/vehicle").getVehicleById>>>;
  stats: { totalRentals: number; totalRevenue: number; maintenanceCost: number };
  canEdit: boolean;
  canCreateMaintenance?: boolean;
}

function DocExpiryBadge({ expiryDate }: { expiryDate: Date | null }) {
  const { label, severity } = getDocumentExpiryStatus(expiryDate);
  const variant = severity === "expired" || severity === "critical" ? "destructive" : severity === "warning" ? "warning" : "success";
  return <Badge variant={variant}>{label}</Badge>;
}

export function VehicleProfile({ vehicle, stats, canEdit, canCreateMaintenance }: VehicleProfileProps) {
  const currentHire = vehicle.currentHire;

  return (
    <div className="space-y-6">
      {currentHire && (
        <Card className="border-amber-200/80 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {currentHire.status === "ACTIVE" ? "Currently on hire" : "Reserved for hire"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/rentals/${currentHire.id}`} className="font-semibold text-primary hover:underline">
                  {currentHire.bookingNumber}
                </Link>
                <RentalStatusBadge status={currentHire.status} />
              </div>
              <p className="text-sm">
                {currentHire.customer.fullName}
                {currentHire.customer.phone ? ` · ${currentHire.customer.phone}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(currentHire.pickupDate)} {currentHire.pickupTime} – {formatDate(currentHire.returnDate)}{" "}
                {currentHire.returnTime}
              </p>
            </div>
            <Button asChild>
              <Link href={`/rentals/${currentHire.id}`}>Open hire</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Customer daily rate</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(decimalToNumber(vehicle.dailyRate))}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Rentals</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalRentals}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Odometer</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{vehicle.currentOdometer.toLocaleString()} KM</p></CardContent></Card>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="rentals">Rental History</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="damages">Damages</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader><CardTitle>Vehicle Information</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Code</span><span>{vehicle.vehicleCode}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Registration</span><span className="font-medium">{vehicle.registrationNumber}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Make / Model</span><span>{vehicle.make} {vehicle.model} ({vehicle.year})</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Type</span><span>{vehicle.vehicleType}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Colour</span><span>{vehicle.colour}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Fuel / Transmission</span><span>{vehicle.fuelType} / {vehicle.transmission}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Seating</span><span>{vehicle.seatingCapacity}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Status</span><VehicleStatusBadge status={vehicle.status} /></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Ownership</span><OwnershipTypeBadge type={vehicle.ownershipType} /></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Owner</span><span>{vehicle.owner ? <Link href={`/owners/${vehicle.owner.id}`} className="text-primary hover:underline">{vehicle.owner.name}</Link> : "—"}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Customer daily rate</span><span>{formatCurrency(decimalToNumber(vehicle.dailyRate))}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Included KM/Day</span><span>{vehicle.includedKm} KM</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Customer extra KM rate</span><span>{formatCurrency(decimalToNumber(vehicle.extraKmRate))}</span></div>
              {vehicle.ownerId && (
                <>
                  <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Owner daily rate</span><span>{vehicle.ownerDailyRate != null ? formatCurrency(decimalToNumber(vehicle.ownerDailyRate)) : "—"}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Owner extra KM rate</span><span>{vehicle.ownerExtraKmRate != null ? formatCurrency(decimalToNumber(vehicle.ownerExtraKmRate)) : "—"}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Daily margin</span><span>{vehicle.ownerDailyRate != null ? formatCurrency(decimalToNumber(vehicle.dailyRate) - decimalToNumber(vehicle.ownerDailyRate)) : "—"}</span></div>
                </>
              )}
              {vehicle.notes && <div className="sm:col-span-2 py-2"><span className="text-muted-foreground">Notes: </span>{vehicle.notes}</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              {canEdit && <VehicleDocumentDialog vehicleId={vehicle.id} />}
            </CardHeader>
            <CardContent>
              {vehicle.documents.length === 0 ? (
                <EmptyState icon={FileText} title="No documents" description="Add insurance, revenue licence, and other documents." />
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Type</TableHead><TableHead>Number</TableHead><TableHead>Issue</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead>{canEdit && <TableHead />}
                  </TableRow></TableHeader>
                  <TableBody>
                    {vehicle.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>{doc.documentType.replace(/_/g, " ")}</TableCell>
                        <TableCell>{doc.documentNumber || "—"}</TableCell>
                        <TableCell>{formatDate(doc.issueDate)}</TableCell>
                        <TableCell>{formatDate(doc.expiryDate)}</TableCell>
                        <TableCell><DocExpiryBadge expiryDate={doc.expiryDate} /></TableCell>
                        {canEdit && <TableCell><DeleteVehicleDocumentButton documentId={doc.id} vehicleId={vehicle.id} /></TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Unavailable Periods</CardTitle>
              {canEdit && <UnavailablePeriodDialog vehicleId={vehicle.id} />}
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">These periods block vehicle assignment and prevent double booking.</p>
              {vehicle.unavailablePeriods.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No blocked periods" description="Vehicle is available unless rented or in maintenance." />
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Reason</TableHead>{canEdit && <TableHead />}</TableRow></TableHeader>
                  <TableBody>
                    {vehicle.unavailablePeriods.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.startDate)}</TableCell>
                        <TableCell>{formatDate(p.endDate)}</TableCell>
                        <TableCell>{p.reason || "—"}</TableCell>
                        {canEdit && <TableCell><DeleteUnavailablePeriodButton periodId={p.id} vehicleId={vehicle.id} /></TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/vehicles/availability?vehicleId=${vehicle.id}`}>View Full Availability Calendar</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rentals">
          <Card>
            <CardHeader><CardTitle>Rental History</CardTitle></CardHeader>
            <CardContent>
              {vehicle.rentals.length === 0 ? (
                <EmptyState icon={Car} title="No rentals" description="This vehicle has no rental history yet." />
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Booking</TableHead><TableHead>Customer</TableHead><TableHead>Pickup</TableHead><TableHead>Return</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {vehicle.rentals.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Link href={`/rentals/${r.id}`} className="hover:underline">
                            {r.bookingNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{r.customer.fullName}</TableCell>
                        <TableCell>{formatDate(r.pickupDate)}</TableCell>
                        <TableCell>{formatDate(r.returnDate)}</TableCell>
                        <TableCell>{formatCurrency(decimalToNumber(r.finalTotal))}</TableCell>
                        <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Maintenance History</CardTitle>
              {canCreateMaintenance && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/maintenance/new?vehicleId=${vehicle.id}`}>Record Maintenance</Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {vehicle.maintenance.length === 0 ? (
                <EmptyState icon={Wrench} title="No maintenance records" description="Maintenance records will appear here." />
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Cost</TableHead><TableHead>Provider</TableHead><TableHead>Next Service</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {vehicle.maintenance.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Link href={`/maintenance/${m.id}`} className="hover:underline font-mono text-sm">
                            {m.maintenanceCode}
                          </Link>
                        </TableCell>
                        <TableCell>{m.maintenanceType.replace(/_/g, " ")}</TableCell>
                        <TableCell>{formatDate(m.date)}</TableCell>
                        <TableCell>{formatCurrency(decimalToNumber(m.cost))}</TableCell>
                        <TableCell>{m.serviceProvider || "—"}</TableCell>
                        <TableCell>
                          {m.nextServiceDate ? formatDate(m.nextServiceDate) : "—"}
                          {m.nextServiceKm ? ` / ${m.nextServiceKm.toLocaleString()} km` : ""}
                        </TableCell>
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
            <CardHeader><CardTitle>Damage History</CardTitle></CardHeader>
            <CardContent>
              {vehicle.damages.length === 0 ? (
                <EmptyState icon={AlertTriangle} title="No damages" description="No damage records for this vehicle." />
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead>Customer</TableHead><TableHead>Charge</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {vehicle.damages.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.damageCode}</TableCell>
                        <TableCell>{d.damageType}</TableCell>
                        <TableCell>{d.customer.fullName}</TableCell>
                        <TableCell>{formatCurrency(decimalToNumber(d.customerCharge))}</TableCell>
                        <TableCell><Badge variant="outline">{d.status}</Badge></TableCell>
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

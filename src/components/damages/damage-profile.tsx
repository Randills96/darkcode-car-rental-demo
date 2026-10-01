"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DamageStatusBadge, DamagePaymentBadge } from "@/components/damages/damage-status-badge";
import { DamagePaymentDialog } from "@/components/damages/damage-payment-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DamageDetailClient } from "@/lib/services/damage";

interface DamageProfileProps {
  damage: DamageDetailClient;
  canEdit: boolean;
  canRecordPayment: boolean;
}

export function DamageProfile({ damage, canEdit, canRecordPayment }: DamageProfileProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <DamageStatusBadge status={damage.status} />
        <DamagePaymentBadge status={damage.paymentStatus} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Damage Information</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Rental</dt>
                <dd>
                  <Link href={`/rentals/${damage.rental.id}`} className="font-medium hover:underline">
                    {damage.rental.bookingNumber}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Customer</dt>
                <dd>
                  <Link href={`/customers/${damage.customer.id}`} className="hover:underline">
                    {damage.customer.fullName}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vehicle</dt>
                <dd>
                  <Link href={`/vehicles/${damage.vehicle.id}`} className="hover:underline">
                    {damage.vehicle.registrationNumber} — {damage.vehicle.make} {damage.vehicle.model}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Damage Date</dt>
                <dd>{formatDate(damage.damageDate)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Damage Type</dt>
                <dd>{damage.damageType}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Estimated Cost</dt>
                <dd>{formatCurrency(damage.estimatedCost)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Customer Charge</dt>
                <dd className="font-semibold">{formatCurrency(damage.customerCharge)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Description</dt>
                <dd className="whitespace-pre-wrap">{damage.description}</dd>
              </div>
              {damage.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="whitespace-pre-wrap">{damage.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {canEdit && (
              <Button asChild className="w-full">
                <Link href={`/damages/${damage.id}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Damage
                </Link>
              </Button>
            )}
            {damage.paymentStatus === "PAID" && (
              <p className="text-sm text-muted-foreground">
                This damage record is locked because payment has been completed.
              </p>
            )}
            {canRecordPayment && (
              <DamagePaymentDialog
                damageId={damage.id}
                customerCharge={damage.customerCharge}
                paymentStatus={damage.paymentStatus}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

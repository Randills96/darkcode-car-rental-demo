import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { RentalForm } from "@/components/rentals/rental-form";
import { requirePermission } from "@/lib/auth/session";
import { getRentalById, getRentalFormOptions } from "@/lib/services/rental";
import { decimalToNumber, toDateInputValue } from "@/lib/utils";

interface EditRentalPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRentalPage({ params }: EditRentalPageProps) {
  await requirePermission("rentals.edit");
  const { id } = await params;
  const rental = await getRentalById(id);
  if (!rental) notFound();

  if (!["INQUIRY", "QUOTED", "CONFIRMED"].includes(rental.status)) {
    notFound();
  }

  const { customers, drivers, brokers, vehicles } = await getRentalFormOptions();

  const defaultValues = {
    customerId: rental.customerId,
    vehicleId: rental.vehicleId || "",
    rentalType: rental.rentalType,
    ratePlanType: rental.ratePlanType,
    pickupDate: toDateInputValue(rental.pickupDate),
    pickupTime: rental.pickupTime,
    returnDate: toDateInputValue(rental.returnDate),
    returnTime: rental.returnTime,
    pickupLocation: rental.pickupLocation || "",
    returnLocation: rental.returnLocation || "",
    dailyRate: decimalToNumber(rental.dailyRate),
    includedKm: rental.includedKm,
    includedKmExtraDay: rental.includedKm,
    extraKmRate: decimalToNumber(rental.extraKmRate),
    deliveryCharge: decimalToNumber(rental.deliveryCharge),
    driverCharge: decimalToNumber(rental.driverCharge),
    otherCharges: decimalToNumber(rental.otherCharges),
    discount: decimalToNumber(rental.discount),
    securityDeposit: decimalToNumber(rental.securityDeposit),
    advancePayment: decimalToNumber(rental.advancePayment),
    driverId: rental.driverId || "",
    brokerId: rental.brokerId || "",
    brokerCommissionPerDay:
      rental.brokerCommissionPerDay != null ? decimalToNumber(rental.brokerCommissionPerDay) : 0,
    brokerCommissionPerExtraKm:
      rental.brokerCommissionPerExtraKm != null
        ? decimalToNumber(rental.brokerCommissionPerExtraKm)
        : 0,
    ownerDailyRate:
      rental.ownerDailyRate != null ? decimalToNumber(rental.ownerDailyRate) : null,
    ownerExtraKmRate:
      rental.ownerExtraKmRate != null ? decimalToNumber(rental.ownerExtraKmRate) : null,
    startingOdometer: rental.startingOdometer,
    notes: rental.notes || "",
  };

  return (
    <DashboardShell title={`Edit ${rental.bookingNumber}`}>
      <PageHeader
        title={`Edit ${rental.bookingNumber}`}
        description="Update rental details before activation"
        backHref={`/rentals/${rental.id}`}
      />
      <RentalForm
        mode="edit"
        rentalId={rental.id}
        defaultValues={defaultValues}
        customers={customers}
        vehicles={vehicles}
        drivers={drivers}
        brokers={brokers}
      />
    </DashboardShell>
  );
}

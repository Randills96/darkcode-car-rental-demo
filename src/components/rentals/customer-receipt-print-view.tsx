import { formatDate } from "@/lib/utils";
import { COMPANY_LOGO_SRC } from "@/lib/branding";
import type { getCustomerReceiptData } from "@/lib/services/customer-receipt";

type ReceiptData = NonNullable<Awaited<ReturnType<typeof getCustomerReceiptData>>>;

function formatReceiptMoney(symbol: string, amount: number): string {
  return `${symbol} ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface CustomerReceiptPrintViewProps {
  data: ReceiptData;
}

export function CustomerReceiptPrintView({ data }: CustomerReceiptPrintViewProps) {
  const sym = data.currencySymbol;

  return (
    <article className="mx-auto w-full max-w-[210mm] bg-white p-8 text-gray-900 shadow-sm print:max-w-none print:p-6 print:shadow-none">
      <header className="rounded-md bg-[#0a1f5c] px-5 py-4 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={COMPANY_LOGO_SRC}
              alt={data.companyName}
              width={64}
              height={64}
              className="h-16 w-16 rounded-md object-cover"
            />
            <div>
              <h1 className="text-2xl font-bold">{data.companyName}</h1>
              <p className="mt-1 text-sm text-blue-100">Vehicle Rental — Customer Payment Receipt</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">Receipt No: {data.receiptNumber}</p>
            <p className="text-blue-100">Issued: {formatDate(data.issuedAt)}</p>
          </div>
        </div>
      </header>

      <section className="mt-5 grid gap-4 rounded-md border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-[#0f4c81]">Booking Details</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-gray-500">Booking No:</dt>
              <dd className="font-medium">{data.bookingNumber}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500">Rental Type:</dt>
              <dd>{data.rentalType}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500">Duration:</dt>
              <dd>{data.rentalDays} day(s)</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500">Vehicle:</dt>
              <dd>
                {data.vehicle
                  ? `${data.vehicle.registrationNumber} — ${data.vehicle.make} ${data.vehicle.model}`
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-[#0f4c81]">Customer</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-gray-500">Name:</dt>
              <dd className="font-medium">{data.customer.fullName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500">Phone:</dt>
              <dd>{data.customer.phone}</dd>
            </div>
            {data.customer.whatsapp && (
              <div className="flex gap-2">
                <dt className="text-gray-500">WhatsApp:</dt>
                <dd>{data.customer.whatsapp}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="text-gray-500">NIC:</dt>
              <dd>{data.customer.nic}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-4 border-l-4 border-[#0f4c81] bg-blue-50 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[#0f4c81]">Rental Period</p>
        <p className="mt-1 text-sm">
          {formatDate(data.pickupDate)} {data.pickupTime} to {formatDate(data.returnDate)}{" "}
          {data.returnTime}
        </p>
      </section>

      {data.mileage && (
        <section className="mt-4 rounded-md border border-green-200 bg-green-50 p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-emerald-700">Mileage Summary</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs uppercase text-gray-500">Starting odometer</p>
              <p className="font-semibold">
                {data.mileage.startingOdometer != null
                  ? `${data.mileage.startingOdometer.toLocaleString()} km`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Ending odometer</p>
              <p className="font-semibold">
                {data.mileage.endingOdometer != null
                  ? `${data.mileage.endingOdometer.toLocaleString()} km`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">KM driven</p>
              <p className="font-semibold">
                {data.mileage.totalKm != null ? `${data.mileage.totalKm.toLocaleString()} km` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Extra KM charged</p>
              <p className="font-semibold">
                {data.mileage.extraKm > 0 ? `${data.mileage.extraKm.toLocaleString()} km` : "None"}
              </p>
            </div>
          </div>
        </section>
      )}

      <ReceiptTable
        title="Charges"
        rows={data.chargeLines.map((line) => ({ label: line.label, amount: line.amount }))}
        totalLabel="Total Amount"
        totalAmount={data.finalTotal}
        sym={sym}
      />

      <ReceiptTable
        title="Payments Received"
        rows={data.payments.map((payment) => ({
          label: `${formatDate(payment.date)} | ${payment.code} | ${payment.type} (${payment.method})`,
          amount: payment.amount,
        }))}
        totalLabel="Total Paid"
        totalAmount={data.totalPaid}
        sym={sym}
      />

      {data.securityDeposits.length > 0 && (
        <section className="mt-4 rounded-md border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-600">Security Deposit (Reference Only)</h2>
          <ul className="mt-2 space-y-1 text-xs text-gray-600">
            {data.securityDeposits.map((deposit, index) => (
              <li key={index}>
                Collected {formatReceiptMoney(sym, deposit.collected)} · Refunded{" "}
                {formatReceiptMoney(sym, deposit.refunded)} · Status: {deposit.status}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 flex flex-col items-center gap-2">
        <span className="rounded bg-emerald-600 px-6 py-2 text-sm font-bold uppercase tracking-wide text-white">
          Paid in Full
        </span>
        <p className="text-xs text-gray-500">
          Balance due: {formatReceiptMoney(sym, data.balance)} | Total paid:{" "}
          {formatReceiptMoney(sym, data.totalPaid)}
        </p>
      </div>

      <footer className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
        <p>Thank you for choosing our service.</p>
        <p className="mt-1">
          This document confirms customer payments for the rental listed above. It is not a tax
          invoice for broker or owner settlements.
        </p>
        <p className="mt-1">
          {data.companyName} | Generated {formatDate(new Date())} | {data.currency}
        </p>
      </footer>
    </article>
  );
}

function ReceiptTable({
  title,
  rows,
  totalLabel,
  totalAmount,
  sym,
}: {
  title: string;
  rows: Array<{ label: string; amount: number }>;
  totalLabel: string;
  totalAmount: number;
  sym: string;
}) {
  return (
    <section className="mt-5">
      <h2 className="text-sm font-bold text-[#0f4c81]">{title}</h2>
      <table className="mt-2 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#0f4c81] text-left text-xs uppercase text-white">
            <th className="px-3 py-2 font-semibold">Description</th>
            <th className="px-3 py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="border border-gray-200 px-3 py-2">{row.label}</td>
              <td className="border border-gray-200 px-3 py-2 text-right font-medium">
                {formatReceiptMoney(sym, row.amount)}
              </td>
            </tr>
          ))}
          <tr className="bg-blue-50 font-bold text-[#0f4c81]">
            <td className="border border-[#0f4c81] px-3 py-2">{totalLabel}</td>
            <td className="border border-[#0f4c81] px-3 py-2 text-right">
              {formatReceiptMoney(sym, totalAmount)}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

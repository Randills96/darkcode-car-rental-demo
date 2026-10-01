import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getCustomerReceiptData } from "@/lib/services/customer-receipt";
import { CustomerReceiptPrintView } from "@/components/rentals/customer-receipt-print-view";
import { CustomerReceiptPrintToolbar } from "@/components/rentals/customer-receipt-print-toolbar";

interface CustomerReceiptPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerReceiptPage({ params }: CustomerReceiptPageProps) {
  await requirePermission("rentals.receipt");
  const { id } = await params;
  const data = await getCustomerReceiptData(id);

  if (!data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-6 print:bg-white print:px-0 print:py-0">
      <CustomerReceiptPrintToolbar />
      <CustomerReceiptPrintView data={data} />
    </div>
  );
}

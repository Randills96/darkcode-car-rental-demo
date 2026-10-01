import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { UserX } from "lucide-react";

export default function CustomerNotFound() {
  return (
    <DashboardShell title="Customer Not Found">
      <EmptyState
        icon={UserX}
        title="Customer not found"
        description="The customer you are looking for does not exist or has been removed."
        action={
          <Button asChild>
            <Link href="/customers">Back to Customers</Link>
          </Button>
        }
      />
    </DashboardShell>
  );
}

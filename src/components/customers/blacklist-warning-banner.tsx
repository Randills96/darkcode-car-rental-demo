import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface BlacklistWarningBannerProps {
  customerName: string;
  reason: string | null;
  shouldBlock?: boolean;
}

export function BlacklistWarningBanner({
  customerName,
  reason,
  shouldBlock = false,
}: BlacklistWarningBannerProps) {
  return (
    <Card className="border-red-300 bg-red-50">
      <CardContent className="flex items-start gap-3 pt-6">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-800">
            Warning: {customerName} is blacklisted
          </p>
          {reason && <p className="text-sm text-red-700 mt-1">Reason: {reason}</p>}
          <p className="text-xs text-red-600 mt-2">
            {shouldBlock
              ? "Booking is blocked for blacklisted customers per system settings."
              : "You may proceed with caution. Booking is not automatically blocked."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

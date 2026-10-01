import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toTelUrl } from "@/lib/phone";

interface CallCustomerButtonProps {
  phone: string | null | undefined;
  label?: string;
  size?: "sm" | "default";
}

export function CallCustomerButton({
  phone,
  label = "Call customer",
  size = "sm",
}: CallCustomerButtonProps) {
  const href = phone ? toTelUrl(phone) : null;
  if (!href) return null;

  return (
    <Button size={size} asChild>
      <a href={href}>
        <Phone className="mr-2 h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}

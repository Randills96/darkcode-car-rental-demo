"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { activateUserAfterPayment } from "@/app/users/actions";

interface ActivateUserButtonProps {
  userId: string;
  userName: string;
}

export function ActivateUserButton({ userId, userName }: ActivateUserButtonProps) {
  const router = useRouter();

  async function handleActivate() {
    const result = await activateUserAfterPayment(userId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm">
          <CheckCircle className="h-4 w-4 mr-1" />
          Activate after payment
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Activate {userName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Confirm that the annual fee has been paid to the company bank account.
            This restores access for one year.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleActivate}>Activate</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

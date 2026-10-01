"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteExpense } from "@/app/expenses/actions";

export function DeleteExpenseButton({ expenseId, expenseCode }: { expenseId: string; expenseCode: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (loading) return;
    if (!confirm(`Delete expense ${expenseCode}? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const result = await deleteExpense(expenseId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      router.push("/expenses");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="destructive" onClick={onDelete} disabled={loading}>
      {loading ? "Deleting..." : "Delete"}
    </Button>
  );
}

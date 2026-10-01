"use server";

import { revalidatePath } from "next/cache";
import { invalidateOperationalCaches } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit";
import { generateExpenseCode } from "@/lib/services/expense";
import { expenseFormSchema, type ExpenseFormValues } from "@/lib/validations/expense";
import type { ActionResult } from "@/app/customers/actions";

function parseDate(value: string): Date {
  return new Date(value);
}

export async function createExpense(input: ExpenseFormValues): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission("expenses.create");
    const parsed = expenseFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = parsed.data;

    const expense = await prisma.expense.create({
      data: {
        expenseCode: await generateExpenseCode(),
        category: data.category,
        amount: data.amount,
        expenseDate: parseDate(data.expenseDate),
        description: data.description,
        vehicleId: data.vehicleId || null,
        rentalId: data.rentalId || null,
        ownerId: data.ownerId || null,
        brokerId: data.brokerId || null,
        notes: data.notes || null,
        createdById: session.user.id,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entityType: "Expense",
      entityId: expense.id,
      details: {
        expenseCode: expense.expenseCode,
        category: data.category,
        amount: data.amount,
      },
    });

    revalidatePath("/expenses");
    if (data.vehicleId) revalidatePath(`/vehicles/${data.vehicleId}`);
    invalidateOperationalCaches();
    return { success: true, data: { id: expense.id }, message: "Expense recorded successfully" };
  } catch (error) {
    console.error("createExpense:", error);
    return { success: false, error: "Failed to record expense" };
  }
}

export async function updateExpense(
  id: string,
  input: ExpenseFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission("expenses.edit");
    const parsed = expenseFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Expense not found" };

    const data = parsed.data;
    await prisma.expense.update({
      where: { id },
      data: {
        category: data.category,
        amount: data.amount,
        expenseDate: parseDate(data.expenseDate),
        description: data.description,
        vehicleId: data.vehicleId || null,
        rentalId: data.rentalId || null,
        ownerId: data.ownerId || null,
        brokerId: data.brokerId || null,
        notes: data.notes || null,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "Expense",
      entityId: id,
      details: {
        expenseCode: existing.expenseCode,
        category: data.category,
        amount: data.amount,
      },
    });

    revalidatePath("/expenses");
    revalidatePath(`/expenses/${id}`);
    invalidateOperationalCaches();
    return { success: true, data: { id }, message: "Expense updated successfully" };
  } catch (error) {
    console.error("updateExpense:", error);
    return { success: false, error: "Failed to update expense" };
  }
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("expenses.delete");
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Expense not found" };

    await prisma.expense.delete({ where: { id } });

    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      entityType: "Expense",
      entityId: id,
      details: {
        expenseCode: existing.expenseCode,
        category: existing.category,
        amount: existing.amount.toString(),
      },
    });

    revalidatePath("/expenses");
    invalidateOperationalCaches();
    return { success: true, message: "Expense deleted successfully" };
  } catch (error) {
    console.error("deleteExpense:", error);
    return { success: false, error: "Failed to delete expense" };
  }
}

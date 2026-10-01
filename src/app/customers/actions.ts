"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit";
import {
  generateCustomerCode,
  isNicTaken,
  findCustomerByNic,
  customerToCsvRows,
  getBlacklistedCustomers,
} from "@/lib/services/customer";
import {
  customerFormSchema,
  customerDocumentSchema,
  blacklistSchema,
  removeBlacklistSchema,
  type CustomerFormValues,
  type CustomerDocumentFormValues,
  type BlacklistFormValues,
  type RemoveBlacklistFormValues,
} from "@/lib/validations/customer";

export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function normalizeNic(nic: string): string {
  return nic.trim().toUpperCase();
}

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function saveUploadedCustomerDocumentImage(
  customerId: string,
  fileEntry: FormDataEntryValue | null
): Promise<{ filePath: string | null; compressedSize?: number; error?: string }> {
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return { filePath: null };
  }

  const { compressDocumentImage, isAllowedImageMimeType } = await import(
    "@/lib/uploads/image-compress"
  );
  const { saveCustomerDocumentImage } = await import("@/lib/uploads/customer-documents");

  if (!isAllowedImageMimeType(fileEntry.type, fileEntry.name)) {
    return {
      filePath: null,
      error: "Please upload a valid image file (JPG, PNG, WEBP, etc.)",
    };
  }

  try {
    const inputBuffer = Buffer.from(await fileEntry.arrayBuffer());
    const compressed = await compressDocumentImage(inputBuffer);
    const filePath = await saveCustomerDocumentImage(
      customerId,
      compressed.buffer,
      compressed.extension
    );

    return { filePath, compressedSize: compressed.sizeBytes };
  } catch (err) {
    console.warn("Could not compress/save customer document image:", err);
    return {
      filePath: null,
      error: err instanceof Error ? err.message : "Failed to save image",
    };
  }
}

export async function createCustomer(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission("customers.create");
    const parsed = customerFormSchema.safeParse({
      fullName: formValue(formData, "fullName"),
      nic: formValue(formData, "nic"),
      passportNumber: formValue(formData, "passportNumber"),
      phone: formValue(formData, "phone"),
      whatsapp: formValue(formData, "whatsapp"),
      address: formValue(formData, "address"),
      drivingLicenceNumber: formValue(formData, "drivingLicenceNumber"),
      drivingLicenceExpiry: formValue(formData, "drivingLicenceExpiry"),
      emergencyContact: formValue(formData, "emergencyContact"),
      notes: formValue(formData, "notes"),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = parsed.data;
    const nic = normalizeNic(data.nic);

    const existingRecord = await findCustomerByNic(nic);
    let customer: { id: string; customerCode: string; fullName: string; nic: string };
    let isRestoration = false;

    if (existingRecord) {
      if (!existingRecord.deletedAt) {
        return { success: false, error: "A customer with this NIC already exists" };
      }

      // Customer was previously soft-deleted. Reactivate and update with new details!
      isRestoration = true;
      customer = await prisma.customer.update({
        where: { id: existingRecord.id },
        data: {
          deletedAt: null,
          fullName: data.fullName.trim(),
          passportNumber: data.passportNumber || null,
          phone: data.phone.trim(),
          whatsapp: data.whatsapp || null,
          address: data.address.trim(),
          drivingLicenceNumber: data.drivingLicenceNumber || null,
          drivingLicenceExpiry: parseDate(data.drivingLicenceExpiry),
          emergencyContact: data.emergencyContact || null,
          notes: data.notes || null,
          status: "NORMAL",
          updatedById: session.user.id,
        },
      });
    } else {
      const customerCode = await generateCustomerCode();
      customer = await prisma.customer.create({
        data: {
          customerCode,
          fullName: data.fullName.trim(),
          nic,
          passportNumber: data.passportNumber || null,
          phone: data.phone.trim(),
          whatsapp: data.whatsapp || null,
          address: data.address.trim(),
          drivingLicenceNumber: data.drivingLicenceNumber || null,
          drivingLicenceExpiry: parseDate(data.drivingLicenceExpiry),
          emergencyContact: data.emergencyContact || null,
          notes: data.notes || null,
          createdById: session.user.id,
        },
      });
    }

    const drivingLicenceFrontImage = formData.get("drivingLicenceFrontImage");
    const drivingLicenceBackImage = formData.get("drivingLicenceBackImage");
    const customerPhotoImage = formData.get("customerPhotoImage");
    const savedPaths: string[] = [];
    const uploadWarnings: string[] = [];

    const licenceSides = [
      { file: drivingLicenceFrontImage, notes: "Driving licence front side" },
      { file: drivingLicenceBackImage, notes: "Driving licence back side" },
    ] as const;

    for (const side of licenceSides) {
      try {
        const dlUpload = await saveUploadedCustomerDocumentImage(customer.id, side.file);
        if (dlUpload.error) {
          uploadWarnings.push(dlUpload.error);
        } else if (dlUpload.filePath) {
          savedPaths.push(dlUpload.filePath);
          await prisma.customerDocument.create({
            data: {
              customerId: customer.id,
              documentType: "DRIVING_LICENCE",
              documentNumber: data.drivingLicenceNumber || null,
              expiryDate: parseDate(data.drivingLicenceExpiry),
              filePath: dlUpload.filePath,
              notes: side.notes,
            },
          });
        }
      } catch (uploadErr) {
        console.warn("Licence upload error:", uploadErr);
        uploadWarnings.push("Could not save driving licence image");
      }
    }

    try {
      const photoUpload = await saveUploadedCustomerDocumentImage(
        customer.id,
        customerPhotoImage
      );
      if (photoUpload.error) {
        uploadWarnings.push(photoUpload.error);
      } else if (photoUpload.filePath) {
        savedPaths.push(photoUpload.filePath);
        await prisma.customerDocument.create({
          data: {
            customerId: customer.id,
            documentType: "CUSTOMER_PHOTO",
            filePath: photoUpload.filePath,
            notes: "Customer photo taken at registration",
          },
        });
      }
    } catch (uploadErr) {
      console.warn("Customer photo upload error:", uploadErr);
      uploadWarnings.push("Could not save customer photo");
    }

    await createAuditLog({
      userId: session.user.id,
      action: isRestoration ? "UPDATE" : "CREATE",
      entityType: "Customer",
      entityId: customer.id,
      details: {
        customerCode: customer.customerCode,
        fullName: customer.fullName,
        nic: customer.nic,
        documentsUploaded: savedPaths.length,
        restored: isRestoration,
      },
    });

    revalidatePath("/customers");
    const successMsg = isRestoration
      ? "Customer profile restored and updated successfully"
      : uploadWarnings.length > 0
      ? "Customer created successfully. Note: some photos could not be saved to storage."
      : "Customer created successfully";

    return {
      success: true,
      data: { id: customer.id },
      message: successMsg,
    };
  } catch (error) {
    console.error("createCustomer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create customer",
    };
  }
}

export async function updateCustomer(
  id: string,
  input: CustomerFormValues
): Promise<ActionResult> {
  try {
    const session = await requirePermission("customers.edit");
    const parsed = customerFormSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const existing = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return { success: false, error: "Customer not found" };
    }

    const data = parsed.data;
    const nic = normalizeNic(data.nic);

    if (await isNicTaken(nic, id)) {
      return { success: false, error: "A customer with this NIC already exists" };
    }

    await prisma.customer.update({
      where: { id },
      data: {
        fullName: data.fullName.trim(),
        nic,
        passportNumber: data.passportNumber || null,
        phone: data.phone.trim(),
        whatsapp: data.whatsapp || null,
        address: data.address.trim(),
        drivingLicenceNumber: data.drivingLicenceNumber || null,
        drivingLicenceExpiry: parseDate(data.drivingLicenceExpiry),
        emergencyContact: data.emergencyContact || null,
        notes: data.notes || null,
        updatedById: session.user.id,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "Customer",
      entityId: id,
      details: { fullName: data.fullName, nic },
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: true, message: "Customer updated successfully" };
  } catch (error) {
    console.error("updateCustomer:", error);
    return { success: false, error: "Failed to update customer" };
  }
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("customers.delete");

    const existing = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: { rentals: { where: { status: "ACTIVE" }, take: 1 } },
    });

    if (!existing) {
      return { success: false, error: "Customer not found" };
    }

    if (existing.rentals.length > 0) {
      return { success: false, error: "Cannot delete customer with active rentals" };
    }

    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: session.user.id },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      entityType: "Customer",
      entityId: id,
      details: { customerCode: existing.customerCode },
    });

    revalidatePath("/customers");
    return { success: true, message: "Customer deleted successfully" };
  } catch (error) {
    console.error("deleteCustomer:", error);
    return { success: false, error: "Failed to delete customer" };
  }
}

export async function blacklistCustomer(
  id: string,
  input: BlacklistFormValues
): Promise<ActionResult> {
  try {
    const session = await requirePermission("customers.blacklist");
    const parsed = blacklistSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const existing = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return { success: false, error: "Customer not found" };
    }

    if (existing.status === "BLACKLISTED") {
      return { success: false, error: "Customer is already blacklisted" };
    }

    await prisma.$transaction([
      prisma.customer.update({
        where: { id },
        data: {
          status: "BLACKLISTED",
          blacklistReason: parsed.data.reason,
          blacklistDate: new Date(),
          blacklistedById: session.user.id,
          updatedById: session.user.id,
        },
      }),
      prisma.customerBlacklist.create({
        data: {
          customerId: id,
          reason: parsed.data.reason,
          notes: parsed.data.notes || null,
          action: "BLACKLISTED",
          createdById: session.user.id,
        },
      }),
    ]);

    await createAuditLog({
      userId: session.user.id,
      action: "BLACKLIST",
      entityType: "Customer",
      entityId: id,
      details: { reason: parsed.data.reason },
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    revalidatePath("/customers/blacklisted");
    return { success: true, message: "Customer blacklisted successfully" };
  } catch (error) {
    console.error("blacklistCustomer:", error);
    return { success: false, error: "Failed to blacklist customer" };
  }
}

export async function removeBlacklist(
  id: string,
  input: RemoveBlacklistFormValues
): Promise<ActionResult> {
  try {
    const session = await requirePermission("customers.blacklist");
    const parsed = removeBlacklistSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: "Validation failed" };
    }

    const existing = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return { success: false, error: "Customer not found" };
    }

    if (existing.status !== "BLACKLISTED") {
      return { success: false, error: "Customer is not blacklisted" };
    }

    await prisma.$transaction([
      prisma.customer.update({
        where: { id },
        data: {
          status: "NORMAL",
          blacklistReason: null,
          blacklistDate: null,
          blacklistedById: null,
          updatedById: session.user.id,
        },
      }),
      prisma.customerBlacklist.create({
        data: {
          customerId: id,
          reason: "Blacklist removed",
          notes: parsed.data.notes || null,
          action: "REMOVED",
          createdById: session.user.id,
        },
      }),
    ]);

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "Customer",
      entityId: id,
      details: { action: "blacklist_removed" },
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    revalidatePath("/customers/blacklisted");
    return { success: true, message: "Blacklist removed successfully" };
  } catch (error) {
    console.error("removeBlacklist:", error);
    return { success: false, error: "Failed to remove blacklist" };
  }
}

export async function addCustomerDocument(
  customerId: string,
  formData: FormData
): Promise<ActionResult<{ compressedSize?: number }>> {
  try {
    const session = await requirePermission("customers.edit");

    const parsed = customerDocumentSchema.safeParse({
      documentType: formData.get("documentType"),
      documentNumber: formData.get("documentNumber") ?? "",
      issueDate: formData.get("issueDate") ?? "",
      expiryDate: formData.get("expiryDate") ?? "",
      notes: formData.get("notes") ?? "",
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    const data = parsed.data;
    const fileEntry = formData.get("file");
    let filePath: string | null = null;
    let compressedSize: number | undefined;

    try {
      const upload = await saveUploadedCustomerDocumentImage(customerId, fileEntry);
      if (upload.error) {
        return { success: false, error: upload.error };
      }
      filePath = upload.filePath;
      compressedSize = upload.compressedSize;

      const document = await prisma.customerDocument.create({
        data: {
          customerId,
          documentType: data.documentType,
          documentNumber: data.documentNumber || null,
          issueDate: parseDate(data.issueDate),
          expiryDate: parseDate(data.expiryDate),
          filePath,
          notes: data.notes || null,
        },
      });

      await createAuditLog({
        userId: session.user.id,
        action: "CREATE",
        entityType: "CustomerDocument",
        entityId: document.id,
        details: {
          customerId,
          documentType: data.documentType,
          hasFile: !!filePath,
          compressedSize,
        },
      });

      revalidatePath(`/customers/${customerId}`);
      return {
        success: true,
        data: { compressedSize },
        message: filePath
          ? `Document added and image saved (${compressedSize ? `${Math.round(compressedSize / 1024)} KB` : "compressed"})`
          : "Document added successfully",
      };
    } catch (error) {
      const { deleteCustomerDocumentFile } = await import("@/lib/uploads/customer-documents");
      await deleteCustomerDocumentFile(filePath);
      throw error;
    }
  } catch (error) {
    console.error("addCustomerDocument:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add document",
    };
  }
}

export async function updateCustomerDocument(
  documentId: string,
  customerId: string,
  formData: FormData
): Promise<ActionResult<{ compressedSize?: number }>> {
  try {
    const session = await requirePermission("customers.edit");

    const parsed = customerDocumentSchema.safeParse({
      documentType: formData.get("documentType"),
      documentNumber: formData.get("documentNumber") ?? "",
      issueDate: formData.get("issueDate") ?? "",
      expiryDate: formData.get("expiryDate") ?? "",
      notes: formData.get("notes") ?? "",
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const existing = await prisma.customerDocument.findFirst({
      where: { id: documentId, customerId },
    });

    if (!existing) {
      return { success: false, error: "Document not found" };
    }

    const data = parsed.data;
    const fileEntry = formData.get("file");
    let nextFilePath = existing.filePath;
    let compressedSize: number | undefined;
    let previousFilePath: string | null = null;

    try {
      const upload = await saveUploadedCustomerDocumentImage(customerId, fileEntry);
      if (upload.error) {
        return { success: false, error: upload.error };
      }
      if (upload.filePath) {
        previousFilePath = existing.filePath;
        nextFilePath = upload.filePath;
        compressedSize = upload.compressedSize;
      }

      await prisma.customerDocument.update({
        where: { id: documentId },
        data: {
          documentType: data.documentType,
          documentNumber: data.documentNumber || null,
          issueDate: parseDate(data.issueDate),
          expiryDate: parseDate(data.expiryDate),
          filePath: nextFilePath,
          notes: data.notes || null,
        },
      });

      if (previousFilePath && previousFilePath !== nextFilePath) {
        const { deleteCustomerDocumentFile } = await import("@/lib/uploads/customer-documents");
        await deleteCustomerDocumentFile(previousFilePath);
      }

      await createAuditLog({
        userId: session.user.id,
        action: "UPDATE",
        entityType: "CustomerDocument",
        entityId: documentId,
        details: {
          customerId,
          documentType: data.documentType,
          replacedFile: !!upload.filePath,
          compressedSize,
        },
      });

      revalidatePath(`/customers/${customerId}`);
      return {
        success: true,
        data: { compressedSize },
        message: upload.filePath
          ? "Document updated and image replaced"
          : "Document updated successfully",
      };
    } catch (error) {
      if (nextFilePath && nextFilePath !== existing.filePath) {
        const { deleteCustomerDocumentFile } = await import("@/lib/uploads/customer-documents");
        await deleteCustomerDocumentFile(nextFilePath);
      }
      throw error;
    }
  } catch (error) {
    console.error("updateCustomerDocument:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update document",
    };
  }
}

export async function deleteCustomerDocument(
  documentId: string,
  customerId: string
): Promise<ActionResult> {
  try {
    const session = await requirePermission("customers.edit");

    const document = await prisma.customerDocument.findFirst({
      where: { id: documentId, customerId },
      select: { filePath: true },
    });

    if (!document) {
      return { success: false, error: "Document not found" };
    }

    await prisma.customerDocument.delete({ where: { id: documentId } });

    const { deleteCustomerDocumentFile } = await import("@/lib/uploads/customer-documents");
    await deleteCustomerDocumentFile(document.filePath);

    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      entityType: "CustomerDocument",
      entityId: customerId,
      details: { documentId },
    });

    revalidatePath(`/customers/${customerId}`);
    return { success: true, message: "Document deleted successfully" };
  } catch (error) {
    console.error("deleteCustomerDocument:", error);
    return { success: false, error: "Failed to delete document" };
  }
}

export async function exportBlacklistedCustomers(search?: string): Promise<ActionResult<{ csv: string }>> {
  try {
    await requirePermission("reports.export");

    const { customers } = await getBlacklistedCustomers({ search, page: 1, limit: 10000 });
    const csv = customerToCsvRows(customers);

    return { success: true, data: { csv } };
  } catch (error) {
    console.error("exportBlacklistedCustomers:", error);
    return { success: false, error: "Failed to export data" };
  }
}

export async function checkCustomerBlacklistWarning(customerId: string) {
  await requireAuth();

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      status: true,
      blacklistReason: true,
      blacklistDate: true,
    },
  });

  if (!customer) return null;

  const blockSetting = await prisma.systemSetting.findUnique({
    where: { key: "block_blacklisted_booking" },
  });

  return {
    isBlacklisted: customer.status === "BLACKLISTED",
    fullName: customer.fullName,
    reason: customer.blacklistReason,
    blacklistDate: customer.blacklistDate,
    shouldBlock: blockSetting?.value === "true",
  };
}

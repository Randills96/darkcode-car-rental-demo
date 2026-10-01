"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { customerFormSchema, type CustomerFormValues } from "@/lib/validations/customer";
import { createCustomer, updateCustomer } from "@/app/customers/actions";
import { DocumentImageUpload } from "@/components/customers/document-image-upload";
import { LicenceScanPanel } from "@/components/customers/licence-scan-panel";
import type { DrivingLicenceScanResult } from "@/lib/ai/document-scan";
import { toDateInputValue, normalizePhone, normalizeNic } from "@/lib/utils";

interface CustomerFormProps {
  mode: "create" | "edit";
  customerId?: string;
  defaultValues?: Partial<CustomerFormValues>;
}

const emptyDefaults: CustomerFormValues = {
  fullName: "",
  nic: "",
  passportNumber: "",
  phone: "",
  whatsapp: "",
  address: "",
  drivingLicenceNumber: "",
  drivingLicenceExpiry: "",
  emergencyContact: "",
  notes: "",
};

export function CustomerForm({ mode, customerId, defaultValues }: CustomerFormProps) {
  const router = useRouter();
  const [drivingLicenceFrontFile, setDrivingLicenceFrontFile] = useState<File | null>(null);
  const [drivingLicenceBackFile, setDrivingLicenceBackFile] = useState<File | null>(null);
  const [customerPhotoFile, setCustomerPhotoFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { ...emptyDefaults, ...defaultValues },
  });

  async function onSubmit(data: CustomerFormValues) {
    const cleanedData = {
      ...data,
      fullName: data.fullName.trim(),
      nic: normalizeNic(data.nic),
      passportNumber: data.passportNumber?.trim() ?? "",
      phone: normalizePhone(data.phone),
      whatsapp: data.whatsapp ? normalizePhone(data.whatsapp) : "",
      address: data.address.trim(),
      drivingLicenceNumber: data.drivingLicenceNumber?.trim() ?? "",
      drivingLicenceExpiry: data.drivingLicenceExpiry ?? "",
      emergencyContact: data.emergencyContact ? normalizePhone(data.emergencyContact) : "",
      notes: data.notes?.trim() ?? "",
    };

    if (mode === "create") {
      const formData = new FormData();
      formData.set("fullName", cleanedData.fullName);
      formData.set("nic", cleanedData.nic);
      formData.set("passportNumber", cleanedData.passportNumber);
      formData.set("phone", cleanedData.phone);
      formData.set("whatsapp", cleanedData.whatsapp);
      formData.set("address", cleanedData.address);
      formData.set("drivingLicenceNumber", cleanedData.drivingLicenceNumber);
      formData.set("drivingLicenceExpiry", cleanedData.drivingLicenceExpiry);
      formData.set("emergencyContact", cleanedData.emergencyContact);
      formData.set("notes", cleanedData.notes);
      if (drivingLicenceFrontFile) {
        formData.set("drivingLicenceFrontImage", drivingLicenceFrontFile);
      }
      if (drivingLicenceBackFile) {
        formData.set("drivingLicenceBackImage", drivingLicenceBackFile);
      }
      if (customerPhotoFile) {
        formData.set("customerPhotoImage", customerPhotoFile);
      }

      const result = await createCustomer(formData);
      if (!result.success) {
        if (result.fieldErrors) {
          const firstError = Object.values(result.fieldErrors)[0]?.[0];
          toast.error(firstError || result.error);
        } else {
          toast.error(result.error);
        }
        return;
      }

      toast.success(result.message || "Customer created successfully");
      router.push(`/customers/${result.data?.id}`);
      router.refresh();
      return;
    }

    const result = await updateCustomer(customerId!, cleanedData);

    if (!result.success) {
      if (result.fieldErrors) {
        const firstError = Object.values(result.fieldErrors)[0]?.[0];
        toast.error(firstError || result.error);
      } else {
        toast.error(result.error);
      }
      return;
    }

    toast.success(result.message || "Saved successfully");
    router.push(`/customers/${customerId}`);
    router.refresh();
  }

  function applyLicenceScan(result: DrivingLicenceScanResult) {
    const options = { shouldDirty: true, shouldTouch: true, shouldValidate: true } as const;
    if (result.fullName) setValue("fullName", result.fullName.trim(), options);
    if (result.nic) setValue("nic", normalizeNic(result.nic), options);
    if (result.address) setValue("address", result.address.trim(), options);
    if (result.drivingLicenceNumber) {
      setValue("drivingLicenceNumber", result.drivingLicenceNumber.trim(), options);
    }
    if (result.drivingLicenceExpiry) {
      setValue("drivingLicenceExpiry", result.drivingLicenceExpiry, options);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {mode === "create" && (
        <Card>
          <CardHeader>
            <CardTitle>Scan driving licence</CardTitle>
          </CardHeader>
          <CardContent>
            <LicenceScanPanel
              disabled={isSubmitting}
              frontFile={drivingLicenceFrontFile}
              backFile={drivingLicenceBackFile}
              onFrontChange={setDrivingLicenceFrontFile}
              onBackChange={setDrivingLicenceBackFile}
              onFilled={applyLicenceScan}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Textarea
              id="fullName"
              {...register("fullName")}
              rows={3}
              className="min-h-[5.5rem] resize-y text-base"
              placeholder="Full name as printed on the driving licence, including initials"
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nic">NIC Number *</Label>
              <Input
                id="nic"
                {...register("nic")}
                placeholder="199012345678"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                inputMode="text"
              />
              {errors.nic && <p className="text-sm text-destructive">{errors.nic.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="passportNumber">Passport Number</Label>
              <Input id="passportNumber" {...register("passportNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input id="phone" {...register("phone")} placeholder="0771234567" />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp Number</Label>
              <Input id="whatsapp" {...register("whatsapp")} placeholder="0771234567" />
              {errors.whatsapp && (
                <p className="text-sm text-destructive">{errors.whatsapp.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <Input id="emergencyContact" {...register("emergencyContact")} placeholder="0770000000" />
              {errors.emergencyContact && (
                <p className="text-sm text-destructive">{errors.emergencyContact.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              {...register("address")}
              rows={5}
              className="min-h-[8.5rem] resize-y text-base"
              placeholder="Full residential address from licence field 8 (front or back)"
            />
            {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="drivingLicenceNumber">Driving Licence Number</Label>
              <Input id="drivingLicenceNumber" {...register("drivingLicenceNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drivingLicenceExpiry">Driving Licence Expiry</Label>
              <Input id="drivingLicenceExpiry" type="date" {...register("drivingLicenceExpiry")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} rows={3} />
          </div>
        </CardContent>
      </Card>

      {mode === "create" && (
        <Card>
          <CardHeader>
            <CardTitle>Photos &amp; Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Optional at registration. Saved to the customer&apos;s Documents tab so repeat
              customers do not need new photos every visit. Driving licence photos are added
              at the top of this form.
            </p>
            <div className="space-y-2">
              <Label>Customer Photo</Label>
              <DocumentImageUpload
                disabled={isSubmitting}
                onFileChange={setCustomerPhotoFile}
                label="Upload customer photo"
                hint="Clear face photo for identification"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : mode === "create" ? "Create Customer" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

export { customerToFormValues } from "@/lib/mappers/customer";

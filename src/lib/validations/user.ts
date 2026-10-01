import { z } from "zod";

export const userFormSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    email: z.string().email("Invalid email address"),
    phone: z.string().max(20).optional().or(z.literal("")),
    role: z.enum(["SUPER_ADMIN", "ADMIN", "EMPLOYEE", "DRIVER"]),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    password: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.password || data.confirmPassword) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    { message: "Passwords do not match", path: ["confirmPassword"] }
  )
  .refine(
    (data) => {
      if (data.password && data.password.length > 0) {
        return data.password.length >= 8;
      }
      return true;
    },
    { message: "Password must be at least 8 characters", path: ["password"] }
  );

export const userCreateSchema = userFormSchema.refine(
  (data) => !!data.password && data.password.length >= 8,
  { message: "Password is required (min 8 characters)", path: ["password"] }
);

export type UserFormValues = z.infer<typeof userFormSchema>;

export const userSearchSchema = z.object({
  search: z.string().optional(),
  role: z.enum(["ALL", "SUPER_ADMIN", "ADMIN", "EMPLOYEE", "DRIVER"]).optional(),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type UserSearchParams = z.infer<typeof userSearchSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

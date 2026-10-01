import { z } from "zod";

export const auditSearchSchema = z.object({
  search: z.string().optional(),
  entityType: z.string().optional(),
  action: z
    .enum(["ALL", "CREATE", "UPDATE", "DELETE", "BLACKLIST", "PAYMENT", "SETTLEMENT", "ASSIGN", "STATUS_CHANGE"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export type AuditSearchParams = z.infer<typeof auditSearchSchema>;

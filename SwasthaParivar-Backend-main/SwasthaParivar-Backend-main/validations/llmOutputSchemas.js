import { z } from "zod";

export const reportReviewSchema = z.object({
  isHealthReport: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  documentType: z.string().max(120).default(""),
  reason: z.string().max(320).default(""),
  summary: z.string().max(1500).default("")
});

export const attachmentTriageSchema = z.object({
  attachmentType: z.enum(["report", "medicine", "other"]).default("other"),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  documentType: z.string().max(120).default(""),
  medicineName: z.string().max(120).default(""),
  reason: z.string().max(320).default(""),
  summary: z.string().max(2400).default("")
});

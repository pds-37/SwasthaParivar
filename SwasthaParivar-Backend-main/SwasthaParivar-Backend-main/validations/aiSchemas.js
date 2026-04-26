import { z } from "zod";
import { objectIdSchema, paginationSchema } from "./commonSchemas.js";

export const aiChatSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  member: z.string().trim().max(120).optional(),
  history: z
    .array(
      z.object({
        sender: z.enum(["user", "ai"]),
        text: z.string().trim().max(2000),
        ts: z.number().optional(),
      })
    )
    .max(8)
    .optional(),
});

export const aiStreamingChatSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  memberId: objectIdSchema.optional().nullable(),
  language: z.string().trim().max(8).optional(),
  collectedData: z.record(z.string(), z.any()).optional(),
  chatHistory: z
    .array(
      z.object({
        sender: z.enum(["user", "ai"]),
        text: z.string().trim().max(4000),
        ts: z.number().optional(),
      })
    )
    .max(15)
    .optional(),
});

export const aiAttachmentSchema = z.object({
  imageData: z.string().min(20),
  mimeType: z.string().refine((value) => value.startsWith("image/") || value === "application/pdf", {
    message: "Only image and PDF uploads are supported",
  }),
  fileName: z.string().trim().max(255).optional(),
  member: z.string().trim().max(120).optional(),
});

export const aiVoiceTranscriptionSchema = z.object({
  audioData: z.string().min(100).max(15_000_000),
  mimeType: z.string().trim().min(1).max(64),
  language: z.string().trim().max(12).optional(),
});

export const aiMemoryQuerySchema = z.object({
  member: z.string().trim().max(120).optional(),
  contextKey: z.string().trim().max(120).optional(),
});

export const aiMemoryBodySchema = z.object({
  threadId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid thread ID").optional(),
  title: z.string().trim().max(120).optional(),
  member: z.string().trim().min(1).max(120),
  contextKey: z.string().trim().min(1).max(120).optional(),
  messages: z.array(
    z.object({
      sender: z.enum(["user", "ai"]),
      text: z.string().trim().max(12000),
      ts: z.number().optional(),
      attachment: z.string().max(2_000_000).optional().nullable(),
      riskLevel: z.string().trim().max(32).optional(),
      followUpPrompt: z.string().trim().max(400).optional().nullable(),
      suggestedReminder: z
        .object({
          title: z.string().trim().max(160),
          type: z.string().trim().max(60).optional(),
        })
        .optional()
        .nullable(),
    })
  ),
});

export const aiInsightQuerySchema = paginationSchema.extend({
  memberId: objectIdSchema.optional(),
});

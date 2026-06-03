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
  member: z.string().trim().max(120).optional().nullable(),
  contextKey: z.string().trim().max(120).optional().nullable(),
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
      riskLevel: z.string().trim().max(32).optional().nullable(),
      triageSummary: z
        .object({
          tier: z.string().trim().max(32).optional(),
          label: z.string().trim().max(120).optional(),
          action: z.string().trim().max(240).optional(),
          contextSignals: z.array(z.string().trim().max(160)).max(6).optional(),
          profileGaps: z.array(z.string().trim().max(120)).max(5).optional(),
          doctorPacket: z.array(z.string().trim().max(220)).max(6).optional(),
          trendFlags: z.array(z.string().trim().max(220)).max(6).optional(),
          sourceReferences: z
            .array(
              z.object({
                title: z.string().trim().max(160).optional(),
                source: z.string().trim().max(220).optional(),
                url: z.string().trim().max(500).optional(),
              })
            )
            .max(6)
            .optional(),
        })
        .optional()
        .nullable(),
      intakeQuestions: z
        .array(
          z.object({
            id: z.string().trim().max(60),
            label: z.string().trim().max(80),
            prompt: z.string().trim().max(300),
          })
        )
        .max(4)
        .optional()
        .nullable(),
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

const packetStringList = z.array(z.string().trim().max(240)).max(12).optional();

export const doctorPacketQuerySchema = paginationSchema.extend({
  memberId: objectIdSchema.optional(),
});

export const doctorPacketParamsSchema = z.object({
  id: objectIdSchema,
});

export const doctorPacketCreateSchema = z.object({
  memberId: objectIdSchema,
  episodeId: objectIdSchema.optional().nullable(),
  source: z.enum(["ai_chat", "symptom_episode", "manual"]).optional(),
  triageTier: z.string().trim().max(40).optional(),
  riskLevel: z.string().trim().max(40).optional(),
  summary: z.string().trim().min(1).max(4000),
  userConcern: z.string().trim().max(1200).optional(),
  symptomTimeline: packetStringList,
  remediesTried: packetStringList,
  warningsTriggered: packetStringList,
  contextChecked: packetStringList,
  missingContext: packetStringList,
  doctorNotes: packetStringList,
  latestVitals: z.record(z.string(), z.any()).optional(),
  trendFlags: packetStringList,
  sourceReferences: z
    .array(
      z.object({
        title: z.string().trim().max(160).optional(),
        source: z.string().trim().max(220).optional(),
        url: z.string().trim().max(500).optional(),
      })
    )
    .max(8)
    .optional(),
});

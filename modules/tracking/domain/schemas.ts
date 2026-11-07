import { z } from "zod";
export const statusSchema = z.enum([
  "registered",
  "in_review",
  "for_signature",
  "in_transit",
  "returned",
  "completed",
]);
export const eventInputSchema = z.object({
  packetId: z.uuid(),
  submissionKey: z.uuid(),
  expectedVersion: z.number().int().positive(),
  actionTemplateId: z.uuid(),
  processingStatus: statusSchema,
  reportedDestinationId: z.uuid(),
  documentIds: z
    .array(z.uuid())
    .min(1)
    .max(100)
    .refine((v) => new Set(v).size === v.length, "Choose each document once."),
  remarks: z.string().trim().max(2000).optional(),
  transferId: z.uuid().optional(),
  receiptRecipient: z.string().trim().min(1).max(120).optional(),
  receiptReference: z.string().trim().min(1).max(240).optional(),
});
export type EventInput = z.infer<typeof eventInputSchema>;
export const createPacketSchema = z.object({
  submissionKey: z.uuid(),
  prNumber: z.string().trim().min(1).max(80),
  description: z.string().trim().min(3).max(1000),
  originDestinationId: z.uuid(),
  documents: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(240),
        page_count: z.number().int().min(1).max(10000),
      }),
    )
    .min(1)
    .max(100),
});
export const destinationSchema = z.object({
  id: z.uuid().nullable(),
  name: z.string().trim().min(3).max(120),
  details: z.string().max(500),
  active: z.boolean(),
});
export const templateSchema = z.object({
  id: z.uuid().nullable(),
  label: z.string().trim().min(3).max(120),
  description: z.string().max(500),
  active: z.boolean(),
});
export const accessSchema = z.object({
  profileId: z.uuid(),
  role: z.enum(["admin", "staff"]),
  active: z.boolean(),
});
export const externalLinkSchema = z.object({
  packetId: z.uuid(),
  sourceSystem: z.string().trim().min(1).max(80),
  externalRecordId: z.string().trim().min(1).max(240),
});

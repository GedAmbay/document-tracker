import { z } from "zod";

export const documentIdSchema = z.uuid().brand<"DocumentId">();
export const qrIdSchema = z.uuid().brand<"QrId">();
export type DocumentId = z.infer<typeof documentIdSchema>;
export type QrId = z.infer<typeof qrIdSchema>;

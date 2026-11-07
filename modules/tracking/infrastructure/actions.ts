"use server";
import { revalidatePath } from "next/cache";
import {
  getAuthorizedUser,
  AccessDenied,
} from "@/modules/auth/infrastructure/guards";
import {
  createPacketSchema,
  eventInputSchema,
  destinationSchema,
  templateSchema,
  accessSchema,
  externalLinkSchema,
} from "../domain/schemas";
import type { Json } from "@/lib/supabase/database.types";
type Result =
  | { ok: true; value: Json | undefined }
  | { ok: false; error: string; code: string };
function failure(error: unknown): Result {
  if (error instanceof AccessDenied)
    return { ok: false, error: error.message, code: "forbidden" };
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  const message =
    code === "40001"
      ? "This packet has changed or a selected document already has a pending transfer. Reload and retry."
      : code === "23505"
        ? "This submission key or external link is already used with different details."
        : code === "42501"
          ? "You do not have permission to perform this action."
          : code === "22023" || code === "23514"
            ? "Check the selected documents, destination and receipt details. A receipt must match a pending transfer."
            : "The operation could not be completed. Check your input and retry.";
  return { ok: false, error: message, code: code || "invalid_request" };
}
export async function registerPacketAction(input: unknown): Promise<Result> {
  try {
    const { client } = await getAuthorizedUser(false, true);
    const v = createPacketSchema.parse(input);
    const { data, error } = await client.rpc("create_tracking_packet", {
      p_submission_key: v.submissionKey,
      p_pr_number: v.prNumber,
      p_description: v.description,
      p_origin_destination_id: v.originDestinationId,
      p_documents: v.documents,
    });
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, value: data };
  } catch (error) {
    return failure(error);
  }
}
export async function recordEventAction(input: unknown): Promise<Result> {
  try {
    const { client } = await getAuthorizedUser(false, true);
    const v = eventInputSchema.parse(input);
    const { data, error } = await client.rpc("record_tracking_event", {
      p_packet_id: v.packetId,
      p_submission_key: v.submissionKey,
      p_expected_version: v.expectedVersion,
      p_action_template_id: v.actionTemplateId,
      p_processing_status: v.processingStatus,
      p_reported_destination_id: v.reportedDestinationId,
      p_document_ids: v.documentIds,
      p_remarks: v.remarks,
      p_transfer_id: v.transferId,
      p_receipt_recipient: v.receiptRecipient,
      p_receipt_reference: v.receiptReference,
    });
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, value: data };
  } catch (error) {
    return failure(error);
  }
}
export async function saveDestinationAction(input: unknown): Promise<Result> {
  try {
    const { client } = await getAuthorizedUser(true, true);
    const v = destinationSchema.parse(input);
    const { data, error } = await client.rpc("save_destination", {
      p_id: v.id,
      p_name: v.name,
      p_details: v.details,
      p_active: v.active,
    });
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, value: data };
  } catch (error) {
    return failure(error);
  }
}
export async function saveTemplateAction(input: unknown): Promise<Result> {
  try {
    const { client } = await getAuthorizedUser(true, true);
    const v = templateSchema.parse(input);
    const { data, error } = await client.rpc("save_action_template", {
      p_id: v.id,
      p_label: v.label,
      p_description: v.description,
      p_active: v.active,
    });
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, value: data };
  } catch (error) {
    return failure(error);
  }
}
export async function saveAccessAction(input: unknown): Promise<Result> {
  try {
    const { client } = await getAuthorizedUser(true, true);
    const v = accessSchema.parse(input);
    const { error } = await client.rpc("set_profile_access", {
      p_profile_id: v.profileId,
      p_role: v.role,
      p_active: v.active,
    });
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, value: undefined };
  } catch (error) {
    return failure(error);
  }
}
export async function linkExternalAction(input: unknown): Promise<Result> {
  try {
    const { client } = await getAuthorizedUser(true, true);
    const v = externalLinkSchema.parse(input);
    const { data, error } = await client.rpc("link_external_record", {
      p_packet_id: v.packetId,
      p_source_system: v.sourceSystem,
      p_external_record_id: v.externalRecordId,
    });
    if (error) throw error;
    return { ok: true, value: data };
  } catch (error) {
    return failure(error);
  }
}

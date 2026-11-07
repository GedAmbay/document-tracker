import type { Profile } from "@/modules/auth/domain/permissions";
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export type DestinationRow = {
  id: string;
  name: string;
  details: string;
  is_bac: boolean;
  active: boolean;
  created_at: string;
};
export type TemplateRow = {
  id: string;
  code: string;
  label: string;
  description: string;
  kind: "register" | "action" | "forward" | "confirm_receipt";
  active: boolean;
  created_at: string;
};
export type PacketRow = {
  id: string;
  qr_token: string;
  pr_number: string;
  description: string;
  originating_destination_id: string;
  created_by: string;
  created_at: string;
  archived_at: string | null;
};
export type DocumentRow = {
  id: string;
  packet_id: string;
  title: string;
  page_count: number;
  last_confirmed_destination_id: string | null;
  last_confirmed_at: string | null;
  created_at: string;
};
export type EventRow = {
  id: string;
  packet_id: string;
  packet_version: number;
  action_template_id: string;
  action_label: string;
  action_kind: TemplateRow["kind"];
  processing_status: string;
  reported_destination_id: string;
  custody_confirmed: boolean;
  confirmed_destination_id: string | null;
  receipt_recipient: string | null;
  receipt_reference: string | null;
  document_ids: string[];
  document_snapshot: Json;
  recorded_by: string;
  recorded_at: string;
  remarks: string | null;
  submission_key: string;
  request_payload: Json;
};
export type TransferRow = {
  id: string;
  packet_id: string;
  from_destination_id: string;
  to_destination_id: string;
  document_ids: string[];
  forwarded_event_id: string;
  receipt_event_id: string | null;
  status: "pending" | "confirmed";
  forwarded_at: string;
  confirmed_at: string | null;
};
export type CurrentRow = {
  packet_id: string;
  version: number;
  latest_event_id: string;
  processing_status: string;
  reported_destination_id: string;
  confirmed_custody_destination_id: string | null;
  receipt_state: "unconfirmed" | "pending" | "partial" | "confirmed";
  updated_at: string;
};
export type ExternalRow = {
  id: string;
  packet_id: string;
  source_system: string;
  external_record_id: string;
  created_by: string;
  created_at: string;
};
type Table<Row> = { Row: Row; Insert: never; Update: never; Relationships: [] };
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      destinations: Table<DestinationRow>;
      action_templates: Table<TemplateRow>;
      tracking_packets: Table<PacketRow>;
      packet_documents: Table<DocumentRow>;
      tracking_events: Table<EventRow>;
      tracking_transfers: Table<TransferRow>;
      tracking_current_state: Table<CurrentRow>;
      external_record_links: Table<ExternalRow>;
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Functions: {
      read_tracking_workspace: { Args: Record<string, never>; Returns: Json };
      create_tracking_packet: {
        Args: {
          p_submission_key: string;
          p_pr_number: string;
          p_description: string;
          p_origin_destination_id: string;
          p_documents: Json;
        };
        Returns: Json;
      };
      record_tracking_event: {
        Args: {
          p_packet_id: string;
          p_submission_key: string;
          p_expected_version: number;
          p_action_template_id: string;
          p_processing_status: string;
          p_reported_destination_id: string;
          p_document_ids: string[];
          p_remarks?: string;
          p_transfer_id?: string;
          p_receipt_recipient?: string;
          p_receipt_reference?: string;
        };
        Returns: Json;
      };
      set_profile_access: {
        Args: { p_profile_id: string; p_role: string; p_active: boolean };
        Returns: undefined;
      };
      save_destination: {
        Args: {
          p_id: string | null;
          p_name: string;
          p_details: string;
          p_active: boolean;
        };
        Returns: string;
      };
      save_action_template: {
        Args: {
          p_id: string | null;
          p_label: string;
          p_description: string;
          p_active: boolean;
        };
        Returns: string;
      };
      link_external_record: {
        Args: {
          p_packet_id: string;
          p_source_system: string;
          p_external_record_id: string;
        };
        Returns: string;
      };
    };
  };
};

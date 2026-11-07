import type { Profile } from "@/modules/auth/domain/permissions";
import type {
  DestinationRow,
  TemplateRow,
  PacketRow,
  DocumentRow,
  EventRow,
  TransferRow,
  CurrentRow,
  ExternalRow,
} from "@/lib/supabase/database.types";
export type WorkspaceData = {
  profile: Profile;
  profiles: Profile[];
  destinations: DestinationRow[];
  templates: TemplateRow[];
  packets: PacketRow[];
  documents: DocumentRow[];
  events: EventRow[];
  transfers: TransferRow[];
  states: CurrentRow[];
  externalLinks: ExternalRow[];
};

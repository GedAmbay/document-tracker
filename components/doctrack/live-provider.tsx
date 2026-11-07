"use client";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { Context, type Store } from "./mock-provider";
import type { WorkspaceData } from "@/modules/tracking/infrastructure/types";
import type {
  Member,
  Packet,
  Activity,
} from "@/modules/documents/domain/packet";
import {
  saveDestinationAction,
  saveTemplateAction,
  saveAccessAction,
} from "@/modules/tracking/infrastructure/actions";
const statuses: Record<string, Packet["status"]> = {
  registered: "Registered",
  in_review: "In review",
  for_signature: "For signature",
  in_transit: "In transit",
  returned: "Returned",
  completed: "Completed",
};
export function LiveProvider({
  data,
  children,
  qrOrigin,
}: {
  data: WorkspaceData;
  children: ReactNode;
  qrOrigin: string;
}) {
  const router = useRouter();
  const [toast, setToast] = useState("");
  const office = (id: string | null) =>
    data.destinations.find((d) => d.id === id)?.name ?? "Unconfirmed";
  const actor = (id: string) =>
    data.profiles.find((p) => p.id === id)?.display_name ??
    "Authorized employee";
  const members: Member[] = data.profiles.map((p) => ({
    id: p.id,
    name: p.display_name,
    email: p.email,
    initials: p.display_name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join(""),
    role: p.role === "admin" ? "Administrator" : "Tracking officer",
    active: p.active,
    lastSeen: "Not recorded",
  }));
  const packets: Packet[] = data.packets.map((p) => {
    const state = data.states.find((s) => s.packet_id === p.id)!;
    const events = data.events
      .filter((e) => e.packet_id === p.id)
      .sort((a, b) => a.packet_version - b.packet_version);
    return {
      id: p.id,
      qrId: p.qr_token,
      pr: p.pr_number,
      description: p.description,
      office: office(p.originating_destination_id),
      documents: data.documents
        .filter((d) => d.packet_id === p.id)
        .map((d) => ({ name: d.title, pages: d.page_count })),
      location: office(state.reported_destination_id),
      status: statuses[state.processing_status],
      receipt:
        state.receipt_state === "confirmed"
          ? "Confirmed"
          : state.receipt_state === "pending"
            ? "Pending confirmation"
            : state.receipt_state === "partial"
              ? "Partially confirmed"
              : "Unconfirmed",
      latestAction: events.at(-1)?.action_label ?? "Registered",
      updatedAt: state.updated_at,
      followUp:
        state.receipt_state === "pending" || state.receipt_state === "partial",
      movements: events.map((e) => ({
        id: e.id,
        at: e.recorded_at,
        actor: actor(e.recorded_by),
        action: e.action_label,
        from: data.transfers.find(
          (t) => t.forwarded_event_id === e.id || t.receipt_event_id === e.id,
        )
          ? office(
              data.transfers.find(
                (t) =>
                  t.forwarded_event_id === e.id || t.receipt_event_id === e.id,
              )!.from_destination_id,
            )
          : office(p.originating_destination_id),
        to: office(e.reported_destination_id),
        status: statuses[e.processing_status],
        receipt: e.custody_confirmed ? "Confirmed" : "Unconfirmed",
        note: [
          e.remarks,
          e.receipt_recipient
            ? `Receipt acknowledged by ${e.receipt_recipient}; reference: ${e.receipt_reference}.`
            : null,
          `Documents: ${data.documents
            .filter((d) => e.document_ids.includes(d.id))
            .map((d) => d.title)
            .join(", ")}.`,
        ]
          .filter(Boolean)
          .join(" "),
      })),
    };
  });
  const activities: Activity[] = data.events.map((e) => ({
    id: e.id,
    at: e.recorded_at,
    actor: actor(e.recorded_by),
    action: e.action_label,
    detail: `PR ${data.packets.find((p) => p.id === e.packet_id)?.pr_number} · ${office(e.reported_destination_id)}`,
    packetId: e.packet_id,
    category: "Tracking",
  }));
  async function finish(result: Awaited<ReturnType<typeof saveAccessAction>>) {
    if (!result.ok) throw new Error(result.error);
    setToast("Changes saved.");
    router.refresh();
  }
  const store: Store = {
    mode: "live",
    qrOrigin,
    currentUser: members.find((m) => m.id === data.profile.id)!,
    liveData: data,
    packets,
    members,
    destinations: data.destinations.map((d) => ({
      id: d.id,
      name: d.name,
      detail: d.details,
      active: d.active,
    })),
    templates: data.templates
      .filter((t) => t.kind !== "register")
      .map((t) => ({
        id: t.id,
        name: t.label,
        description: t.description,
        active: t.active,
      })),
    activities,
    preview: "ready",
    setPreview: () => {},
    signedIn: true,
    setSignedIn: () => {},
    updatePacket: () => {
      throw new Error("Use the secure tracking form.");
    },
    saveDestination: async (d) =>
      finish(
        await saveDestinationAction({
          id: d.id,
          name: d.name,
          details: d.detail,
          active: d.active,
        }),
      ),
    saveTemplate: async (t) =>
      finish(
        await saveTemplateAction({
          id: data.templates.some((d) => d.id === t.id) ? t.id : null,
          label: t.name,
          description: t.description,
          active: t.active,
        }),
      ),
    saveMember: async (m) =>
      finish(
        await saveAccessAction({
          profileId: m.id,
          role: m.role === "Administrator" ? "admin" : "staff",
          active: m.active,
        }),
      ),
    notify: setToast,
  };
  return (
    <Context.Provider value={store}>
      {children}
      {toast && (
        <div className="demo-toast" role="status">
          <CheckCircle2 className="size-5 text-emerald-600" />
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}

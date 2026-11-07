"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, X } from "lucide-react";
import type {
  Packet,
  Member,
  Destination,
  ActionTemplate,
  Activity,
  TrackingUpdate,
} from "@/modules/documents/domain/packet";
import {
  initialPackets,
  initialActivities,
  members as initialMembers,
  destinations as initialDestinations,
  templates as initialTemplates,
} from "@/modules/documents/infrastructure/mock-data";
import { updateMockPacket } from "@/modules/documents/application/update-mock-packet";

export type PreviewState = "ready" | "loading" | "empty" | "error";
export type Store = {
  mode: "demo" | "live";
  qrOrigin?: string;
  currentUser: Member;
  liveData?: import("@/modules/tracking/infrastructure/types").WorkspaceData;
  packets: Packet[];
  members: Member[];
  destinations: Destination[];
  templates: ActionTemplate[];
  activities: Activity[];
  preview: PreviewState;
  setPreview: (value: PreviewState) => void;
  signedIn: boolean;
  setSignedIn: (value: boolean) => void;
  updatePacket: (id: string, input: TrackingUpdate) => void;
  saveDestination: (value: Destination) => void | Promise<void>;
  saveTemplate: (value: ActionTemplate) => void | Promise<void>;
  saveMember: (value: Member) => void | Promise<void>;
  notify: (message: string) => void;
};
export const Context = createContext<Store | null>(null);
export function MockProvider({ children }: { children: ReactNode }) {
  const [packets, setPackets] = useState(initialPackets);
  const [members, setMembers] = useState(initialMembers);
  const [destinations, setDestinations] = useState(initialDestinations);
  const [templates, setTemplates] = useState(initialTemplates);
  const [activities, setActivities] = useState(initialActivities);
  const [preview, setPreview] = useState<PreviewState>("ready");
  const [signedIn, setSignedIn] = useState(true);
  const [toast, setToast] = useState("");
  function log(
    action: string,
    detail: string,
    category: Activity["category"],
    packetId?: string,
  ) {
    setActivities((previous) => [
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        actor: "Maria Santos",
        action,
        detail,
        category,
        packetId,
      },
      ...previous,
    ]);
  }
  function updatePacket(id: string, input: TrackingUpdate) {
    const packet = packets.find((p) => p.id === id);
    if (!packet) return;
    const next = updateMockPacket(
      packet,
      input,
      crypto.randomUUID(),
      new Date().toISOString(),
    );
    setPackets((previous) => previous.map((p) => (p.id === id ? next : p)));
    log(input.action, `PR ${packet.pr} · ${input.location}`, "Tracking", id);
    setToast(`Tracking updated for PR ${packet.pr}`);
  }
  function saveDestination(value: Destination) {
    setDestinations((previous) =>
      previous.some((d) => d.id === value.id)
        ? previous.map((d) => (d.id === value.id ? value : d))
        : [...previous, value],
    );
    log("Updated destination", value.name, "Configuration");
    setToast("Destination saved in this demo session.");
  }
  function saveTemplate(value: ActionTemplate) {
    setTemplates((previous) =>
      previous.some((d) => d.id === value.id)
        ? previous.map((d) => (d.id === value.id ? value : d))
        : [...previous, value],
    );
    log("Updated action template", value.name, "Configuration");
    setToast("Action template saved in this demo session.");
  }
  function saveMember(value: Member) {
    setMembers((previous) =>
      previous.map((d) => (d.id === value.id ? value : d)),
    );
    log(
      "Updated employee access",
      `${value.name} · ${value.active ? "Active" : "Inactive"} · ${value.role}`,
      "Access",
    );
    setToast("Employee access updated in this demo session.");
  }
  return (
    <Context.Provider
      value={{
        mode: "demo",
        currentUser: initialMembers[0],
        packets,
        members,
        destinations,
        templates,
        activities,
        preview,
        setPreview,
        signedIn,
        setSignedIn,
        updatePacket,
        saveDestination,
        saveTemplate,
        saveMember,
        notify: setToast,
      }}
    >
      {children}
      {toast && (
        <div className="demo-toast" role="status">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
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
export function useMock() {
  const store = useContext(Context);
  if (!store) throw new Error("MockProvider is required");
  return store;
}

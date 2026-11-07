import { z } from "zod";

export const trackingStatuses = [
  "Registered",
  "For signature",
  "In review",
  "In transit",
  "Returned",
  "Completed",
] as const;
export const receiptStates = [
  "Unconfirmed",
  "Partially confirmed",
  "Pending confirmation",
  "Confirmed",
  "Not required",
] as const;
export const trackingUpdateSchema = z.object({
  location: z.string().trim().min(1, "Choose a reported location."),
  status: z.enum(trackingStatuses),
  receipt: z.enum(receiptStates),
  action: z.string().trim().min(1, "Choose an action."),
  note: z
    .string()
    .trim()
    .min(5, "Add a note with at least 5 characters.")
    .max(500, "Keep notes under 500 characters."),
});
export type TrackingUpdate = z.infer<typeof trackingUpdateSchema>;
export type Movement = {
  id: string;
  at: string;
  actor: string;
  action: string;
  from: string;
  to: string;
  status: TrackingUpdate["status"];
  receipt: TrackingUpdate["receipt"];
  note: string;
};
export type Packet = {
  id: string;
  qrId: string;
  pr: string;
  description: string;
  office: string;
  documents: { name: string; pages: number }[];
  location: string;
  status: TrackingUpdate["status"];
  receipt: TrackingUpdate["receipt"];
  latestAction: string;
  updatedAt: string;
  followUp: boolean;
  movements: Movement[];
};
export type Member = {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: "Administrator" | "Tracking officer";
  active: boolean;
  lastSeen: string;
};
export type Destination = {
  id: string;
  name: string;
  detail: string;
  active: boolean;
};
export type ActionTemplate = {
  id: string;
  name: string;
  description: string;
  active: boolean;
};
export type Activity = {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
  packetId?: string;
  category: "Tracking" | "Access" | "Configuration";
};
export function packetMetrics(packets: Packet[], bacName = "BAC Secretariat") {
  const active = packets.filter((p) => p.status !== "Completed");
  return {
    active: active.length,
    outside: active.filter((p) => p.location !== bacName).length,
    signature: active.filter((p) => p.status === "For signature").length,
    followUp: active.filter((p) => p.followUp).length,
  };
}

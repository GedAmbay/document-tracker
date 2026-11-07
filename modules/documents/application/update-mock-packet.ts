import {
  trackingUpdateSchema,
  type Packet,
  type TrackingUpdate,
} from "../domain/packet";

// Mock-only state transition. Production authorization and persistence are not implemented.
export function updateMockPacket(
  packet: Packet,
  input: TrackingUpdate,
  eventId: string,
  at: string,
): Packet {
  const update = trackingUpdateSchema.parse(input);
  return {
    ...packet,
    location: update.location,
    status: update.status,
    receipt: update.receipt,
    latestAction: update.action,
    updatedAt: at,
    followUp:
      update.status !== "Completed" &&
      update.receipt === "Pending confirmation",
    movements: [
      ...packet.movements,
      {
        id: eventId,
        at,
        actor: "Maria Santos",
        action: update.action,
        from: packet.location,
        to: update.location,
        status: update.status,
        receipt: update.receipt,
        note: update.note,
      },
    ],
  };
}

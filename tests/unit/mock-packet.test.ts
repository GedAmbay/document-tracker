import { describe, expect, it } from "vitest";
import { initialPackets } from "@/modules/documents/infrastructure/mock-data";
import { updateMockPacket } from "@/modules/documents/application/update-mock-packet";
import {
  packetMetrics,
  type TrackingUpdate,
} from "@/modules/documents/domain/packet";

const input: TrackingUpdate = {
  location: "BAC Secretariat",
  status: "Completed",
  receipt: "Confirmed",
  action: "Filed and completed",
  note: "Returned complete packet to BAC for filing.",
};
describe("mock tracking", () => {
  it("preserves permanent identities and previous history while adding a handoff", () => {
    const packet = initialPackets[0];
    const next = updateMockPacket(
      packet,
      input,
      "event-id",
      "2026-11-07T03:00:00Z",
    );
    expect(next.id).toBe(packet.id);
    expect(next.qrId).toBe(packet.qrId);
    expect(next.movements).toHaveLength(packet.movements.length + 1);
    expect(packet.movements).toHaveLength(3);
    expect(next.movements.at(-1)).toMatchObject({
      from: packet.location,
      to: input.location,
      actor: "Maria Santos",
      note: input.note,
    });
    expect(next.followUp).toBe(false);
  });
  it("rejects blank notes at the application boundary", () => {
    expect(() =>
      updateMockPacket(
        initialPackets[0],
        { ...input, note: " " },
        "event",
        "2026-11-07T03:00:00Z",
      ),
    ).toThrow();
  });
  it("updates all dashboard totals consistently", () => {
    expect(packetMetrics(initialPackets)).toEqual({
      active: 7,
      outside: 5,
      signature: 2,
      followUp: 3,
    });
    const changed = [
      updateMockPacket(
        initialPackets[0],
        input,
        "event",
        "2026-11-07T03:00:00Z",
      ),
      ...initialPackets.slice(1),
    ];
    expect(packetMetrics(changed)).toEqual({
      active: 6,
      outside: 4,
      signature: 1,
      followUp: 2,
    });
  });
});

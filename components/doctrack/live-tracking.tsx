"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useMock } from "./mock-provider";
import {
  recordEventAction,
  registerPacketAction,
} from "@/modules/tracking/infrastructure/actions";
import {
  eventInputSchema,
  statusSchema,
  createPacketSchema,
} from "@/modules/tracking/domain/schemas";
import type { Packet } from "@/modules/documents/domain/packet";

export function LiveTrackingSheet({
  packet,
  onOpenChange,
}: {
  packet: Packet;
  onOpenChange: (open: boolean) => void;
}) {
  const { liveData: data, notify } = useMock();
  const router = useRouter();
  const state = data!.states.find((s) => s.packet_id === packet.id)!;
  const documents = data!.documents.filter((d) => d.packet_id === packet.id);
  const templates = data!.templates.filter(
    (t) => t.active && t.kind !== "register",
  );
  const transfers = data!.transfers.filter(
    (t) => t.packet_id === packet.id && t.status === "pending",
  );
  const [key] = useState(() => crypto.randomUUID());
  const [action, setAction] = useState("");
  const [status, setStatus] = useState(state.processing_status);
  const [location, setLocation] = useState(state.reported_destination_id);
  const [docs, setDocs] = useState(documents.map((d) => d.id));
  const [transfer, setTransfer] = useState("");
  const [recipient, setRecipient] = useState("");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const kind = templates.find((t) => t.id === action)?.kind;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = eventInputSchema.safeParse({
      packetId: packet.id,
      submissionKey: key,
      expectedVersion: state.version,
      actionTemplateId: action,
      processingStatus: status,
      reportedDestinationId: location,
      documentIds: docs,
      remarks,
      transferId: kind === "confirm_receipt" ? transfer : undefined,
      receiptRecipient: kind === "confirm_receipt" ? recipient : undefined,
      receiptReference: kind === "confirm_receipt" ? reference : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const result = await recordEventAction(parsed.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      notify(`Tracking saved for PR ${packet.pr}`);
      onOpenChange(false);
      router.refresh();
    } catch {
      setError(
        "Unable to save. Keep this form open and retry the same submission.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      open
      onOpenChange={(v) => {
        if (!busy) onOpenChange(v);
      }}
    >
      <SheetContent side="bottom" className="tracking-sheet">
        <div className="sheet-handle" />
        <SheetHeader>
          <SheetTitle>Update tracking</SheetTitle>
          <SheetDescription>
            PR {packet.pr} · Version {state.version} · Recorded as{" "}
            {data!.profile.display_name}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
          <div className="sheet-form-body">
            <div className="info-note">
              Forwarding only reports movement. Confirm physical receipt
              separately against a pending transfer and an acknowledgment
              reference.
            </div>
            <div className="form-field">
              <Label htmlFor="live-action">Action performed</Label>
              <select
                id="live-action"
                className="form-select"
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setTransfer("");
                }}
                required
              >
                <option value="">Choose an action</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.kind.replaceAll("_", " ")})
                  </option>
                ))}
              </select>
            </div>
            {kind === "confirm_receipt" && (
              <div className="form-field">
                <Label htmlFor="live-transfer">
                  Pending transfer to confirm
                </Label>
                <select
                  id="live-transfer"
                  value={transfer}
                  required
                  className="form-select"
                  onChange={(e) => {
                    const t = transfers.find((t) => t.id === e.target.value);
                    setTransfer(e.target.value);
                    if (t) {
                      setLocation(t.to_destination_id);
                      setDocs(t.document_ids);
                    }
                  }}
                >
                  <option value="">Choose the acknowledged transfer</option>
                  {transfers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {
                        data!.destinations.find(
                          (d) => d.id === t.to_destination_id,
                        )?.name
                      }{" "}
                      · {t.document_ids.length} documents
                    </option>
                  ))}
                </select>
                {!transfers.length && (
                  <p className="field-error">
                    There is no pending transfer to confirm.
                  </p>
                )}
              </div>
            )}
            <div className="form-field">
              <Label htmlFor="live-status">Processing status</Label>
              <select
                id="live-status"
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {statusSchema.options.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <Label htmlFor="live-location">Reported location</Label>
              <select
                id="live-location"
                className="form-select"
                disabled={kind === "confirm_receipt"}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                {data!.destinations
                  .filter((d) => d.active || d.id === location)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>
            <fieldset className="space-y-3">
              <legend className="mb-3 text-xs font-medium text-slate-600">
                Documents involved
              </legend>
              {documents.map((d) => (
                <label
                  key={d.id}
                  className="flex min-h-8 items-center gap-3 text-sm"
                >
                  <input
                    type="checkbox"
                    disabled={kind === "confirm_receipt"}
                    checked={docs.includes(d.id)}
                    onChange={(e) =>
                      setDocs(
                        e.target.checked
                          ? [...docs, d.id]
                          : docs.filter((id) => id !== d.id),
                      )
                    }
                  />
                  {d.title}
                </label>
              ))}
            </fieldset>
            {kind === "confirm_receipt" && (
              <>
                <div className="form-field">
                  <Label htmlFor="live-recipient">
                    Receiving person who acknowledged custody
                  </Label>
                  <Input
                    id="live-recipient"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    required
                    maxLength={120}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="live-reference">
                    Acknowledgment reference (signed copy, logbook, or direct
                    confirmation)
                  </Label>
                  <Input
                    id="live-reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    required
                    maxLength={240}
                  />
                </div>
              </>
            )}
            <div className="form-field">
              <Label htmlFor="live-remarks">Remarks (optional)</Label>
              <Textarea
                id="live-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                maxLength={2000}
              />
            </div>
            {error && (
              <p className="error-note" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="sheet-form-footer">
            <Button
              variant="outline"
              type="button"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Save />}
              {busy ? "Saving…" : "Save tracking event"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
export function RegisterPacket() {
  const { liveData: data, notify } = useMock();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState([
    { title: "Purchase Request", page_count: 1 },
  ]);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = createPacketSchema.safeParse({
      submissionKey: key,
      prNumber: form.get("pr"),
      description: form.get("description"),
      originDestinationId: form.get("origin"),
      documents,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await registerPacketAction(parsed.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const id = (result.value as { packet_id: string }).packet_id;
      setOpen(false);
      notify("Packet registered. Physical receipt remains unconfirmed.");
      router.push(`/packets/${id}`);
      router.refresh();
    } catch {
      setError(
        "Unable to register. Retry this submission without changing its details.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!data) return null;
  return (
    <>
      <Button
        onClick={() => {
          setKey(crypto.randomUUID());
          setError("");
          setDocuments([{ title: "Purchase Request", page_count: 1 }]);
          setOpen(true);
        }}
      >
        Register packet
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!busy) setOpen(v);
        }}
      >
        <DialogContent>
          <DialogTitle>Register PR packet</DialogTitle>
          <DialogDescription>
            Permanent packet and QR UUIDs are assigned by PostgreSQL.
            Registration does not confirm receipt.
          </DialogDescription>
          <form onSubmit={save} className="space-y-5">
            <div className="form-field">
              <Label htmlFor="new-pr">PR number</Label>
              <Input id="new-pr" name="pr" required maxLength={80} />
            </div>
            <div className="form-field">
              <Label htmlFor="new-description">Description</Label>
              <Textarea
                id="new-description"
                name="description"
                required
                minLength={3}
                maxLength={1000}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="new-origin">
                Originating office / initial reported location
              </Label>
              <select
                id="new-origin"
                name="origin"
                className="form-select"
                required
              >
                <option value="">Choose office</option>
                {data.destinations
                  .filter((d) => d.active)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>
            <fieldset>
              <legend className="mb-3 text-sm font-medium">
                Documents included
              </legend>
              {documents.map((d, i) => (
                <div key={i} className="mb-3 flex gap-2">
                  <Input
                    aria-label={`Document ${i + 1} title`}
                    value={d.title}
                    required
                    maxLength={240}
                    onChange={(e) =>
                      setDocuments(
                        documents.map((x, n) =>
                          n === i ? { ...x, title: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <Input
                    className="w-20"
                    type="number"
                    min={1}
                    max={10000}
                    aria-label={`Document ${i + 1} pages`}
                    value={d.page_count}
                    required
                    onChange={(e) =>
                      setDocuments(
                        documents.map((x, n) =>
                          n === i
                            ? { ...x, page_count: Number(e.target.value) }
                            : x,
                        ),
                      )
                    }
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={documents.length >= 100}
                onClick={() =>
                  setDocuments([...documents, { title: "", page_count: 1 }])
                }
              >
                Add document
              </Button>
            </fieldset>
            {error && (
              <p className="error-note" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Registering…" : "Register packet"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

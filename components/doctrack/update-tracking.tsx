"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useMock } from "./mock-provider";
import {
  receiptStates,
  trackingStatuses,
  trackingUpdateSchema,
  type Packet,
  type TrackingUpdate,
} from "@/modules/documents/domain/packet";

export function UpdateTracking({
  packet,
  open,
  onOpenChange,
}: {
  packet: Packet;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { destinations, templates, updatePacket } = useMock();
  const [value, setValue] = useState<TrackingUpdate>({
    location: packet.location,
    status: packet.status,
    receipt: packet.receipt,
    action: "",
    note: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [fail, setFail] = useState(false);
  const set = <K extends keyof TrackingUpdate>(
    key: K,
    next: TrackingUpdate[K],
  ) => {
    setValue((previous) => ({ ...previous, [key]: next }));
    setErrors((previous) => ({ ...previous, [key]: "", save: "" }));
  };
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = trackingUpdateSchema.safeParse(value);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
        ),
      );
      return;
    }
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 650));
    if (fail) {
      setErrors({
        save: "The demo save failed. Switch off simulated failure and try again. Your changes are still here.",
      });
      setSaving(false);
      return;
    }
    updatePacket(packet.id, parsed.data);
    setSaving(false);
    onOpenChange(false);
  }
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
    >
      <SheetContent side="bottom" className="tracking-sheet">
        <div className="sheet-handle" />
        <SheetHeader className="px-6 pb-5 pt-4">
          <span className="eyebrow">RECORD A HANDOFF</span>
          <SheetTitle className="text-2xl">Update tracking</SheetTitle>
          <SheetDescription>
            PR {packet.pr} · Changes are saved to this demo session only.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={save}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="sheet-form-body">
            <div className="current-route">
              <MapPin className="size-4" />
              <div>
                <span>Currently reported at</span>
                <strong>{packet.location}</strong>
              </div>
              <ArrowRight className="ml-auto size-4" />
            </div>
            <div className="form-field">
              <Label htmlFor="update-location">
                Reported location <span className="text-blue-700">*</span>
              </Label>
              <select
                id="update-location"
                className="form-select"
                value={value.location}
                onChange={(e) => set("location", e.target.value)}
                aria-invalid={!!errors.location}
                aria-describedby={
                  errors.location ? "location-error" : undefined
                }
              >
                <option value="">Choose destination</option>
                {Array.from(
                  new Set([
                    packet.location,
                    ...destinations.filter((d) => d.active).map((d) => d.name),
                  ]),
                ).map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
              {errors.location && (
                <p id="location-error" className="field-error">
                  {errors.location}
                </p>
              )}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="form-field">
                <Label htmlFor="update-status">Tracking status</Label>
                <select
                  id="update-status"
                  className="form-select"
                  value={value.status}
                  onChange={(e) =>
                    set("status", e.target.value as TrackingUpdate["status"])
                  }
                >
                  {trackingStatuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <Label htmlFor="update-receipt">Receipt confirmation</Label>
                <select
                  id="update-receipt"
                  className="form-select"
                  value={value.receipt}
                  onChange={(e) =>
                    set("receipt", e.target.value as TrackingUpdate["receipt"])
                  }
                >
                  {receiptStates.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="info-note">
              <ShieldCheck className="size-4 shrink-0" />
              <p>
                Only mark receipt as confirmed when the receiving office has
                acknowledged the physical packet.
              </p>
            </div>
            <div className="form-field">
              <Label htmlFor="update-action">
                Action taken <span className="text-blue-700">*</span>
              </Label>
              <select
                id="update-action"
                className="form-select"
                value={value.action}
                onChange={(e) => set("action", e.target.value)}
                aria-invalid={!!errors.action}
                aria-describedby={errors.action ? "action-error" : undefined}
              >
                <option value="">Select an action template</option>
                {templates
                  .filter((t) => t.active)
                  .map((t) => (
                    <option key={t.id}>{t.name}</option>
                  ))}
              </select>
              {errors.action && (
                <p id="action-error" className="field-error">
                  {errors.action}
                </p>
              )}
            </div>
            <div className="form-field">
              <div className="flex items-center justify-between">
                <Label htmlFor="update-note">
                  Tracking note <span className="text-blue-700">*</span>
                </Label>
                <span className="text-xs text-slate-400">
                  {value.note.length}/500
                </span>
              </div>
              <Textarea
                id="update-note"
                rows={3}
                maxLength={500}
                placeholder="Add receiving staff, routing details, or a follow-up note…"
                value={value.note}
                onChange={(e) => set("note", e.target.value)}
                aria-invalid={!!errors.note}
                aria-describedby={errors.note ? "note-error" : undefined}
              />
              {errors.note && (
                <p id="note-error" className="field-error">
                  {errors.note}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Check className="size-3.5" />
              Recorded by Maria Santos · Administrator
            </div>
            <details className="demo-options">
              <summary>Demo testing options</summary>
              <label className="mt-3 flex items-center justify-between gap-4">
                Simulate save failure
                <Switch
                  checked={fail}
                  onCheckedChange={setFail}
                  aria-label="Simulate save failure"
                />
              </label>
            </details>
            {errors.save && (
              <div role="alert" className="error-note">
                <CircleAlert className="size-4 shrink-0" />
                {errors.save}
              </div>
            )}
          </div>
          <div className="sheet-form-footer">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {saving ? "Saving update…" : "Save tracking update"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

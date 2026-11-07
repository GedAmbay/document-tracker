"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CameraOff,
  CheckCircle2,
  CircleAlert,
  Keyboard,
  Loader2,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMock } from "./mock-provider";
import { PageHeading, PageState, StatusBadge } from "./common";

type ScanState = "idle" | "scanning" | "found" | "denied" | "invalid";
export function ScannerScreen() {
  const { packets, mode, qrOrigin } = useMock();
  const [state, setState] = useState<ScanState>("idle");
  const [manual, setManual] = useState("");
  const [selected, setSelected] = useState(packets[0]?.id ?? "");
  const [found, setFound] = useState(packets[0] ?? null);
  function simulate() {
    if (mode !== "demo" || !selected) return;
    setState("scanning");
    window.setTimeout(() => {
      setFound(packets.find((p) => p.id === selected)!);
      setState("found");
    }, 950);
  }
  function find(e: React.FormEvent) {
    e.preventDefault();
    const value = manual
      .trim()
      .replace(/^PR\s*/i, "")
      .replace(qrOrigin ?? "__no_origin__", "");
    const p = packets.find(
      (p) =>
        p.pr.toLowerCase() === value.toLowerCase() ||
        p.qrId === value ||
        `/q/${p.qrId}` === value,
    );
    if (p) {
      setFound(p);
      setState("found");
    } else setState("invalid");
  }
  return (
    <>
      <PageHeading
        eyebrow="QUICK TRACKING"
        title="QR scanner"
        description="Find a packet. Check its location. Keep it moving."
      />
      <PageState>
        <div className="scanner-layout">
          <section className="panel scanner-panel">
            <div className="scanner-card">
              <div className="scan-viewfinder">
                <span className="scan-corner corner-tl" />
                <span className="scan-corner corner-tr" />
                <span className="scan-corner corner-bl" />
                <span className="scan-corner corner-br" />
                {state === "scanning" ? (
                  <>
                    <QrCode className="scan-qr opacity-70" />
                    <span className="scan-line" />
                  </>
                ) : state === "denied" ? (
                  <CameraOff className="size-12 text-slate-400" />
                ) : state === "found" ? (
                  <CheckCircle2 className="size-16 text-emerald-300" />
                ) : (
                  <QrCode className="scan-qr" />
                )}
              </div>
              <span className="scan-demo-tag">
                {mode === "demo"
                  ? "SIMULATED CAMERA · NO CAMERA ACCESS"
                  : "MANUAL LOOKUP · CAMERA INTEGRATION PENDING"}
              </span>
              <h2>
                {state === "scanning"
                  ? "Looking for a packet…"
                  : state === "denied"
                    ? "Camera access unavailable"
                    : state === "found"
                      ? "Packet identified"
                      : "Place the QR code inside the frame"}
              </h2>
              <p>
                {state === "denied"
                  ? "You can still find a packet by entering its PR number below."
                  : "Keep the packet label centered and hold steady."}
              </p>
              <Button
                className="scanner-button"
                onClick={simulate}
                disabled={
                  state === "scanning" || mode !== "demo" || !packets.length
                }
              >
                {state === "scanning" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Camera />
                )}
                {mode === "live"
                  ? "Use manual lookup below"
                  : state === "scanning"
                    ? "Scanning…"
                    : state === "found"
                      ? "Scan another demo packet"
                      : "Start demo scan"}
              </Button>
            </div>
            <div className="scanner-manual">
              <div className="flex items-center gap-2">
                <Keyboard className="size-4 text-slate-500" />
                <h3>Enter a PR number instead</h3>
              </div>
              <p>No QR label handy? Find the packet manually.</p>
              <form className="mt-4 flex gap-2" onSubmit={find}>
                <Input
                  aria-label="PR number or QR identifier"
                  value={manual}
                  onChange={(e) => {
                    setManual(e.target.value);
                    if (state === "invalid") setState("idle");
                  }}
                  placeholder="e.g. 2026-11-0142"
                />
                <Button
                  type="submit"
                  variant="outline"
                  aria-label="Find packet"
                >
                  <ArrowRight />
                </Button>
              </form>
              {state === "invalid" && (
                <div role="alert" className="error-note mt-3">
                  <CircleAlert className="size-4 shrink-0" />
                  No sample packet matches that identifier. Try 2026-11-0142.
                </div>
              )}
            </div>
          </section>
          <aside className="space-y-5">
            {state === "found" && found && (
              <section className="panel found-packet" aria-live="polite">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="size-4" />
                  PACKET FOUND
                </div>
                <h2>PR {found.pr}</h2>
                <p>{found.description}</p>
                <div className="my-4">
                  <StatusBadge status={found.status} />
                </div>
                <div className="found-location">
                  <span>Reported location</span>
                  <strong>{found.location}</strong>
                </div>
                <Button asChild className="mt-5 w-full">
                  <Link href={`/packets/${found.id}`}>
                    View packet
                    <ArrowRight />
                  </Link>
                </Button>
              </section>
            )}
            <section className="panel p-6">
              <h2 className="text-sm font-semibold">
                Your next handoff, in three steps
              </h2>
              <ol className="scan-steps">
                <li>
                  <span>1</span>
                  <div>
                    <strong>Scan the QR label</strong>
                    <p>Find the packet using its permanent identifier.</p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <strong>Review the packet</strong>
                    <p>Check the documents and reported location.</p>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    <strong>Update tracking & save</strong>
                    <p>Record the destination, action and receipt state.</p>
                  </div>
                </li>
              </ol>
            </section>
            {mode === "demo" && (
              <section className="panel demo-controls">
                <span className="eyebrow">TRY THE DEMO</span>
                <div className="form-field mt-4">
                  <Label htmlFor="scan-packet">Packet to simulate</Label>
                  <select
                    id="scan-packet"
                    className="form-select"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {packets.map((p) => (
                      <option key={p.id} value={p.id}>
                        PR {p.pr}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => setState("denied")}
                >
                  <CameraOff />
                  Preview camera unavailable
                </Button>
              </section>
            )}
            <p className="flex gap-2 px-1 text-xs leading-relaxed text-slate-400">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              Scanning does not confirm receipt. Only an employee’s tracking
              update changes the reported state.
            </p>
          </aside>
        </div>
      </PageState>
    </>
  );
}

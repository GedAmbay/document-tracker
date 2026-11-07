"use client";

import { useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Copy,
  FileCheck2,
  FileText,
  Flag,
  History,
  MapPin,
  Pencil,
  Printer,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useMock } from "./mock-provider";
import {
  EmptyState,
  PageState,
  ReceiptLabel,
  SectionHeading,
  StatusBadge,
  formatDate,
} from "./common";
import { UpdateTracking } from "./update-tracking";
import { LiveTrackingSheet } from "./live-tracking";
import type { Movement } from "@/modules/documents/domain/packet";

export function Timeline({ movements }: { movements: Movement[] }) {
  return (
    <ol className="timeline">
      {[...movements]
        .sort((a, b) => a.at.localeCompare(b.at))
        .map((m, i, all) => (
          <li key={m.id}>
            <span
              className={`timeline-node ${i === all.length - 1 ? "latest" : ""}`}
            >
              {i === all.length - 1 ? (
                <MapPin className="size-3.5" />
              ) : (
                <Check className="size-3" />
              )}
            </span>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3>{m.action}</h3>
              <time>{formatDate(m.at)}</time>
            </div>
            <div className="timeline-route">
              {m.from}
              <ArrowRight className="size-3 shrink-0" />
              <strong>{m.to}</strong>
            </div>
            <p>{m.note}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-slate-400">
                Recorded by {m.actor}
              </span>
              <ReceiptLabel receipt={m.receipt} />
            </div>
          </li>
        ))}
    </ol>
  );
}
export function PacketDetailsScreen({
  id,
  qr = false,
}: {
  id: string;
  qr?: boolean;
}) {
  const { packets, notify, mode, qrOrigin, liveData } = useMock();
  const packet = packets.find((p) => (qr ? p.qrId === id : p.id === id));
  const [update, setUpdate] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  if (!packet)
    return (
      <div className="panel">
        <EmptyState
          title="Packet not found"
          description="This identifier does not match a sample packet. It may belong to another workspace."
          action={
            <Button asChild>
              <Link href="/packets">Back to packets</Link>
            </Button>
          }
        />
      </div>
    );
  const latest = packet.movements[packet.movements.length - 1];
  async function copyId() {
    try {
      await navigator.clipboard.writeText(packet!.qrId);
      notify("Permanent QR identifier copied.");
    } catch {
      notify(
        "Clipboard unavailable. The full QR identifier is shown below the code.",
      );
    }
  }
  return (
    <>
      <Link href="/packets" className="back-link">
        <ArrowLeft className="size-3.5" />
        All PR packets
      </Link>
      <PageState>
        {mode === "live" && (
          <div className="info-note mb-5">
            Confirmed custody of the full packet:{" "}
            {liveData?.destinations.find(
              (d) =>
                d.id ===
                liveData.states.find((s) => s.packet_id === packet.id)
                  ?.confirmed_custody_destination_id,
            )?.name ?? "Not confirmed for the whole packet"}
            . Reported location is separate; partial-document receipts do not
            confirm the whole packet.
          </div>
        )}
        <div className="detail-heading">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="eyebrow">PR PACKET</span>
              <span className="text-slate-300">/</span>
              <StatusBadge status={packet.status} />
            </div>
            <h1>PR {packet.pr}</h1>
            <p>{packet.description}</p>
            <span className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <Building2 className="size-3.5" />
              {packet.office}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setQrOpen(true)}>
              <QrCode />
              Packet QR
            </Button>
            <Button onClick={() => setUpdate(true)}>
              <Pencil />
              Update tracking
            </Button>
          </div>
        </div>
        <div className="detail-summary">
          <div>
            <span className="summary-icon">
              <MapPin />
            </span>
            <div>
              <label>REPORTED LOCATION</label>
              <strong>{packet.location}</strong>
            </div>
          </div>
          <div>
            <span className="summary-icon">
              <FileCheck2 />
            </span>
            <div>
              <label>RECEIPT CONFIRMATION</label>
              <ReceiptLabel receipt={packet.receipt} />
            </div>
          </div>
          <div>
            <span className="summary-icon">
              <History />
            </span>
            <div>
              <label>LAST UPDATED</label>
              <strong>{formatDate(packet.updatedAt)}</strong>
            </div>
          </div>
        </div>
        <div className="detail-columns">
          <div className="min-w-0">
            <Tabs defaultValue="overview">
              <TabsList className="detail-tabs">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="timeline">
                  Movement timeline{" "}
                  <span className="ml-1 rounded bg-slate-100 px-1.5 text-[10px]">
                    {packet.movements.length}
                  </span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-6">
                <section className="panel">
                  <SectionHeading
                    title="Documents included"
                    detail={`${packet.documents.length} documents · ${packet.documents.reduce((n, d) => n + d.pages, 0)} pages in this packet`}
                  />
                  <div className="document-list">
                    {packet.documents.map((d) => (
                      <div key={d.name}>
                        <span className="document-type-icon">
                          <FileText className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong>{d.name}</strong>
                          <span>
                            {d.pages} {d.pages === 1 ? "page" : "pages"} ·
                            Physical document
                          </span>
                        </div>
                        <span className="document-check">
                          <Check className="size-3.5" />
                          Included
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="panel-note">
                    <ShieldCheck className="size-3.5 shrink-0" />
                    Document contents are not uploaded. DocTrack tracks the
                    physical packet.
                  </div>
                </section>
                <section className="panel">
                  <SectionHeading
                    title="Movement timeline"
                    detail="A chronological record of reported handoffs"
                  />
                  <Timeline movements={packet.movements} />
                </section>
              </TabsContent>
              <TabsContent value="timeline">
                <section className="panel">
                  <SectionHeading
                    title="Complete movement history"
                    detail="Oldest to newest · Philippine Standard Time"
                  />
                  <Timeline movements={packet.movements} />
                </section>
              </TabsContent>
            </Tabs>
          </div>
          <aside className="space-y-5">
            <section className="panel latest-action">
              <span className="eyebrow">LATEST ACTION</span>
              <div className="mt-4 flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Pencil className="size-5" />
              </div>
              <h2>{packet.latestAction}</h2>
              <p>{latest.note}</p>
              <div className="mt-5 border-t border-slate-100 pt-4 text-xs">
                <strong>{latest.actor}</strong>
                <span className="mt-1 block text-slate-400">
                  {formatDate(latest.at)}
                </span>
              </div>
            </section>
            {packet.followUp && (
              <section className="followup-note">
                <Flag className="size-4" />
                <h3>Keep this packet on your radar</h3>
                <p>
                  Physical receipt is still awaiting confirmation. Check with
                  the receiving office before marking it confirmed.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 w-full bg-white"
                  onClick={() => setUpdate(true)}
                >
                  Record a follow-up
                  <ArrowRight />
                </Button>
              </section>
            )}
            <div className="px-1 text-[11px] leading-relaxed text-slate-400">
              <ShieldCheck className="mb-2 size-4" />
              Permanent record identity is retained through every handoff.
              Updating tracking never changes this packet’s QR identifier.
            </div>
          </aside>
        </div>
        <div className="mobile-update-bar">
          <Button onClick={() => setUpdate(true)} className="w-full">
            <Pencil />
            Update tracking
          </Button>
        </div>
      </PageState>
      {update && mode === "live" && (
        <LiveTrackingSheet packet={packet} onOpenChange={setUpdate} />
      )}
      {update && mode === "demo" && (
        <UpdateTracking
          packet={packet}
          open={update}
          onOpenChange={setUpdate}
        />
      )}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="qr-dialog">
          <DialogTitle>Permanent packet QR</DialogTitle>
          <DialogDescription>
            PR {packet.pr} · Reprints always use the same identifier.
          </DialogDescription>
          <div className="qr-print-area">
            <QRCodeSVG
              value={`${qrOrigin ?? ""}/q/${packet.qrId}`}
              size={190}
              level="M"
              title={`Packet QR for PR ${packet.pr}`}
            />
            <strong className="mt-4 block text-sm">PR {packet.pr}</strong>
            <p className="mt-1 text-xs text-slate-500">
              DocTrack · BAC Secretariat
            </p>
            <code className="mt-4 block break-all text-[10px] text-slate-400">
              {packet.qrId}
            </code>
          </div>
          <p className="info-note">
            {mode === "demo"
              ? "Demo QR uses a relative resolver path. Configure a stable origin before printing."
              : "This permanent QR points to the configured DocTrack origin. Authentication is required to view the packet."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyId} className="flex-1">
              <Copy />
              Copy ID
            </Button>
            <Button onClick={() => window.print()} className="flex-1">
              <Printer />
              Print QR
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

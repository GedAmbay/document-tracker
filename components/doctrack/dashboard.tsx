"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileStack,
  MapPin,
  PenLine,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMock } from "./mock-provider";
import {
  PageHeading,
  PageState,
  SectionHeading,
  PacketTable,
  formatDate,
} from "./common";
import { packetMetrics } from "@/modules/documents/domain/packet";

export function DashboardScreen() {
  const { packets, activities, currentUser, mode, liveData } = useMock();
  const metrics = packetMetrics(
    packets,
    liveData?.destinations.find((d) => d.is_bac)?.name,
  );
  const [period, setPeriod] = useState("all");
  const recent =
    period === "today"
      ? packets.filter((p) => p.updatedAt.startsWith("2026-11-07"))
      : packets;
  const cards = [
    {
      label: "Active Packets",
      value: metrics.active,
      detail: "Currently being tracked",
      icon: FileStack,
      filter: "active",
      color: "blue",
    },
    {
      label: "Outside BAC",
      value: metrics.outside,
      detail: "With receiving offices",
      icon: ArrowUpRight,
      filter: "outside",
      color: "purple",
    },
    {
      label: "For Signature",
      value: metrics.signature,
      detail: "Awaiting a signatory",
      icon: PenLine,
      filter: "signature",
      color: "amber",
    },
    {
      label: "Needs Follow-up",
      value: metrics.followUp,
      detail: "Pending receipt confirmation",
      icon: Clock3,
      filter: "followup",
      color: "rose",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORKSPACE, AT A GLANCE"
        title="Tracking dashboard"
        description="Stay on top of every packet, wherever it goes."
        actions={
          <>
            <span className="date-chip">
              <CalendarDays className="size-4" />
              {mode === "demo"
                ? "November 7, 2026 · DEMO"
                : "Tracking overview"}
            </span>
            <Button asChild>
              <Link href="/scanner">
                <ScanLine />
                Scan QR code
              </Link>
            </Button>
          </>
        }
      />
      <PageState>
        <section className="welcome-banner">
          <div>
            <span className="welcome-label">
              <span className="size-1.5 rounded-full bg-blue-300" />
              BAC SECRETARIAT
            </span>
            <h2>Welcome, {currentUser.name.split(" ")[0]}.</h2>
            <p>
              You have <strong>{metrics.followUp} packets</strong> that could
              use a follow-up today.
            </p>
            <Link href="/packets?filter=followup">
              Review follow-ups <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="banner-illustration" aria-hidden="true">
            <div className="document-graphic">
              <div className="graphic-heading">
                <FileStack />
                <span>PR PACKET</span>
              </div>
              <i />
              <i />
              <i />
              <div className="graphic-stamp">
                <MapPin />
                Tracked
              </div>
            </div>
            <span className="graphic-orbit orbit-one" />
            <span className="graphic-orbit orbit-two" />
            <div className="graphic-pin">
              <ScanLine />
            </div>
          </div>
        </section>
        <section aria-label="Tracking metrics" className="metrics-grid">
          {cards.map((c) => (
            <Link
              href={`/packets?filter=${c.filter}`}
              className="metric-card"
              key={c.label}
            >
              <div className="flex items-center justify-between">
                <span className="metric-label">{c.label}</span>
                <span className={`metric-icon metric-${c.color}`}>
                  <c.icon className="size-[18px]" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <strong className="metric-value">
                  {String(c.value).padStart(2, "0")}
                </strong>
                <ArrowUpRight className="size-4 text-slate-300" />
              </div>
              <p className="mt-2 text-xs text-slate-400">{c.detail}</p>
            </Link>
          ))}
        </section>
        <div className="dashboard-columns">
          <section className="panel followup-panel">
            <SectionHeading
              title="Needs a little attention"
              detail="Pending confirmation from receiving offices"
              href="/packets?filter=followup"
            />
            {packets
              .filter((p) => p.followUp)
              .slice(0, 3)
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/packets/${p.id}`}
                  className="attention-row"
                >
                  <span className="attention-icon">
                    <CircleAlert className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong>PR {p.pr}</strong>
                    <p>{p.description}</p>
                    <span>
                      <MapPin className="size-3" />
                      {p.location}
                    </span>
                  </div>
                  <div className="hidden text-right sm:block">
                    <span className="attention-tag">Pending receipt</span>
                    <p className="mt-2 text-[11px] text-slate-400">
                      {formatDate(p.updatedAt)}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-slate-400" />
                </Link>
              ))}
          </section>
          <section className="panel">
            <SectionHeading title="Recent activity" href="/activity" />
            <div className="recent-activity">
              {activities.slice(0, 4).map((a, i) => (
                <Link
                  href={a.packetId ? `/packets/${a.packetId}` : "/activity"}
                  key={a.id}
                  className="activity-mini"
                >
                  <span
                    className={`mini-dot ${i === 0 ? "mini-dot-blue" : ""}`}
                  >
                    <ArrowDownLeft className="size-3.5" />
                  </span>
                  <div>
                    <p>
                      <strong>{a.actor.split(" ")[0]}</strong> ·{" "}
                      {a.action.toLowerCase()}
                    </p>
                    <span>{a.detail.split(" · ")[0]}</span>
                    <time>{formatDate(a.at)}</time>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
        <section className="panel mt-6">
          <div className="section-heading">
            <div>
              <h2>Recently updated packets</h2>
              <p className="muted mt-1 text-xs">
                The latest handoffs across your workspace
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                aria-label="Recent packet period"
                className="small-select hidden sm:block"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="all">Last 7 days</option>
                {mode === "demo" && (
                  <option value="today">Demo day only</option>
                )}
              </select>
              <Link className="text-link" href="/packets">
                View all
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>
          <PacketTable packets={recent.slice(0, 5)} compact />
          <div className="table-footer">
            <span>
              Showing {Math.min(recent.length, 5)} of {recent.length} packets
            </span>
            <Link className="text-link" href="/packets">
              Open packet list
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </section>
      </PageState>
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  History,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useMock } from "./mock-provider";
import {
  EmptyState,
  PageHeading,
  PageState,
  SearchField,
  StatusBadge,
  formatDate,
} from "./common";
import { Button } from "@/components/ui/button";

export function HistoryScreen() {
  const { packets } = useMock();
  const [query, setQuery] = useState("");
  const [office, setOffice] = useState("all");
  const movements = packets
    .flatMap((p) => p.movements.map((m) => ({ ...m, packet: p })))
    .filter(
      (m) =>
        `${m.packet.pr} ${m.packet.description} ${m.actor}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (office === "all" || m.to === office),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
  return (
    <>
      <PageHeading
        eyebrow="HANDOFFS & ROUTING"
        title="Movement history"
        description="Follow the trail of every packet across municipal offices."
      />
      <PageState>
        <div className="panel">
          <div className="filter-bar">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search PR number, description or employee…"
              label="Search movement history"
            />
            <select
              aria-label="History destination"
              className="filter-select"
              value={office}
              onChange={(e) => setOffice(e.target.value)}
            >
              <option value="all">All destinations</option>
              {Array.from(
                new Set(packets.flatMap((p) => p.movements.map((m) => m.to))),
              ).map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="history-summary">
            <History className="size-4" />
            {movements.length} recorded movements
            <span className="ml-auto hidden text-[11px] sm:block">
              Newest first · Philippine Standard Time
            </span>
          </div>
          {movements.length ? (
            <div className="history-list">
              {movements.map((m) => (
                <div className="history-item" key={m.id}>
                  <span className="history-icon">
                    <MapPin className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link
                        href={`/packets/${m.packet.id}`}
                        className="packet-pr"
                      >
                        PR {m.packet.pr}
                      </Link>
                      <time>{formatDate(m.at)}</time>
                    </div>
                    <h3>{m.action}</h3>
                    <div className="history-route">
                      {m.from}
                      <ArrowRight className="size-3 shrink-0" />
                      <strong>{m.to}</strong>
                    </div>
                    <p>{m.note}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="text-[11px] text-slate-400">
                        {m.actor}
                      </span>
                      <StatusBadge status={m.receipt} />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <Link
                      href={`/packets/${m.packet.id}`}
                      aria-label={`Open PR ${m.packet.pr}`}
                    >
                      <ArrowUpRight />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No movements found"
              description="Try another PR number or destination."
            />
          )}
        </div>
      </PageState>
    </>
  );
}
export function ActivityScreen() {
  const { activities, mode } = useMock();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const filtered = activities
    .filter(
      (a) =>
        (category === "all" || a.category === category) &&
        `${a.actor} ${a.action} ${a.detail}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE ACCOUNTABILITY"
        title="Activity log"
        description="A shared record of tracking updates and workspace changes."
      />
      <PageState>
        <div className="info-note mb-6">
          <ShieldCheck className="size-4 shrink-0" />
          <p>
            {mode === "demo"
              ? "This is a read-only demo activity trail."
              : "Tracking events are append-only and enforced by PostgreSQL. Account and configuration administration is separate from this tracking-event log."}
          </p>
        </div>
        <section className="panel">
          <div className="filter-bar">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Search activity"
              placeholder="Search employee, action or PR number…"
            />
            <select
              className="filter-select"
              aria-label="Activity category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All activity</option>
              <option>Tracking</option>
              <option>Access</option>
              <option>Configuration</option>
            </select>
          </div>
          {filtered.length ? (
            <div className="activity-list">
              {filtered.map((a) => (
                <div className="activity-log-row" key={a.id}>
                  <span className="avatar">
                    {a.actor
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p>
                      <strong>{a.actor}</strong>
                      <span className="activity-category">{a.category}</span>
                    </p>
                    <h3>{a.action}</h3>
                    <p className="activity-detail">{a.detail}</p>
                    <time className="mt-2 block sm:hidden">
                      {formatDate(a.at)}
                    </time>
                  </div>
                  <div className="flex items-center gap-2">
                    <time className="hidden whitespace-nowrap sm:block">
                      {formatDate(a.at)}
                    </time>
                    {a.packetId ? (
                      <Button variant="ghost" size="icon" asChild>
                        <Link
                          href={`/packets/${a.packetId}`}
                          aria-label={`View ${a.detail.split(" · ")[0]}`}
                        >
                          <ArrowUpRight />
                        </Link>
                      </Button>
                    ) : (
                      <Activity className="mx-3 size-4 text-slate-300" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No matching activity"
              description="Try another search or activity category."
            />
          )}
          <div className="table-footer">
            <span>{filtered.length} activities</span>
            <span className="text-[11px]">Read-only activity trail</span>
          </div>
        </section>
      </PageState>
    </>
  );
}

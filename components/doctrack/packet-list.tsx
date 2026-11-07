"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Download, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMock } from "./mock-provider";
import {
  EmptyState,
  PageHeading,
  PageState,
  PacketTable,
  SearchField,
} from "./common";
import { trackingStatuses } from "@/modules/documents/domain/packet";
import { cn } from "@/lib/utils";
import { RegisterPacket } from "./live-tracking";

export function PacketListScreen() {
  const params = useSearchParams();
  const { packets, notify, mode, liveData } = useMock();
  const bacName =
    liveData?.destinations.find((d) => d.is_bac)?.name ?? "BAC Secretariat";
  const [filter, setFilter] = useState(params.get("filter") ?? "all");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const filtered = packets.filter(
    (p) =>
      (filter !== "active" || p.status !== "Completed") &&
      (filter !== "outside" ||
        (p.location !== bacName && p.status !== "Completed")) &&
      (filter !== "signature" || p.status === "For signature") &&
      (filter !== "followup" || p.followUp) &&
      (filter !== "completed" || p.status === "Completed") &&
      (location === "all" || p.location === location) &&
      (status === "all" || p.status === status) &&
      `${p.pr} ${p.description} ${p.office}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 6));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 6, currentPage * 6);
  function reset() {
    setSearch("");
    setLocation("all");
    setStatus("all");
    setFilter("all");
    setPage(1);
  }
  function exportPackets() {
    const csv = [
      "PR number,Description,Reported location,Tracking status,Receipt",
      ...filtered.map((p) =>
        [p.pr, p.description, p.location, p.status, p.receipt]
          .map((v) => `"${v.replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "doctrack-demo-packets.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify("Sample packet list exported.");
  }
  return (
    <>
      <PageHeading
        eyebrow="DOCUMENT TRACKING"
        title="PR packets"
        description="One place for every packet and its latest reported location."
        actions={
          <>
            {mode === "live" && <RegisterPacket />}
            <Button variant="outline" onClick={exportPackets}>
              <Download />
              Export
            </Button>
            <Button asChild>
              <Link href="/scanner">
                <ScanLine />
                Scan a packet
              </Link>
            </Button>
          </>
        }
      />
      <PageState>
        <section className="panel">
          <div className="list-tabs" role="group" aria-label="Packet category">
            {[
              ["all", "All packets"],
              ["active", "Active"],
              ["outside", "Outside BAC"],
              ["signature", "For signature"],
              ["followup", "Needs follow-up"],
              ["completed", "Completed"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={cn(filter === value && "selected")}
                aria-pressed={filter === value}
                onClick={() => {
                  setFilter(value);
                  setPage(1);
                }}
              >
                {label}
                {value === "all" && <span>{packets.length}</span>}
              </button>
            ))}
          </div>
          <div className="filter-bar">
            <SearchField
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
            />
            <select
              className="filter-select"
              aria-label="Filter tracking status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              {trackingStatuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              className="filter-select"
              aria-label="Filter reported location"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All destinations</option>
              {Array.from(new Set(packets.map((p) => p.location))).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          {filtered.length ? (
            <PacketTable packets={visible} />
          ) : (
            <EmptyState
              action={
                <Button variant="outline" onClick={reset}>
                  Clear filters
                </Button>
              }
            />
          )}
          <div className="table-footer">
            <span>
              {filtered.length
                ? `${(currentPage - 1) * 6 + 1}–${Math.min(currentPage * 6, filtered.length)}`
                : "0"}{" "}
              of {filtered.length} packets
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ArrowLeft />
              </Button>
              <span className="px-2 text-xs">
                {currentPage} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next page"
                disabled={currentPage >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                <ArrowRight />
              </Button>
            </div>
          </div>
        </section>
        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          Reported locations reflect staff updates. A location update does not
          automatically confirm physical receipt.
        </p>
      </PageState>
    </>
  );
}

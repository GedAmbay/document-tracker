"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  Inbox,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMock } from "./mock-provider";
import { cn } from "@/lib/utils";
import type { Packet } from "@/modules/documents/domain/packet";
import type { ReactNode } from "react";

export function formatDate(value: string, time = true) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    ...(time ? { hour: "numeric", minute: "2-digit" } : { year: "numeric" }),
  }).format(new Date(value));
}
export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Completed" || status === "Confirmed" || status === "Active"
      ? "green"
      : status === "For signature" || status === "Pending confirmation"
        ? "amber"
        : status === "Returned" || status === "Inactive"
          ? "slate"
          : "blue";
  return (
    <Badge variant="outline" className={cn("status-badge", `status-${tone}`)}>
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      {status}
    </Badge>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      )}
    </div>
  );
}
export function SectionHeading({
  title,
  detail,
  href,
  linkLabel = "View all",
}: {
  title: string;
  detail?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {detail && <p className="muted mt-1 text-xs">{detail}</p>}
      </div>
      {href && (
        <Link href={href} className="text-link">
          {linkLabel}
          <ArrowUpRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
export function EmptyState({
  title = "No packets found",
  description = "Try a different search or clear your filters.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Inbox className="size-7" />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function PageState({ children }: { children: ReactNode }) {
  const { preview, setPreview } = useMock();
  if (preview === "loading")
    return (
      <div role="status" aria-label="Loading workspace" className="space-y-5">
        <span className="sr-only">Loading workspace</span>
        <Skeleton className="h-12 w-60" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  if (preview === "error")
    return (
      <div className="panel empty-state">
        <div className="empty-icon">
          <CircleAlert />
        </div>
        <h3>We couldn’t load this view</h3>
        <p>This is a simulated error. Your demo data is still here.</p>
        <Button onClick={() => setPreview("ready")}>
          <RefreshCw />
          Try again
        </Button>
      </div>
    );
  if (preview === "empty")
    return (
      <div className="panel">
        <EmptyState
          title="Nothing here yet"
          description="This is how an empty workspace looks. Restore the sample data to keep exploring."
          action={
            <Button onClick={() => setPreview("ready")}>
              Show sample data
              <ArrowRight />
            </Button>
          }
        />
      </div>
    );
  return children;
}
export function SearchField({
  value,
  onChange,
  placeholder = "Search PR number, description or office…",
  label = "Search packets",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute top-3 left-3.5 size-4 text-slate-400" />
      <Input
        aria-label={label}
        className="h-10 bg-white pl-10"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function FilterLabel({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
      <SlidersHorizontal className="size-3.5" />
      {children}
    </span>
  );
}
export function PacketTable({
  packets,
  compact = false,
}: {
  packets: Packet[];
  compact?: boolean;
}) {
  if (!packets.length) return <EmptyState />;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="data-table">
          <thead>
            <tr>
              <th>PR packet</th>
              <th>Reported location</th>
              <th>Tracking status</th>
              {!compact && <th>Receipt</th>}
              <th>Last updated</th>
              <th>
                <span className="sr-only">Open packet</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {packets.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/packets/${p.id}`} className="packet-pr">
                    PR {p.pr}
                  </Link>
                  <p className="table-description">{p.description}</p>
                </td>
                <td>
                  <span className="location-text">
                    <MapPin className="size-3.5 shrink-0 text-slate-400" />
                    {p.location}
                  </span>
                  {p.followUp && (
                    <span className="mt-1.5 block text-[11px] text-amber-700">
                      Follow-up needed
                    </span>
                  )}
                </td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
                {!compact && (
                  <td>
                    <span className="text-xs text-slate-500">{p.receipt}</span>
                  </td>
                )}
                <td className="whitespace-nowrap text-xs text-slate-500">
                  {formatDate(p.updatedAt)}
                </td>
                <td>
                  <Button asChild variant="ghost" size="icon">
                    <Link
                      href={`/packets/${p.id}`}
                      aria-label={`View PR ${p.pr}`}
                    >
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-100 md:hidden">
        {packets.map((p) => (
          <Link className="mobile-packet" href={`/packets/${p.id}`} key={p.id}>
            <div className="flex items-center justify-between gap-2">
              <span className="packet-pr">PR {p.pr}</span>
              <ArrowUpRight className="size-4 text-slate-400" />
            </div>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
              {p.description}
            </p>
            <span className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="size-3.5" />
              {p.location}
            </span>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <StatusBadge status={p.status} />
              <span className="text-[11px] text-slate-400">
                {formatDate(p.updatedAt)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
export function ReceiptLabel({ receipt }: { receipt: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-xs",
        receipt === "Confirmed" ? "text-emerald-700" : "text-amber-700",
      )}
    >
      {receipt === "Confirmed" ? (
        <Check className="size-3.5" />
      ) : (
        <CircleAlert className="size-3.5" />
      )}
      {receipt}
    </span>
  );
}

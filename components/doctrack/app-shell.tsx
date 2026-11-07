"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  ChevronDown,
  CircleHelp,
  FileStack,
  History,
  LayoutDashboard,
  LogOut,
  MapPinned,
  MoreHorizontal,
  QrCode,
  ScanLine,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useMock, type PreviewState } from "./mock-provider";
import { SearchField, StatusBadge } from "./common";
import { signOutAction } from "@/modules/auth/infrastructure/actions";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/packets", label: "PR packets", icon: FileStack },
  { href: "/scanner", label: "QR scanner", icon: ScanLine },
  { href: "/history", label: "Movement history", icon: History },
  { href: "/activity", label: "Activity log", icon: Activity },
];
const adminNavigation = [
  { href: "/settings", label: "Destinations & actions", icon: MapPinned },
  { href: "/users", label: "User administration", icon: Users },
];
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="DocTrack home"
      className={cn("brand", light && "brand-light")}
    >
      <span className="brand-symbol">
        <FileStack className="size-6" />
      </span>
      <span>
        DocTrack<span className="brand-subtitle">BAC DOCUMENT TRACKING</span>
      </span>
    </Link>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const store = useMock();
  const [more, setMore] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [help, setHelp] = useState(false);
  const [notifications, setNotifications] = useState(false);
  useEffect(() => {
    function openSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearch(true);
      }
    }
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const title =
    [...navigation, ...adminNavigation].find((n) => active(n.href))?.label ??
    "Packet details";
  async function signOut() {
    if (store.mode === "live") {
      await signOutAction();
      return;
    }
    store.setSignedIn(false);
    setMore(false);
    router.push("/login");
  }
  function navItems(items: typeof navigation) {
    return items.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMore(false)}
        className={cn("sidebar-link", active(item.href) && "is-active")}
        aria-current={active(item.href) ? "page" : undefined}
      >
        <item.icon className="size-[18px]" />
        {item.label}
        {item.href === "/packets" && (
          <span className="nav-count">{store.packets.length}</span>
        )}
      </Link>
    ));
  }
  if (!store.signedIn)
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-lg pt-24">
          <Brand />
          <div className="panel mt-8 p-8">
            <ShieldCheck className="mb-4 size-8 text-blue-800" />
            <h1 className="text-2xl font-semibold">
              Your demo session has ended
            </h1>
            <p className="muted my-4">
              Return to the login screen to explore the mock workspace again.
            </p>
            <Button asChild>
              <Link href="/login">
                Go to login
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand light />
        <div className="workspace-tag">
          <span className="size-2 rounded-full bg-emerald-400" />
          <span>Municipal BAC Secretariat</span>
          <ChevronDown className="ml-auto size-3" />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Desktop navigation">{navItems(navigation)}</nav>
        {store.currentUser.role === "Administrator" && (
          <>
            <p className="nav-label mt-8">ADMINISTRATION</p>
            <nav aria-label="Administration">{navItems(adminNavigation)}</nav>
          </>
        )}
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <ShieldCheck className="mb-2 size-5 text-blue-300" />
            <p>Every packet. Every handoff.</p>
            <span>A clearer picture of where your documents are.</span>
          </div>
          <button className="sidebar-link w-full" onClick={() => setHelp(true)}>
            <CircleHelp className="size-[18px]" />
            Help & quick guide
          </button>
          <div className="sidebar-profile">
            <span className="avatar avatar-light">
              {store.currentUser.initials}
            </span>
            <div>
              <strong>{store.currentUser.name}</strong>
              <span>{store.currentUser.role}</span>
            </div>
            <button aria-label="Sign out" onClick={signOut}>
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="hidden items-center gap-2 text-xs text-slate-400 lg:flex">
            Workspace<span className="mx-1">/</span>
            <span className="font-medium text-slate-600">{title}</span>
          </div>
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <button
              className="topbar-search hidden sm:flex"
              onClick={() => setSearch(true)}
            >
              <Search className="size-4" />
              <span>Find a packet…</span>
              <kbd>⌘ K</kbd>
            </button>
            <Button
              className="sm:hidden"
              variant="ghost"
              size="icon"
              aria-label="Search workspace"
              onClick={() => setSearch(true)}
            >
              <Search />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="relative"
              onClick={() => setNotifications(true)}
            >
              <Bell className="size-[18px]" />
              <span className="absolute top-2 right-2 size-1.5 rounded-full bg-blue-600 ring-2 ring-white" />
            </Button>
            <span className="avatar hidden sm:flex">
              {store.currentUser.initials}
            </span>
          </div>
        </header>
        <div className="demo-bar">
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-blue-600" />
            <strong>
              {store.mode === "demo"
                ? "Demo workspace"
                : "Authorized BAC workspace"}
            </strong>
            <span className="hidden sm:inline text-slate-500">
              {store.mode === "demo"
                ? "Sample data only · changes reset on refresh"
                : "Reported location and confirmed receipt are recorded separately"}
            </span>
          </span>
          {store.mode === "demo" && (
            <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="hidden sm:inline">Preview state</span>
              <select
                aria-label="Preview state"
                value={store.preview}
                onChange={(e) =>
                  store.setPreview(e.target.value as PreviewState)
                }
              >
                <option value="ready">Live preview</option>
                <option value="loading">Loading</option>
                <option value="empty">Empty</option>
                <option value="error">Error</option>
              </select>
            </label>
          )}
        </div>
        <main id="main-content" className="main-content">
          {children}
        </main>
        <footer className="workspace-footer">
          <span>DocTrack · BAC Secretariat</span>
          <span>Built for clearer document handoffs.</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navigation.slice(0, 4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active(item.href) ? "page" : undefined}
            className={cn(
              "bottom-link",
              active(item.href) && "is-active",
              item.href === "/scanner" && "scan-nav",
            )}
          >
            <span>
              <item.icon className="size-5" />
            </span>
            <span>
              {item.href === "/history"
                ? "History"
                : item.href === "/scanner"
                  ? "Scan QR"
                  : item.href === "/packets"
                    ? "Packets"
                    : "Home"}
            </span>
          </Link>
        ))}
        <button
          className={cn(
            "bottom-link",
            ["/activity", "/settings", "/users"].includes(pathname) &&
              "is-active",
          )}
          onClick={() => setMore(true)}
        >
          <MoreHorizontal className="size-5" />
          <span>More</span>
        </button>
      </nav>
      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" className="mobile-more">
          <SheetTitle>Workspace menu</SheetTitle>
          <SheetDescription>More tools for your BAC team.</SheetDescription>
          <nav className="mt-4 space-y-1">
            {navItems([
              navigation[4],
              ...(store.currentUser.role === "Administrator"
                ? adminNavigation
                : []),
            ])}
          </nav>
          <Button variant="outline" className="mt-6 w-full" onClick={signOut}>
            <LogOut />
            Sign out
          </Button>
        </SheetContent>
      </Sheet>
      <Dialog open={search} onOpenChange={setSearch}>
        <DialogContent>
          <DialogTitle>Find a PR packet</DialogTitle>
          <DialogDescription>
            Search sample records by PR number, description or office.
          </DialogDescription>
          <SearchField value={query} onChange={setQuery} />
          <div className="max-h-80 overflow-y-auto">
            {store.packets
              .filter((p) =>
                `${p.pr} ${p.description} ${p.office}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/packets/${p.id}`}
                  onClick={() => setSearch(false)}
                  className="search-result"
                >
                  <div>
                    <strong>PR {p.pr}</strong>
                    <p>{p.description}</p>
                  </div>
                  <ArrowRight className="size-4 shrink-0" />
                </Link>
              ))}
            {!store.packets.some((p) =>
              `${p.pr} ${p.description} ${p.office}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            ) && (
              <p className="py-8 text-center text-sm text-slate-500">
                No matching packets.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={notifications} onOpenChange={setNotifications}>
        <DialogContent>
          <DialogTitle>Needs your attention</DialogTitle>
          <DialogDescription>
            Follow-ups from your sample workspace.
          </DialogDescription>
          {store.packets
            .filter((p) => p.followUp)
            .map((p) => (
              <Link
                href={`/packets/${p.id}`}
                key={p.id}
                className="search-result"
                onClick={() => setNotifications(false)}
              >
                <div>
                  <strong>PR {p.pr}</strong>
                  <p>{p.location}</p>
                  <div className="mt-2">
                    <StatusBadge status={p.receipt} />
                  </div>
                </div>
                <ArrowRight className="size-4 shrink-0" />
              </Link>
            ))}
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent>
          <DialogTitle>A simpler tracking routine</DialogTitle>
          <DialogDescription>
            {store.mode === "demo"
              ? "All screens use fictional records. No database is connected."
              : "Tracking is stored in PostgreSQL. Confirm receipt only against an acknowledged pending transfer."}
          </DialogDescription>
          <ol className="guide-steps">
            <li>
              <ScanLine />
              <div>
                <strong>1. Scan the packet</strong>
                <p>
                  Use manual PR/QR lookup; camera integration is a separate
                  milestone.
                </p>
              </div>
            </li>
            <li>
              <QrCode />
              <div>
                <strong>2. Check the details</strong>
                <p>Review the reported location and receipt state.</p>
              </div>
            </li>
            <li>
              <ArrowRight />
              <div>
                <strong>3. Update and save</strong>
                <p>
                  Record a destination, action and note. The timeline updates
                  immediately.
                </p>
              </div>
            </li>
          </ol>
          <Button onClick={() => setHelp(false)}>Got it</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

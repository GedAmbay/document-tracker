"use client";

import { useState } from "react";
import {
  Building2,
  Check,
  ClipboardList,
  Info,
  MapPin,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Users,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  PageHeading,
  PageState,
  SearchField,
  StatusBadge,
} from "./common";
import type {
  ActionTemplate,
  Destination,
  Member,
} from "@/modules/documents/domain/packet";

type Editable = {
  kind: "destination" | "template";
  id?: string;
  name: string;
  detail: string;
  active: boolean;
};
export function SettingsScreen() {
  const { destinations, templates, saveDestination, saveTemplate, mode } =
    useMock();
  const [tab, setTab] = useState("destinations");
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<Editable | null>(null);
  const [error, setError] = useState("");
  function open(kind: Editable["kind"], value?: Destination | ActionTemplate) {
    setError("");
    setEdit({
      kind,
      id: value?.id,
      name: value?.name ?? "",
      detail: value
        ? "detail" in value
          ? value.detail
          : value.description
        : "",
      active: value?.active ?? true,
    });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const result = z
      .object({
        name: z.string().trim().min(3).max(80),
        detail: z.string().trim().min(5).max(240),
      })
      .safeParse(edit);
    if (!result.success) {
      setError(
        "Use a name of 3–80 characters and a description of 5–240 characters.",
      );
      return;
    }
    const rows = edit.kind === "destination" ? destinations : templates;
    if (
      rows.some(
        (d) =>
          d.id !== edit.id &&
          d.name.toLowerCase() === result.data.name.toLowerCase(),
      )
    ) {
      setError("This name is already in use. Choose a unique name.");
      return;
    }
    const base = {
      id: edit.id ?? crypto.randomUUID(),
      name: result.data.name,
      active: edit.active,
    };
    try {
      if (edit.kind === "destination")
        await saveDestination({ ...base, detail: result.data.detail });
      else await saveTemplate({ ...base, description: result.data.detail });
      setEdit(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save. Please retry.",
      );
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE SETTINGS"
        title="Destinations & action templates"
        description="Keep office names and tracking actions consistent across your team."
        actions={
          <Button
            onClick={() =>
              open(tab === "destinations" ? "destination" : "template")
            }
          >
            <Plus />
            {tab === "destinations" ? "Add destination" : "Add action template"}
          </Button>
        }
      />
      <PageState>
        <div className="info-note mb-6">
          <Info className="size-4 shrink-0" />
          <p>
            {mode === "demo"
              ? "Administrator demo. Changes apply in this session."
              : "Administrator settings. Changes apply to subsequent tracking events."}{" "}
            Deactivating an item preserves existing packet history.
          </p>
        </div>
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v);
            setQuery("");
          }}
        >
          <TabsList className="settings-tabs">
            <TabsTrigger value="destinations">
              <MapPin className="mr-2 size-4" />
              Destinations
              <span className="tab-count">{destinations.length}</span>
            </TabsTrigger>
            <TabsTrigger value="templates">
              <ClipboardList className="mr-2 size-4" />
              Action templates
              <span className="tab-count">{templates.length}</span>
            </TabsTrigger>
          </TabsList>
          <div className="mb-5 mt-6 flex max-w-lg">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Search settings"
              placeholder={
                tab === "destinations"
                  ? "Find a destination…"
                  : "Find an action template…"
              }
            />
          </div>
          <TabsContent value="destinations">
            <div className="settings-grid">
              {destinations
                .filter((d) =>
                  `${d.name} ${d.detail}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((d) => (
                  <article className="panel setting-card" key={d.id}>
                    <div className="flex items-center justify-between">
                      <span className="setting-icon">
                        <Building2 className="size-5" />
                      </span>
                      <StatusBadge status={d.active ? "Active" : "Inactive"} />
                    </div>
                    <h2>{d.name}</h2>
                    <p>{d.detail}</p>
                    <div className="setting-card-footer">
                      <span>
                        {d.active
                          ? "Available in tracking updates"
                          : "Hidden from new updates"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${d.name}`}
                        onClick={() => open("destination", d)}
                      >
                        <Pencil />
                      </Button>
                    </div>
                  </article>
                ))}
            </div>
            {!destinations.some((d) =>
              `${d.name} ${d.detail}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            ) && (
              <div className="panel">
                <EmptyState
                  title="No destinations found"
                  description="Try a different office name."
                />
              </div>
            )}
          </TabsContent>
          <TabsContent value="templates">
            <div className="settings-grid">
              {templates
                .filter((t) =>
                  `${t.name} ${t.description}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((t) => (
                  <article className="panel setting-card" key={t.id}>
                    <div className="flex items-center justify-between">
                      <span className="setting-icon">
                        <ClipboardList className="size-5" />
                      </span>
                      <StatusBadge status={t.active ? "Active" : "Inactive"} />
                    </div>
                    <h2>{t.name}</h2>
                    <p>{t.description}</p>
                    <div className="setting-card-footer">
                      <span>
                        {t.active
                          ? "Available in tracking updates"
                          : "Hidden from new updates"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${t.name}`}
                        onClick={() => open("template", t)}
                      >
                        <Pencil />
                      </Button>
                    </div>
                  </article>
                ))}
            </div>
            {!templates.some((t) =>
              `${t.name} ${t.description}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            ) && (
              <div className="panel">
                <EmptyState
                  title="No action templates found"
                  description="Try a different action name."
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PageState>
      <Dialog
        open={!!edit}
        onOpenChange={(v) => {
          if (!v) setEdit(null);
        }}
      >
        <DialogContent>
          <DialogTitle>
            {edit?.id ? "Edit" : "Add"}{" "}
            {edit?.kind === "destination" ? "destination" : "action template"}
          </DialogTitle>
          <DialogDescription>
            Keep labels clear and familiar to your BAC team.
          </DialogDescription>
          {edit && (
            <form onSubmit={save} className="space-y-5" noValidate>
              <div className="form-field">
                <Label htmlFor="setting-name">Name</Label>
                <Input
                  id="setting-name"
                  maxLength={80}
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  placeholder={
                    edit.kind === "destination"
                      ? "e.g. Municipal Legal Office"
                      : "e.g. Routed for verification"
                  }
                />
              </div>
              <div className="form-field">
                <Label htmlFor="setting-detail">
                  {edit.kind === "destination"
                    ? "Office location / details"
                    : "Description"}
                </Label>
                <Textarea
                  id="setting-detail"
                  maxLength={240}
                  value={edit.detail}
                  onChange={(e) => setEdit({ ...edit, detail: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                <div>
                  <Label htmlFor="setting-active">
                    Available for new updates
                  </Label>
                  <p className="mt-1 text-xs text-slate-400">
                    Existing history is always preserved.
                  </p>
                </div>
                <Switch
                  id="setting-active"
                  checked={edit.active}
                  onCheckedChange={(active) => setEdit({ ...edit, active })}
                />
              </div>
              {error && (
                <p className="field-error" role="alert">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEdit(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <Save />
                  Save changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
export function UsersScreen() {
  const { members, saveMember, currentUser, mode } = useMock();
  const [accessError, setAccessError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [edit, setEdit] = useState<Member | null>(null);
  const [roster, setRoster] = useState(false);
  const filtered = members.filter(
    (m) =>
      `${m.name} ${m.email}`.toLowerCase().includes(query.toLowerCase()) &&
      (status === "all" || (status === "active") === m.active),
  );
  const self = edit?.id === currentUser.id;
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE ADMINISTRATION"
        title="User administration"
        description="Manage access for your seven authorized BAC employees."
        actions={
          <Button variant="outline" onClick={() => setRoster(true)}>
            <Users />
            Authorized roster
          </Button>
        }
      />
      <PageState>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="panel user-metric">
            <Users />
            <div>
              <strong>
                {members.length}
                <span>/ 7</span>
              </strong>
              <p>Authorized employees</p>
            </div>
          </div>
          <div className="panel user-metric">
            <Check />
            <div>
              <strong>{members.filter((m) => m.active).length}</strong>
              <p>Active access</p>
            </div>
          </div>
          <div className="panel user-metric">
            <ShieldCheck />
            <div>
              <strong>
                {members.filter((m) => m.role === "Administrator").length}
              </strong>
              <p>Workspace administrator</p>
            </div>
          </div>
        </div>
        <div className="info-note my-6">
          <ShieldCheck className="size-4 shrink-0" />
          <p>
            {mode === "demo"
              ? "Invite-only workspace demo. No real accounts or permissions are changed."
              : "Invite-only workspace. Every access change is checked on the server and in PostgreSQL."}
          </p>
        </div>
        <section className="panel">
          <div className="filter-bar">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search employee name or email…"
              label="Search employees"
            />
            <select
              className="filter-select"
              aria-label="Employee access status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All access states</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {filtered.length ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="data-table user-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Role</th>
                      <th>Access</th>
                      <th>Last seen</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="avatar">{m.initials}</span>
                            <div>
                              <strong>
                                {m.name}
                                {m.id === currentUser.id && (
                                  <span className="ml-2 text-[10px] font-normal text-slate-400">
                                    YOU
                                  </span>
                                )}
                              </strong>
                              <p>{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="role-label">
                            {m.role === "Administrator" && (
                              <ShieldCheck className="size-3.5" />
                            )}
                            {m.role}
                          </span>
                        </td>
                        <td>
                          <StatusBadge
                            status={m.active ? "Active" : "Inactive"}
                          />
                        </td>
                        <td className="text-xs text-slate-400">{m.lastSeen}</td>
                        <td>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEdit({ ...m })}
                            aria-label={`Manage ${m.name}`}
                          >
                            <Pencil />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-slate-100 md:hidden">
                {filtered.map((m) => (
                  <div key={m.id} className="p-5">
                    <div className="flex items-center gap-3">
                      <span className="avatar">{m.initials}</span>
                      <div className="min-w-0 flex-1">
                        <strong className="text-sm">{m.name}</strong>
                        <p className="break-all text-[11px] text-slate-400">
                          {m.email}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEdit({ ...m })}
                        aria-label={`Manage ${m.name}`}
                      >
                        <Pencil />
                      </Button>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-slate-500">{m.role}</span>
                      <StatusBadge status={m.active ? "Active" : "Inactive"} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="No employees found"
              description="Try a different name or access state."
            />
          )}
          <div className="table-footer">
            <span>{filtered.length} of 7 employees</span>
            <span className="text-[11px]">Public registration disabled</span>
          </div>
        </section>
      </PageState>
      <Dialog
        open={!!edit}
        onOpenChange={(v) => {
          if (!v) setEdit(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Manage employee access</DialogTitle>
          <DialogDescription>
            {edit?.name} ·{" "}
            {mode === "demo"
              ? "Demo changes only"
              : "Server-verified access settings"}
          </DialogDescription>
          {edit && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAccessError("");
                try {
                  await saveMember(edit);
                  setEdit(null);
                } catch (error) {
                  setAccessError(
                    error instanceof Error
                      ? error.message
                      : "Unable to save access.",
                  );
                }
              }}
              className="space-y-5"
            >
              {accessError && (
                <p className="error-note" role="alert">
                  {accessError}
                </p>
              )}
              <div className="rounded-lg bg-slate-50 p-4 text-sm">
                <strong>{edit.name}</strong>
                <p className="mt-1 break-all text-xs text-slate-400">
                  {edit.email}
                </p>
              </div>
              <div className="form-field">
                <Label htmlFor="member-role">Workspace role</Label>
                <select
                  id="member-role"
                  className="form-select"
                  disabled={self}
                  value={edit.role}
                  onChange={(e) =>
                    setEdit({ ...edit, role: e.target.value as Member["role"] })
                  }
                >
                  <option>Tracking officer</option>
                  <option>Administrator</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
                <div>
                  <Label htmlFor="member-active">Employee access active</Label>
                  <p className="mt-1 text-xs text-slate-400">
                    Inactive employees retain their recorded history.
                  </p>
                </div>
                <Switch
                  id="member-active"
                  disabled={self}
                  checked={edit.active}
                  onCheckedChange={(active) => setEdit({ ...edit, active })}
                />
              </div>
              {self && (
                <p className="info-note">
                  Your own administrator access is protected.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEdit(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={self}>
                  <Save />
                  Save access
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={roster} onOpenChange={setRoster}>
        <DialogContent>
          <DialogTitle>Seven employees. One workspace.</DialogTitle>
          <DialogDescription>
            This workspace is limited to the authorized BAC roster. New
            invitations and roster replacement will be handled by an
            administrator when authentication is implemented.
          </DialogDescription>
          <div className="max-h-72 divide-y overflow-y-auto">
            {members.map((m) => (
              <div className="flex items-center gap-3 py-3" key={m.id}>
                <span className="avatar">{m.initials}</span>
                <strong className="flex-1 text-sm">{m.name}</strong>
                <StatusBadge status={m.active ? "Active" : "Inactive"} />
              </div>
            ))}
          </div>
          <Button onClick={() => setRoster(false)}>Done</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

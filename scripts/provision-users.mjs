// Operator-only script. Never import this file into the Next.js application.
// It only mutates local Supabase; remote provisioning requires separate approval/review.
import { readFileSync } from "node:fs";
import { z } from "zod";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const rosterSchema = z
  .array(
    z.object({
      slot: z.number().int().min(1).max(7),
      email: z.email().transform((v) => v.trim().toLowerCase()),
      displayName: z.string().trim().min(1).max(120),
      role: z.enum(["admin", "staff"]),
    }),
  )
  .length(7)
  .refine(
    (rows) => new Set(rows.map((r) => r.slot)).size === 7,
    "Slots must be unique",
  )
  .refine(
    (rows) => new Set(rows.map((r) => r.email)).size === 7,
    "Emails must be unique",
  )
  .refine(
    (rows) => rows.some((r) => r.role === "admin"),
    "At least one administrator is required",
  );
const rosterPath = process.argv
  .find((v) => v.startsWith("--roster="))
  ?.slice("--roster=".length);
if (!rosterPath) {
  console.error(
    "Usage: npm run provision:users -- --roster=PATH [--apply-local]",
  );
  process.exit(1);
}
let client;
try {
  const roster = rosterSchema.parse(
    JSON.parse(readFileSync(rosterPath, "utf8")),
  );
  if (!process.argv.includes("--apply-local")) {
    console.log(
      "Valid seven-employee roster. Dry run: no database, Auth or email changes made. Use --apply-local with local operator environment variables.",
    );
    process.exit(0);
  }
  const url = new URL(process.env.SUPABASE_OPERATOR_URL ?? "");
  const dbUrl = new URL(process.env.SUPABASE_OPERATOR_DB_URL ?? "");
  const origin = new URL(process.env.APP_URL ?? "http://localhost:3000");
  const local = (host) => ["localhost", "127.0.0.1", "[::1]"].includes(host);
  if (
    !local(url.hostname) ||
    !local(dbUrl.hostname) ||
    !local(origin.hostname) ||
    !["postgres:", "postgresql:"].includes(dbUrl.protocol)
  )
    throw new Error(
      "Only loopback local targets are supported. Remote targets require a separately approved provisioning procedure.",
    );
  if (!process.env.SUPABASE_OPERATOR_SECRET_KEY)
    throw new Error("Local operator secret key is missing.");
  client = new pg.Client({ connectionString: dbUrl.href });
  await client.connect();
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock(71001)");
    const existing = (
      await client.query(
        "select * from private.authorized_employees for update",
      )
    ).rows;
    for (const row of roster) {
      const slot = existing.find((r) => r.slot === row.slot);
      if (slot?.user_id && slot.email !== row.email)
        throw new Error(
          "Assigned roster slots cannot be replaced. Review a roster migration with the office.",
        );
      if (slot && slot.email !== row.email)
        throw new Error(
          "Roster email changes require an operator-reviewed migration.",
        );
      await client.query(
        `insert into private.authorized_employees(slot,email,display_name,role) values($1,$2,$3,$4)
        on conflict(slot) do update set display_name=excluded.display_name,role=excluded.role where private.authorized_employees.user_id is null`,
        [row.slot, row.email, row.displayName, row.role],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
  // Commit the roster first: the Auth insert trigger acquires the same roster lock.
  const admin = createClient(
    url.href,
    process.env.SUPABASE_OPERATOR_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  for (const row of roster) {
    const assigned = (
      await client.query(
        "select user_id from private.authorized_employees where slot=$1",
        [row.slot],
      )
    ).rows[0];
    if (assigned.user_id) {
      console.log(`Slot ${row.slot}: already provisioned; unchanged.`);
      continue;
    }
    const { error } = await admin.auth.admin.inviteUserByEmail(row.email, {
      redirectTo: new URL("/auth/set-password", origin).href,
    });
    if (error)
      throw new Error(
        `Invitation failed for slot ${row.slot}. Review local Auth/mail setup, then rerun. No accounts were deleted.`,
      );
    console.log(`Slot ${row.slot}: invitation requested.`);
  }
  console.log(
    "Local provisioning completed. Inspect invitations in the local mail inbox. No temporary passwords were assigned or printed.",
  );
} catch (error) {
  console.error(
    error instanceof z.ZodError
      ? "Invalid roster; check seven unique slots/emails, names and admin/staff roles."
      : error instanceof Error
        ? error.message
        : "Provisioning failed.",
  );
  process.exitCode = 1;
} finally {
  if (client) await client.end();
}

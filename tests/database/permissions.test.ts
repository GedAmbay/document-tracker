import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

const db = new PGlite();
const uid = (n: number) =>
  `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const bac = "10000000-0000-4000-8000-000000000001";
const budget = "10000000-0000-4000-8000-000000000002";
const mayor = "10000000-0000-4000-8000-000000000003";
const action = (n: number) =>
  `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function asUser(n: number | null, role = "authenticated") {
  await db.exec(`reset role; set role ${role};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    n ? uid(n) : "",
  ]);
}
async function rows(sql: string, args: unknown[] = []) {
  return (await db.query<Record<string, unknown>>(sql, args)).rows;
}
async function scalar(sql: string, args: unknown[] = []) {
  return Object.values((await rows(sql, args))[0])[0];
}
async function denied(sql: string, args: unknown[] = [], code = "42501") {
  await db.exec("savepoint denied_operation");
  let thrown: unknown;
  try {
    await db.query(sql, args);
  } catch (error) {
    thrown = error;
  }
  await db.exec(
    "rollback to savepoint denied_operation; release savepoint denied_operation",
  );
  expect(thrown).toMatchObject({ code });
}
async function register(
  key = uid(50),
  docs = [
    { title: "Purchase Request", page_count: 2 },
    { title: "Specifications", page_count: 3 },
  ],
) {
  return (await scalar(
    "select public.create_tracking_packet($1,'PR-2026-0142','Office supplies for Municipal Health Office',$2,$3)",
    [key, bac, JSON.stringify(docs)],
  )) as {
    packet_id: string;
    event_id: string;
    version: number;
    duplicate: boolean;
  };
}
async function record(
  packet: string,
  version: number,
  kind = 2,
  docs?: string[],
  extra: {
    transfer?: string;
    recipient?: string;
    reference?: string;
    key?: string;
    destination?: string;
  } = {},
) {
  const selected =
    docs ??
    (
      await rows(
        "select id from public.packet_documents where packet_id=$1 order by id",
        [packet],
      )
    ).map((r) => r.id as string);
  return (await scalar(
    "select public.record_tracking_event($1,$2,$3,$4,'in_review',$5,$6,'Document routing note',$7,$8,$9)",
    [
      packet,
      extra.key ?? crypto.randomUUID(),
      version,
      action(kind),
      extra.destination ?? budget,
      selected,
      extra.transfer ?? null,
      extra.recipient ?? null,
      extra.reference ?? null,
    ],
  )) as {
    packet_id: string;
    event_id: string;
    version: number;
    transfer_id: string;
    duplicate: boolean;
  };
}
beforeAll(async () => {
  // Minimal Auth schema only. The migrations and PostgreSQL RLS/PLpgSQL are real.
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create role supabase_auth_admin;
    create schema auth; create table auth.users(id uuid primary key,email text,invited_at timestamptz,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  const migrations = resolve("supabase/migrations");
  for (const file of readdirSync(migrations)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(resolve(migrations, file), "utf8"));
  for (let n = 1; n <= 7; n++) {
    await db.query(
      "insert into private.authorized_employees(slot,email,display_name,role) values($1,$2,$3,$4)",
      [
        n,
        `employee${n}@example.com`,
        `Employee ${n}`,
        n === 1 ? "admin" : "staff",
      ],
    );
    await db.query(
      "insert into auth.users(id,email,invited_at) values($1,$2,now())",
      [uid(n), `employee${n}@example.com`],
    );
  }
  await db.exec(`update public.profiles set active=false where id='${uid(7)}'`);
});
afterAll(async () => {
  await db.close();
});
beforeEach(async () => {
  await db.exec("begin");
  await asUser(2);
});
afterEach(async () => {
  await db.exec("rollback; reset role");
});

describe("permission boundaries", () => {
  it("has RLS and denies direct mutations on every exposed table", async () => {
    const tables = [
      "profiles",
      "tracking_packets",
      "packet_documents",
      "tracking_events",
      "tracking_transfers",
      "destinations",
      "action_templates",
      "tracking_current_state",
      "external_record_links",
    ];
    for (const table of tables) {
      expect(
        await scalar(
          "select relrowsecurity from pg_class where oid=$1::regclass",
          [`public.${table}`],
        ),
      ).toBe(true);
      await denied(`delete from public.${table}`);
    }
  });
  it("anonymous callers cannot read data or execute tracking RPCs", async () => {
    await asUser(null, "anon");
    await denied("select * from public.tracking_packets");
    await denied(
      "select public.create_tracking_packet($1,'PR','Description',$2,'[]')",
      [uid(40), bac],
    );
  });
  it("unknown and inactive authenticated users see no records and cannot mutate", async () => {
    for (const n of [99, 7]) {
      await asUser(n);
      expect(await rows("select * from public.destinations")).toHaveLength(0);
      await denied(
        "select public.save_destination(null,'Forbidden office','',true)",
      );
    }
  });
  it("staff cannot promote themselves or administer lookup tables", async () => {
    await denied("update public.profiles set role='admin' where id=$1", [
      uid(2),
    ]);
    await denied("select public.set_profile_access($1,'admin',true)", [uid(2)]);
    await denied(
      "select public.save_action_template(null,'Forged receipt','',true)",
    );
    await denied(
      "select public.save_destination(null,'Forbidden office','',true)",
    );
    await denied("select public.link_external_record($1,'procurement','123')", [
      uid(80),
    ]);
  });
  it("admin changes apply immediately to an existing JWT identity", async () => {
    await asUser(1);
    await db.query("select public.set_profile_access($1,'staff',false)", [
      uid(2),
    ]);
    await asUser(2);
    expect(await rows("select * from public.profiles")).toHaveLength(0);
    await denied(
      "select public.create_tracking_packet($1,'PR','Description',$2,'[]')",
      [uid(40), bac],
    );
  });
  it("protects the acting admin and blocks inactive admins", async () => {
    await asUser(1);
    await denied("select public.set_profile_access($1,'staff',false)", [
      uid(1),
    ]);
    await db.exec("reset role");
    await db.query("update public.profiles set active=false where id=$1", [
      uid(1),
    ]);
    await asUser(1);
    await denied("select public.save_destination(null,'Legal Office','',true)");
  });
  it("does not expose private roster or privileged bypass RPCs", async () => {
    await denied("select * from private.authorized_employees");
    await denied("select private.require_employee(false)");
    await asUser(1, "service_role");
    await denied(
      "insert into public.destinations(name) values('Bypassed office')",
    );
  });
});
describe("authorized accounts", () => {
  it("refuses an eighth employee and arbitrary signup even with forged admin metadata", async () => {
    await db.exec("reset role");
    await denied(
      "insert into private.authorized_employees(slot,email,display_name,role) values(8,'extra@example.com','Extra','admin')",
      [],
      "23514",
    );
    await denied(
      "insert into auth.users(id,email,raw_user_meta_data) values($1,'intruder@example.com','{\"role\":\"admin\"}')",
      [uid(8)],
    );
    await denied(
      "insert into auth.users(id,email,invited_at) values($1,'unlisted@example.com',now())",
      [uid(8)],
    );
  });
  it("provisions only an invited allowlisted identity and ignores editable user metadata", async () => {
    await db.exec("reset role");
    await db.query(
      'update auth.users set raw_user_meta_data=\'{"role":"admin"}\' where id=$1',
      [uid(2)],
    );
    expect(
      await scalar("select role from public.profiles where id=$1", [uid(2)]),
    ).toBe("staff");
    await denied(
      "update auth.users set email='replacement@example.com' where id=$1",
      [uid(2)],
    );
    expect(await scalar("select count(*)::int from public.profiles")).toBe(7);
  });
});
describe("atomic tracking and custody", () => {
  it("rolls back event and transfer inserts if the final projection write fails", async () => {
    const p = await register();
    await db.exec("reset role");
    await db.exec(`create function pg_temp.reject_projection() returns trigger language plpgsql as $$ begin raise exception 'Injected projection failure' using errcode='P0001'; end; $$;
      create trigger test_projection_failure before update on public.tracking_current_state for each row execute function pg_temp.reject_projection();`);
    await asUser(2);
    const docs = (
      await rows("select id from public.packet_documents where packet_id=$1", [
        p.packet_id,
      ])
    ).map((r) => r.id);
    await denied(
      "select public.record_tracking_event($1,$2,1,$3,'in_transit',$4,$5)",
      [p.packet_id, uid(62), action(2), budget, docs],
      "P0001",
    );
    expect(
      await scalar(
        "select count(*)::int from public.tracking_events where packet_id=$1",
        [p.packet_id],
      ),
    ).toBe(1);
    expect(
      await scalar(
        "select count(*)::int from public.tracking_transfers where packet_id=$1",
        [p.packet_id],
      ),
    ).toBe(0);
    expect(
      await scalar(
        "select version from public.tracking_current_state where packet_id=$1",
        [p.packet_id],
      ),
    ).toBe(1);
  });
  it("reads a coherent RLS-scoped packet, event and state snapshot", async () => {
    const p = await register();
    const data = (await scalar("select public.read_tracking_workspace()")) as {
      packets: { id: string }[];
      events: { id: string }[];
      states: { latest_event_id: string }[];
    };
    expect(data.packets[0].id).toBe(p.packet_id);
    expect(data.events[0].id).toBe(p.event_id);
    expect(data.states[0].latest_event_id).toBe(p.event_id);
    await asUser(7);
    await denied("select public.read_tracking_workspace()");
  });
  it("creates separate permanent UUIDs, documents, initial event and state", async () => {
    const created = await register();
    const packet = (
      await rows("select * from public.tracking_packets where id=$1", [
        created.packet_id,
      ])
    )[0];
    expect(packet.qr_token).not.toBe(packet.id);
    expect(
      await scalar(
        "select count(*)::int from public.packet_documents where packet_id=$1",
        [created.packet_id],
      ),
    ).toBe(2);
    expect(
      (
        await rows(
          "select * from public.tracking_current_state where packet_id=$1",
          [created.packet_id],
        )
      )[0],
    ).toMatchObject({
      version: 1,
      receipt_state: "unconfirmed",
      confirmed_custody_destination_id: null,
    });
    expect(
      (
        await rows("select * from public.tracking_events where id=$1", [
          created.event_id,
        ])
      )[0],
    ).toMatchObject({ recorded_by: uid(2), custody_confirmed: false });
  });
  it("registration retries return the same identity and conflicting reuse fails", async () => {
    const first = await register();
    expect(await register()).toMatchObject({
      packet_id: first.packet_id,
      event_id: first.event_id,
      duplicate: true,
    });
    await denied(
      "select public.create_tracking_packet($1,'Different','Description',$2,'[]')",
      [uid(50), bac],
      "23505",
    );
    expect(
      await scalar("select count(*)::int from public.tracking_packets"),
    ).toBe(1);
  });
  it("rolls back a packet and its documents if document validation fails", async () => {
    await denied(
      "select public.create_tracking_packet($1,'PR','Description',$2,$3)",
      [
        uid(50),
        bac,
        JSON.stringify([
          { title: "Valid", page_count: 1 },
          { title: "Invalid", page_count: 0 },
        ]),
      ],
      "23514",
    );
    expect(
      await scalar("select count(*)::int from public.tracking_packets"),
    ).toBe(0);
    expect(
      await scalar("select count(*)::int from public.tracking_events"),
    ).toBe(0);
  });
  it("forwarding creates a pending transfer, never confirmed receipt", async () => {
    const p = await register();
    const event = await record(p.packet_id, 1);
    expect(
      (
        await rows("select * from public.tracking_events where id=$1", [
          event.event_id,
        ])
      )[0],
    ).toMatchObject({
      action_kind: "forward",
      custody_confirmed: false,
      confirmed_destination_id: null,
    });
    expect(
      (
        await rows(
          "select * from public.tracking_current_state where packet_id=$1",
          [p.packet_id],
        )
      )[0],
    ).toMatchObject({
      version: 2,
      receipt_state: "pending",
      confirmed_custody_destination_id: null,
      reported_destination_id: budget,
    });
    expect(
      (
        await rows("select * from public.tracking_transfers where id=$1", [
          event.transfer_id,
        ])
      )[0].status,
    ).toBe("pending");
  });
  it("confirming receipt requires the matching transfer, documents, recipient and acknowledgment", async () => {
    const p = await register();
    const transfer = await record(p.packet_id, 1);
    const docs = (
      await rows(
        "select id from public.packet_documents where packet_id=$1 order by id",
        [p.packet_id],
      )
    ).map((r) => r.id as string);
    await denied(
      "select public.record_tracking_event($1,$2,2,$3,'in_review',$4,$5,null,$6,null,null)",
      [p.packet_id, uid(51), action(3), budget, docs, transfer.transfer_id],
      "22023",
    );
    await record(p.packet_id, 2, 3, docs, {
      transfer: transfer.transfer_id,
      recipient: "Budget receiving officer",
      reference: "Signed receiving copy RC-001",
    });
    expect(
      (
        await rows(
          "select * from public.tracking_current_state where packet_id=$1",
          [p.packet_id],
        )
      )[0],
    ).toMatchObject({
      receipt_state: "confirmed",
      confirmed_custody_destination_id: budget,
    });
    expect(
      await scalar(
        "select count(*)::int from public.tracking_events where custody_confirmed",
      ),
    ).toBe(1);
  });
  it("partial-document receipt does not confirm the entire packet", async () => {
    const p = await register();
    const docs = (
      await rows(
        "select id from public.packet_documents where packet_id=$1 order by id",
        [p.packet_id],
      )
    ).map((r) => r.id as string);
    const transfer = await record(p.packet_id, 1, 2, [docs[0]]);
    await record(p.packet_id, 2, 3, [docs[0]], {
      transfer: transfer.transfer_id,
      recipient: "Receiving staff",
      reference: "RC-002",
    });
    expect(
      (
        await rows(
          "select * from public.tracking_current_state where packet_id=$1",
          [p.packet_id],
        )
      )[0],
    ).toMatchObject({
      receipt_state: "partial",
      confirmed_custody_destination_id: null,
    });
  });
  it("rejects another packet's documents and stale versions without partial updates", async () => {
    const a = await register();
    const b = await register(uid(51));
    const foreign = await scalar(
      "select id from public.packet_documents where packet_id=$1 limit 1",
      [b.packet_id],
    );
    await denied(
      "select public.record_tracking_event($1,$2,1,$3,'in_review',$4,$5)",
      [a.packet_id, uid(52), action(2), budget, [foreign]],
      "22023",
    );
    await record(a.packet_id, 1);
    const docs = (
      await rows("select id from public.packet_documents where packet_id=$1", [
        a.packet_id,
      ])
    ).map((r) => r.id);
    await denied(
      "select public.record_tracking_event($1,$2,1,$3,'in_review',$4,$5)",
      [a.packet_id, uid(53), action(4), budget, docs],
      "40001",
    );
    expect(
      await scalar(
        "select version from public.tracking_current_state where packet_id=$1",
        [a.packet_id],
      ),
    ).toBe(2);
  });
  it("returns the same event for a duplicate submission and rejects overlapping pending forwarding", async () => {
    const p = await register();
    const key = uid(60);
    const a = await record(p.packet_id, 1, 2, undefined, { key });
    const b = await record(p.packet_id, 1, 2, undefined, { key });
    expect(b).toMatchObject({
      event_id: a.event_id,
      transfer_id: a.transfer_id,
      duplicate: true,
    });
    const docs = (
      await rows("select id from public.packet_documents where packet_id=$1", [
        p.packet_id,
      ])
    ).map((r) => r.id);
    await denied(
      "select public.record_tracking_event($1,$2,2,$3,'in_transit',$4,$5)",
      [p.packet_id, uid(61), action(2), mayor, docs],
      "40001",
    );
    expect(
      await scalar(
        "select count(*)::int from public.tracking_events where packet_id=$1",
        [p.packet_id],
      ),
    ).toBe(2);
  });
  it("rejects forged receipt fields on ordinary actions", async () => {
    const p = await register();
    const docs = (
      await rows("select id from public.packet_documents where packet_id=$1", [
        p.packet_id,
      ])
    ).map((r) => r.id);
    await denied(
      "select public.record_tracking_event($1,$2,1,$3,'for_signature',$4,$5,null,null,'Recipient','Fake receipt')",
      [p.packet_id, uid(60), action(5), budget, docs],
      "22023",
    );
  });
  it("history and QR identity cannot be changed even by a privileged direct mutation", async () => {
    const p = await register();
    await db.exec("reset role");
    await denied(
      "update public.tracking_packets set qr_token=gen_random_uuid() where id=$1",
      [p.packet_id],
    );
    await denied(
      "update public.tracking_events set remarks='Rewritten' where packet_id=$1",
      [p.packet_id],
    );
    await denied("delete from public.tracking_events where packet_id=$1", [
      p.packet_id,
    ]);
    await denied("delete from public.tracking_packets where id=$1", [
      p.packet_id,
    ]);
    await denied("truncate public.tracking_events cascade");
  });
  it("a new forwarding clears current custody certainty without erasing the last receipt", async () => {
    const p = await register();
    const first = await record(p.packet_id, 1);
    await record(p.packet_id, 2, 3, undefined, {
      transfer: first.transfer_id,
      recipient: "Receiving employee",
      reference: "RC-003",
    });
    await record(p.packet_id, 3, 2, undefined, { destination: mayor });
    expect(
      (
        await rows(
          "select * from public.tracking_current_state where packet_id=$1",
          [p.packet_id],
        )
      )[0],
    ).toMatchObject({
      receipt_state: "pending",
      confirmed_custody_destination_id: null,
    });
    expect(
      await scalar(
        "select count(*)::int from public.tracking_events where packet_id=$1 and custody_confirmed",
        [p.packet_id],
      ),
    ).toBe(1);
  });
});

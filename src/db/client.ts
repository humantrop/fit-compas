import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL ?? "";

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy the Session pooler string from " +
      "Supabase -> Connect -> Session pooler (port 5432).",
  );
}

/**
 * Both URLs point at the session pooler on 5432. This is deliberate, and it
 * cost a production outage to learn.
 *
 * The app used to run against the transaction pooler on 6543, which is what
 * Supabase recommends for serverless. It stops answering once more than about
 * two queries queue behind one pooled connection: the queries are accepted and
 * never replied to, so `pg_stat_activity` shows the backend `active` and
 * waiting on ClientRead while the client waits forever. Nothing times out —
 * the DB-side statement_timeout does not fire, because from Postgres' side the
 * statement is not running. On Vercel the function then burns its full 300s
 * and returns FUNCTION_INVOCATION_TIMEOUT.
 *
 * Measured against this project, same host, same credentials, `max: 3`:
 *
 *   6543   3 requests / 6 queries    -> ok, 434ms
 *   6543  10 requests / 20 queries   -> 2 answered, 8 hung until the pool closed
 *   5432 150 requests / 300 queries  -> all answered, 1125ms
 *
 * It wedges easily because a single page is already several queries:
 * listExercises alone runs its rows and its count in a Promise.all.
 *
 * If you ever move back to 6543, know that this is what it looks like: the
 * whole app hanging, including login, because one warm Fluid instance holds a
 * pool of dead sockets and every later request queues behind them.
 */
const client = postgres(connectionString, {
  // Harmless on the session pooler, and the thing that keeps a future move
  // back to transaction pooling from failing a second, unrelated way:
  // prepared statements are per-connection state that pooling cannot hold.
  prepare: false,
  // Fluid Compute reuses instances across requests, so a small pool per
  // instance is right. Session pooling holds a real backend per connection,
  // so this also caps how many of the project's 60 we can occupy.
  max: 3,
  idle_timeout: 20,
  connect_timeout: 15,
});

export const db = drizzle(client, { schema, casing: "snake_case" });

export { schema };

import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL ?? "";

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy the Transaction pooler string from " +
      "Supabase -> Connect -> Transaction pooler.",
  );
}

/**
 * `prepare: false` is required, not optional.
 *
 * DATABASE_URL points at Supabase's transaction pooler on 6543, which hands a
 * different backend connection to each statement. Prepared statements are
 * per-connection state, so leaving this on produces sporadic
 * "prepared statement does not exist" errors under concurrency — the kind that
 * only show up once there is real traffic.
 */
const client = postgres(connectionString, {
  prepare: false,
  // Fluid Compute reuses instances across requests, so a small pool per
  // instance is right; a large one just burns pooler slots.
  max: 3,
  idle_timeout: 20,
  connect_timeout: 15,
});

export const db = drizzle(client, { schema, casing: "snake_case" });

export { schema };

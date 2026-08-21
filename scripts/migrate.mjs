import { readFileSync } from "node:fs";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Applies drizzle/*.sql against DIRECT_URL (session pooler, port 5432).
 *
 * DDL needs a real session. The transaction pooler on 6543 multiplexes
 * statements across backends, so a multi-statement migration can land on
 * different connections and half-apply.
 *
 * Loads .env.local by hand: `node --env-file` chokes on values containing
 * characters that appear in connection strings.
 */
function loadEnv(path) {
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Fine in CI, where the values come from the environment already.
  }
}

loadEnv(".env.local");

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  console.error("DIRECT_URL is not set.");
  process.exit(1);
}

if (url.includes(":6543")) {
  console.error(
    "Refusing to migrate through the transaction pooler (port 6543).\n" +
      "Use the Session pooler string (port 5432) as DIRECT_URL.",
  );
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

try {
  console.log("applying migrations from ./drizzle …");
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  console.log("migrations applied");
} catch (err) {
  console.error("migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 }).catch(() => {});
}

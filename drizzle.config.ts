import { defineConfig } from "drizzle-kit";

/**
 * Migrations run against DIRECT_URL (session pooler, port 5432). DDL needs a
 * real session, which the transaction pooler on 6543 cannot give you — it
 * multiplexes statements across connections and drops session state.
 */
export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  // auth.* and storage.* are owned by Supabase — never diff or drop them.
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});

import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { unitSystem, userRole } from "./enums";

/**
 * Mirrors the table created in supabase/migrations/0001. Declared here for
 * type-safe queries — the generated migration for it is a no-op because the
 * table already exists.
 *
 * The id is a plain uuid rather than a Drizzle reference: auth.users lives in
 * a schema Supabase owns, and pointing a Drizzle relation at it would make
 * drizzle-kit try to manage a table it must never touch. The real FK with
 * ON DELETE CASCADE is declared in the SQL migration.
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  role: userRole("role").notNull().default("client"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  locale: text("locale"),
  units: unitSystem("units").notNull().default("metric"),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type Profile = typeof profiles.$inferSelect;

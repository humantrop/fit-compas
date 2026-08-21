import "server-only";

import type { Profile } from "@/lib/auth/session";

/**
 * The single place that decides whether a signed-in user may see paid content.
 *
 * It exists before billing does on purpose. Every gated route calls this from
 * the day it is written, so turning payments on later means replacing the body
 * of one function instead of retrofitting checks into a dozen finished pages —
 * which is how gating ends up with holes.
 *
 * Roadmap feature 18 fills this in from the `subscriptions` table, populated by
 * the Polar webhook. It must stay abstract over the *source* of the
 * subscription: iOS cannot use Polar (App Store rule 3.1.1), so a RevenueCat
 * webhook will eventually write into the same table and this function must not
 * care which one did.
 */
export type Access = {
  active: boolean;
  tier: "none" | "self" | "coached";
  /** ISO date the current period ends, or null while billing is not wired up. */
  currentPeriodEnd: string | null;
  /** True while the paywall is intentionally open — development only. */
  bypassed: boolean;
};

const OPEN: Access = {
  active: true,
  tier: "coached",
  currentPeriodEnd: null,
  bypassed: true,
};

export async function getAccess(profile: Profile | null): Promise<Access> {
  if (!profile) {
    return { active: false, tier: "none", currentPeriodEnd: null, bypassed: false };
  }

  // The admin authors the content and always sees all of it. This stays true
  // after billing lands.
  if (profile.role === "admin") {
    return { active: true, tier: "coached", currentPeriodEnd: null, bypassed: false };
  }

  // Until feature 18, everyone signed in gets through. Replace this line — and
  // nothing else — when the subscriptions table is live.
  return OPEN;
}

/** Convenience for routes that only need a yes/no. */
export async function hasAccess(profile: Profile | null): Promise<boolean> {
  return (await getAccess(profile)).active;
}

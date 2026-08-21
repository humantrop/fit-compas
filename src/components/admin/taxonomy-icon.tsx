import { Dumbbell, Flame, HeartPulse, PersonStanding, Target } from "lucide-react";

import type { TaxonomyKey } from "@/db/schema/taxonomy";

/**
 * Kept out of `lib/taxonomy/config.ts` so that module stays free of value
 * imports and can be pulled into client components without dragging icons or
 * Drizzle along with it.
 */
const ICONS = {
  equipment: Dumbbell,
  muscle_groups: PersonStanding,
  goals: Target,
  activities: Flame,
  health_issues: HeartPulse,
} as const satisfies Record<TaxonomyKey, unknown>;

export function TaxonomyIcon({
  taxonomy,
  className,
}: {
  taxonomy: TaxonomyKey;
  className?: string;
}) {
  const Icon = ICONS[taxonomy];
  return <Icon className={className} aria-hidden />;
}

"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { savePreferencesAction } from "@/lib/account/actions";
import type { AccountCopy } from "@/lib/account/copy";
import { ACCOUNT_IDLE } from "@/lib/account/types";
import type { UnitSystem } from "@/lib/account/units";
import { localeNames, locales, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Units, language and email, on one card behind one button.
 *
 * Radio groups rather than a select or a switch, and the reason is the phone:
 * every option is on screen without opening anything, which is both faster to
 * change and — more to the point — the only way somebody discovers the app has
 * an imperial mode at all. A `<select>` hides two thirds of that behind a tap.
 *
 * Everything here is a plain form control with a `name`, so the card submits
 * and saves with JavaScript switched off. That is not a hypothetical: this is
 * the screen somebody opens on hotel wi-fi to change the language back.
 *
 * The email toggle renders disabled when the column is missing. The alternative
 * — hiding it — would leave the trainer wondering why clients keep getting mail
 * they turned off, when the truth is that migration 0016 was never run.
 */
export function PreferencesForm({
  lang,
  units,
  locale,
  emailNotifications,
  copy,
}: {
  lang: Locale;
  units: UnitSystem;
  locale: Locale;
  /** Null when migration 0016 has not been applied — see lib/account/queries. */
  emailNotifications: boolean | null;
  copy: AccountCopy;
}) {
  const [state, action, pending] = useActionState(
    savePreferencesAction,
    ACCOUNT_IDLE,
  );

  const text = copy.preferences;
  const emailAvailable = emailNotifications !== null;

  return (
    <Surface tone="strong" edge className="p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold text-ink-100">{text.title}</h2>
      <p className="mt-1 text-[13px] text-ink-400">{text.subtitle}</p>

      <form action={action} className="mt-5 flex flex-col gap-6">
        {/* The locale the reader is *currently* on, so the action knows whether
            the choice below is a change and the URL has to move with it. */}
        <input type="hidden" name="lang" value={lang} />

        <fieldset>
          <legend className="text-[13px] font-medium text-ink-300">
            {text.units.label}
          </legend>

          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <Choice
              name="units"
              value="metric"
              defaultChecked={units === "metric"}
              label={text.units.metric}
              note={text.units.metricNote}
            />
            <Choice
              name="units"
              value="imperial"
              defaultChecked={units === "imperial"}
              label={text.units.imperial}
              note={text.units.imperialNote}
            />
          </div>

          <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
            {text.units.hint}
          </p>
        </fieldset>

        <fieldset>
          <legend className="text-[13px] font-medium text-ink-300">
            {text.language.label}
          </legend>

          <div className="mt-2.5 grid grid-cols-3 gap-2.5">
            {locales.map((option) => (
              <Choice
                key={option}
                name="locale"
                value={option}
                defaultChecked={option === locale}
                label={localeNames[option]}
              />
            ))}
          </div>

          <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
            {text.language.hint}
          </p>
        </fieldset>

        <div>
          {emailAvailable ? (
            <input type="hidden" name="emailPrefEnabled" value="1" />
          ) : null}

          <label
            className={cn(
              "flex cursor-pointer items-start gap-3",
              emailAvailable || "cursor-default opacity-55",
            )}
          >
            <input
              type="checkbox"
              name="emailPref"
              value="on"
              defaultChecked={emailNotifications ?? false}
              disabled={!emailAvailable}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border",
                "border-white/16 bg-white/4 text-transparent transition-colors",
                "peer-checked:border-brand-500/60 peer-checked:bg-brand-500/25",
                "peer-checked:text-brand-100 peer-focus-visible:ring-4",
                "peer-focus-visible:ring-brand-500/15",
              )}
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>

            <span className="flex flex-col gap-1">
              <span className="text-[14px] font-medium text-ink-200">
                {text.email.label}
              </span>
              <span className="text-[12px] leading-relaxed text-ink-500">
                {emailAvailable ? text.email.hint : text.email.unavailable}
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? text.saving : text.save}
          </Button>

          {state.status === "saved" ? (
            <p className="text-[13px] text-success">{text.saved}</p>
          ) : null}

          {state.status === "error" && state.code ? (
            <p role="alert" className="text-[13px] text-danger">
              {copy.errors[state.code]}
            </p>
          ) : null}
        </div>
      </form>
    </Surface>
  );
}

/** One radio, drawn as a card. The input stays a real radio underneath. */
function Choice({
  name,
  value,
  defaultChecked,
  label,
  note,
}: {
  name: string;
  value: string;
  defaultChecked: boolean;
  label: string;
  note?: string;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span
        className={cn(
          "flex h-full min-h-13 flex-col justify-center gap-0.5 rounded-control border px-3.5 py-2.5",
          "border-white/10 bg-white/4 transition-colors",
          "hover:border-white/18 hover:bg-white/6",
          "peer-checked:border-brand-500/50 peer-checked:bg-brand-500/12",
          "peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/15",
        )}
      >
        <span className="text-[14px] font-semibold text-ink-100">{label}</span>
        {note ? (
          <span className="text-[11px] text-ink-500">{note}</span>
        ) : null}
      </span>
    </label>
  );
}

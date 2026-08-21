import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AppShell } from "@/components/app/app-shell";
import { PhotoCompare } from "@/components/progress/photo-compare";
import { PhotoGallery } from "@/components/progress/photo-gallery";
import { PhotoUploader } from "@/components/progress/photo-uploader";
import { ProgressNav } from "@/components/progress/progress-nav";
import { Surface } from "@/components/ui/surface";
import { getProfile, requireUser } from "@/lib/auth/session";
import { getAccess } from "@/lib/billing/access";
import { dayKeyOf } from "@/lib/clients/schedule";
import { getTimeZone } from "@/lib/dashboard/timezone-server";
import { isLocale, localeTags } from "@/lib/i18n/config";
import { getProgressCopy } from "@/lib/progress/copy";
import { isPhotoPose } from "@/lib/progress/photos";
import { loadPhotos } from "@/lib/progress/queries";
import type { PhotoView } from "@/lib/progress/types";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/progress/photos">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const copy = getProgressCopy(lang);
  return { title: copy.photos.title, description: copy.meta.description };
}

/**
 * Progress — photos (roadmap feature 14).
 *
 * Upload, compare, gallery, in that order: the reason somebody opens this
 * screen is either to add today's photo or to hold it against an old one, and
 * scrolling past a year of thumbnails to reach either is the wrong shape.
 *
 * The bucket is private and every URL on this page is signed for an hour — see
 * `lib/progress/queries.ts`. Migration 0001 built it that way long before there
 * was a screen for it, and the storage policies scope it to the owner's own
 * `{user_id}/…` prefix.
 *
 * Which two photos are being compared lives in the query string, so a
 * comparison is a link. Defaults are the oldest and the newest of the chosen
 * angle, which is the comparison somebody actually wants to see first.
 */
export default async function ProgressPhotosPage({
  params,
  searchParams,
}: PageProps<"/[lang]/progress/photos">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  await connection();

  const user = await requireUser(lang);
  const profile = await getProfile();
  const copy = getProgressCopy(lang);
  const localeTag = localeTags[lang];

  const access = await getAccess(profile);

  if (!access.active) {
    return (
      <AppShell lang={lang} isAdmin={profile?.role === "admin"}>
        <Surface tone="strong" edge className="p-7">
          <h1 className="text-xl font-semibold text-ink-50">{copy.access.title}</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
            {copy.access.body}
          </p>
        </Surface>
      </AppShell>
    );
  }

  const timeZone = await getTimeZone();
  const today = dayKeyOf(new Date(), timeZone);

  let photos: PhotoView[] = [];
  let available = true;

  try {
    photos = await loadPhotos(user.id);
  } catch (error) {
    console.error("[progress] photos unavailable:", error);
    available = false;
  }

  const query = await searchParams;
  const pose = isPhotoPose(query.p) ? query.p : "front";

  // `loadPhotos` returns newest first, so the earlier end of the comparison is
  // the last entry of the angle and the later end is the first.
  const inPose = photos.filter((photo) => photo.pose === pose);
  const byId = (id: unknown) =>
    typeof id === "string" ? (inPose.find((photo) => photo.id === id) ?? null) : null;

  const from = byId(query.a) ?? inPose[inPose.length - 1] ?? null;
  const to = byId(query.b) ?? inPose[0] ?? null;

  return (
    <AppShell lang={lang} isAdmin={profile?.role === "admin"}>
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-ink-50 sm:text-4xl">
          {copy.photos.title}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-400">{copy.photos.subtitle}</p>
      </header>

      <div className="mt-6 flex flex-col gap-3.5">
        <ProgressNav lang={lang} current="photos" copy={copy} />

        {available ? null : (
          <Surface className="flex items-start gap-3 border-warn/25 bg-warn/8 p-5">
            <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-warn" />
            <p className="text-[13px] leading-relaxed text-ink-200">
              {copy.unavailable}
            </p>
          </Surface>
        )}

        <PhotoUploader today={today} copy={copy} />

        <PhotoCompare
          basePath={`/${lang}/progress/photos`}
          photos={photos}
          pose={pose}
          from={from}
          to={to}
          localeTag={localeTag}
          copy={copy}
        />

        <PhotoGallery photos={photos} localeTag={localeTag} copy={copy} />
      </div>
    </AppShell>
  );
}

import { notFound } from "next/navigation";

import { ExerciseForm } from "@/components/admin/exercises/exercise-form";
import type { UploaderAsset } from "@/components/admin/exercises/video-uploader";
import { requireAdmin } from "@/lib/auth/session";
import { getExercise, listTagOptions, summariseVideo } from "@/lib/exercises/queries";
import { isLocale } from "@/lib/i18n/config";
import { getExercisesDictionary } from "@/lib/i18n/exercises-dictionary";

export default async function EditExercisePage({
  params,
}: PageProps<"/[lang]/admin/exercises/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  await requireAdmin(lang);

  const [copy, exercise, options] = await Promise.all([
    getExercisesDictionary(lang),
    getExercise(id),
    listTagOptions(),
  ]);

  if (!exercise) notFound();

  // The uploader gets a flat shape rather than the video_assets row: it has no
  // business knowing about buckets, providers or storage paths.
  let video: UploaderAsset | null = null;
  if (exercise.videoAsset) {
    const summary = summariseVideo(exercise.videoAsset);
    video = {
      id: summary.id,
      status: summary.status,
      thumbnailUrl: summary.thumbnailUrl,
      durationSec: summary.durationSec,
      sizeBytes: exercise.videoAsset.sizeBytes,
      width: exercise.videoAsset.width,
      height: exercise.videoAsset.height,
    };
  }

  return (
    <ExerciseForm
      lang={lang}
      exercise={{
        id: exercise.id,
        slug: exercise.slug,
        title: exercise.title,
        description: exercise.description,
        cues: exercise.cues,
        difficulty: exercise.difficulty,
        defaultMode: exercise.defaultMode,
        isUnilateral: exercise.isUnilateral,
        isPublished: exercise.isPublished,
        tags: exercise.tags,
      }}
      video={video}
      options={options}
      copy={copy}
    />
  );
}

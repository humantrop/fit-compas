"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import { deletePhotoAction } from "@/lib/progress/actions";
import type { ProgressCopy } from "@/lib/progress/copy";
import { PROGRESS_IDLE } from "@/lib/progress/types";

/**
 * Delete one photo, and the object behind it.
 *
 * A client island per card, so the gallery itself stays on the server. Unlike a
 * measurement, this one is not typed back in ten seconds — but a confirmation
 * step here would be a modal on top of a photo, and the honest guard is that
 * the button is small, unlabelled and in the corner rather than under the
 * reader's thumb.
 */
export function PhotoRemove({
  photoId,
  copy,
}: {
  photoId: string;
  copy: ProgressCopy;
}) {
  const [state, action, pending] = useActionState(deletePhotoAction, PROGRESS_IDLE);

  return (
    <form action={action}>
      <input type="hidden" name="photoId" value={photoId} />

      <button
        type="submit"
        disabled={pending}
        aria-label={copy.photos.remove}
        title={
          state.status === "error" && state.code
            ? copy.errors[state.code]
            : copy.photos.remove
        }
        className="grid size-8 place-items-center rounded-full bg-void/65 text-ink-200 backdrop-blur-sm transition-colors hover:text-rose-300 disabled:opacity-45"
      >
        <Trash2 className="size-4" />
      </button>
    </form>
  );
}

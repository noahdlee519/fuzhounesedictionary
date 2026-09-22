"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AVATAR_BUCKET,
  AVATAR_EXT,
  AVATAR_MIME_TYPES,
  MAX_AVATAR_BYTES,
} from "@/lib/constants";

const MAX_MB = Math.round(MAX_AVATAR_BYTES / (1024 * 1024));

/* "Edit" under the profile picture opens it large in a dialog, with a
   button to pick a new picture and a trash can to remove it. Picking uploads
   to the avatars bucket and points the profile at it.

   The default picture is the one on the person's Google account (Noah,
   22 Sep 2026): a new account starts with it (supabase/avatars.sql), and
   removing an uploaded picture goes back to it rather than to initials.
   Removing the Google picture itself leaves initials, and "Use my Google
   picture" brings it back. Runs as the
   signed-in user, so RLS (own-folder upload, own-row update) applies. The
   dialog stays open, showing the new picture once the page refreshes. */
export default function AvatarUpload({
  userId,
  avatarUrl,
  name,
}: {
  userId: string;
  avatarUrl: string | null;
  name: string | null;
}) {
  const hasAvatar = !!avatarUrl;
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The picture on their Google account, from the sign-in itself.
  const [googleUrl, setGoogleUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const m = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
      const url = typeof m.avatar_url === "string" ? m.avatar_url : typeof m.picture === "string" ? m.picture : null;
      setGoogleUrl(url && /^https:\/\//.test(url) ? url : null);
    }).catch(() => setGoogleUrl(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // An uploaded picture falls back to the Google one; the Google one to initials.
  const fallback = googleUrl && avatarUrl !== googleUrl ? googleUrl : null;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after an error
    if (!file) return;

    setError(null);
    if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("Please choose a PNG, JPG, WebP or GIF.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`That picture is ${mb} MB. The limit is ${MAX_MB} MB \u2014 please pick a smaller one.`);
      return;
    }

    setBusy(true);
    try {
      // The extension comes from the type we just checked, never from the file
      // name: a name is whatever the uploader chose to call it.
      const ext = AVATAR_EXT[file.type] ?? "png";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

      const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: pub.publicUrl })
        .eq("id", userId);
      if (updErr) throw new Error(updErr.message);

      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Could not upload that picture.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(to: string | null = fallback) {
    setBusy(true);
    setError(null);
    try {
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: to })
        .eq("id", userId);
      if (updErr) throw new Error(updErr.message);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Could not remove the picture.");
    } finally {
      setBusy(false);
    }
  }

  const trash = (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
    </svg>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          dialog.current?.showModal();
        }}
        className="text-xs font-medium text-inkFaint transition-colors hover:text-lacquer"
      >
        Edit
      </button>
      <dialog
        ref={dialog}
        aria-label="Profile picture"
        // A click on the backdrop (the dialog element itself, outside its
        // panel) closes it, as Escape does.
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
        className="m-auto w-[min(92vw,360px)] rounded-sm border border-ruleStrong bg-paper p-0 text-ink shadow-[0_16px_48px_rgb(0_0_0/.25)] backdrop:bg-black/50"
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <p className="meta text-inkFaint">Profile picture</p>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className="-mr-2 grid h-8 w-8 place-items-center rounded-sm text-inkFaint transition-colors hover:text-ink"
            >
              <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
              </svg>
            </button>
          </div>
          <div className="mt-4 flex justify-center">
            <Avatar src={avatarUrl} name={name} size={200} className="ring-1 ring-rule" />
          </div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <label className={`btn btn-ghost btn-sm cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
              {busy ? "Saving…" : hasAvatar ? "Change picture" : "Upload a picture"}
              <input type="file" accept={AVATAR_MIME_TYPES.join(",")} onChange={onFile} disabled={busy} className="hidden" />
            </label>
            {hasAvatar && (
              <button
                type="button"
                onClick={() => remove()}
                disabled={busy}
                aria-label={fallback ? "Remove picture (back to your Google picture)" : "Remove picture"}
                title={fallback ? "Remove picture (back to your Google picture)" : "Remove picture"}
                className="grid h-9 w-9 place-items-center rounded-sm border border-ruleStrong text-inkSoft transition-colors hover:border-lacquer hover:text-lacquer disabled:opacity-50"
              >
                {trash}
              </button>
            )}
          </div>
          {!hasAvatar && googleUrl && (
            <p className="mt-3 text-center">
              <button
                type="button"
                onClick={() => remove(googleUrl)}
                disabled={busy}
                className="text-sm text-inkSoft underline decoration-rule underline-offset-4 transition-colors hover:text-lacquer disabled:opacity-50"
              >
                Use my Google picture
              </button>
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-center text-sm text-lacquer">
              {error}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AVATAR_BUCKET,
  AVATAR_EXT,
  AVATAR_MIME_TYPES,
  MAX_AVATAR_BYTES,
} from "@/lib/constants";

const MAX_MB = Math.round(MAX_AVATAR_BYTES / (1024 * 1024));

/* Pick an image, upload it to the avatars bucket, and point the profile at it.
   Runs as the signed-in user, so RLS (own-folder upload, own-row update) applies.
   "Remove" just clears avatar_url, which drops the profile back to the default. */
export default function AvatarUpload({
  userId,
  hasAvatar,
}: {
  userId: string;
  hasAvatar: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);
      if (updErr) throw new Error(updErr.message);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Could not remove the picture.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="cursor-pointer border border-rule bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-[0.1em] text-inkSoft transition-colors hover:border-lacquer hover:text-lacquer">
        {busy ? "Uploading…" : hasAvatar ? "Change profile picture" : "Upload a profile picture"}
        <input type="file" accept={AVATAR_MIME_TYPES.join(",")} onChange={onFile} disabled={busy} className="hidden" />
      </label>
      {hasAvatar && (
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint transition-colors hover:text-lacquer disabled:opacity-50"
        >
          Remove
        </button>
      )}
      {error && <span className="text-sm text-lacquer">{error}</span>}
    </div>
  );
}

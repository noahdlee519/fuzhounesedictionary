"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AUDIO_BUCKET, MAX_AUDIO_BYTES, MAX_RECORDING_NOTE } from "@/lib/constants";

/* ---------------------------------------------------------------------------
   Record straight in the browser and save to the recordings table.

   Toggle rather than press-and-hold: press-and-hold cannot be operated from a
   keyboard, and a recording button that only works with a mouse is no use to
   half the people who might contribute.
   --------------------------------------------------------------------------- */

type Kind = "headword" | "example";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((m) => {
    try {
      return MediaRecorder.isTypeSupported(m);
    } catch {
      return false;
    }
  });
}

/* MediaRecorder hands back a full type like "audio/webm;codecs=opus", but the
   storage bucket's allowed_mime_types list holds bare types. Sending the
   parameterised string gets the upload rejected, so strip it. */
function baseMime(mime: string) {
  return mime.split(";")[0].trim();
}

function extFor(mime: string) {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

const btn =
  "border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.1em] transition-colors disabled:opacity-50";

export default function Recorder({
  userId,
  entryId,
  kind = "headword",
  senseId,
  label,
  onSaved,
}: {
  userId: string;
  entryId: string;
  kind?: Kind;
  senseId?: string;
  label?: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [supported, setSupported] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  // A line to go with the take: the sentence being read, or how the speaker
  // would put it. Optional; shown beside the player once approved.
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        !!pickMime()
    );
  }, []);

  const cleanup = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  // The preview URL is revoked on discard and save; this covers leaving the
  // page with a take still waiting.
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  async function start() {
    setError(null);
    const mime = pickMime();
    if (!mime) {
      setError("This browser cannot record audio. Try Chrome, Safari or Firefox.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream, { mimeType: mime });
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mime });
        setBlob(b);
        setUrl(URL.createObjectURL(b));
        cleanup();
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      setSeconds(0);
      tickRef.current = setInterval(() => setSeconds((s) => s + 0.1), 100);
    } catch (e: any) {
      cleanup();
      setError(
        e?.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in your browser settings and try again."
          : "Could not start recording."
      );
    }
  }

  function stop() {
    recRef.current?.state === "recording" && recRef.current.stop();
    setRecording(false);
  }

  function discard() {
    if (url) URL.revokeObjectURL(url);
    setBlob(null);
    setUrl(null);
    setSeconds(0);
    setNote("");
    setError(null);
  }

  async function save() {
    if (!blob) return;
    setSaving(true);
    setError(null);
    try {
      if (blob.size > MAX_AUDIO_BYTES) {
        throw new Error("That recording is too long. Keep it under 5 MB.");
      }
      const mime = baseMime(blob.type || "audio/webm");
      const path = `${userId}/${entryId}-${kind}-${Date.now()}.${extFor(mime)}`;

      const { error: upErr } = await supabase.storage
        .from(AUDIO_BUCKET)
        .upload(path, blob, { contentType: mime, upsert: false });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

      const { data: pub } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path);

      const { error: insErr } = await supabase.from("recordings").insert({
        entry_id: entryId,
        kind,
        sense_id: kind === "example" ? senseId ?? null : null,
        audio_url: pub.publicUrl,
        seconds: Math.round(seconds * 100) / 100,
        note: note.trim().slice(0, MAX_RECORDING_NOTE) || null,
        contributor_id: userId,
      });
      // The database raises the rate-limit messages; they are written to be read.
      if (insErr) throw new Error(insErr.message);

      setDone(true);
      discard();
      onSaved?.();
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Could not save that recording.");
    } finally {
      setSaving(false);
    }
  }

  if (supported === false) {
    return (
      <p className="text-sm text-inkFaint">
        This browser cannot record audio. You can still attach a file on the{" "}
        <a href="/submit" className="text-lacquer hover:underline">
          add a word
        </a>{" "}
        form.
      </p>
    );
  }

  if (done) {
    return (
      <p className="flex flex-wrap items-center gap-3 text-sm text-inkSoft">
        <span>Saved. It will appear once an editor has listened to it.</span>
        <button onClick={() => setDone(false)} className={`${btn} border-rule text-inkSoft hover:border-lacquer hover:text-lacquer`}>
          Record another
        </button>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-inkFaint">{label}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!blob && !recording && (
          <button onClick={start} className={`${btn} border-lacquer bg-lacquer text-paper hover:bg-transparent hover:text-lacquer`}>
            ● Record
          </button>
        )}

        {recording && (
          <>
            <button onClick={stop} className={`${btn} border-lacquer text-lacquer`}>
              ■ Stop
            </button>
            <span aria-live="polite" className="font-mono text-xs tabular-nums text-lacquer">
              {seconds.toFixed(1)}s
            </span>
          </>
        )}

        {blob && url && !recording && (
          <>
            <audio controls src={url} className="h-9 max-w-[16rem]" />
            <button
              onClick={save}
              disabled={saving}
              className={`${btn} border-lacquer bg-lacquer text-paper hover:bg-transparent hover:text-lacquer`}
            >
              {saving ? "Saving…" : "Use this"}
            </button>
            <button
              onClick={discard}
              disabled={saving}
              className={`${btn} border-rule text-inkSoft hover:border-lacquer hover:text-lacquer`}
            >
              Discard
            </button>
          </>
        )}
      </div>

      {blob && url && !recording && (
        <label className="block max-w-md">
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-inkFaint">
            Note (optional)
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={MAX_RECORDING_NOTE}
            disabled={saving}
            placeholder={
              kind === "example"
                ? "e.g. how you would actually say it, if it differs"
                : "e.g. a sentence you said it in, or how it is used"
            }
            className="mt-1 w-full border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-lacquer placeholder:text-inkFaint"
          />
        </label>
      )}

      {error && <p className="text-sm text-lacquer">{error}</p>}
    </div>
  );
}

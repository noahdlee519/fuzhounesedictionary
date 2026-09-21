"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MAX_RECORDING_NOTE } from "@/lib/constants";
import { saveRecording } from "@/lib/audio-upload";
import { heldTake, holdTake, releaseTake } from "@/lib/held-take";
import { startGoogleSignIn } from "@/lib/supabase/sign-in";
import { useRecorder } from "./useRecorder";
import TakeControls, { recBtn } from "./TakeControls";
import SpeakerFields from "./SpeakerFields";
import type { Speaker } from "@/lib/audio-upload";

/* ---------------------------------------------------------------------------
   Record a word that already exists and save it straight away: the entry
   page and the Improve list. Capture is in useRecorder, the buttons in
   TakeControls; this file is the saving and the note.

   RECORDING BEFORE SIGNING IN

   Anyone may press record; only saving needs an account. The order matters.
   Every step between arriving and hearing your own voice loses people, and
   "sign in with Google" was the first step. Now it is the last: a visitor
   records, listens back, chooses the take — and only then, on "Use this",
   is asked to sign in. The take is held in the browser (src/lib/held-take)
   across the trip to Google, and when the page comes back with a user it
   saves the held take by itself and says so. The person does the hard part
   with nothing asked of them, and the sign-in is what finishes it rather
   than what starts it.
   --------------------------------------------------------------------------- */

type Kind = "headword" | "example";

export default function Recorder({
  userId,
  entryId,
  kind = "headword",
  senseId,
  label,
  onSaved,
  isEditor = false,
}: {
  /** Absent when the visitor is signed out: they can still record, and are
      sent to sign in when they choose a take. */
  userId?: string | null;
  entryId: string;
  kind?: Kind;
  senseId?: string;
  label?: string;
  onSaved?: () => void;
  /** An editor is the one who reviews the queue, so they are not told about it. */
  isEditor?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const rec = useRecorder();

  // A line to go with the take: the sentence being read, or how the speaker
  // would put it. Optional; shown beside the play button once approved.
  const [note, setNote] = useState("");
  // Who is speaking: null is the account holder; otherwise someone they are
  // recording (SpeakerFields). Kept across takes, so a run of words with the
  // same grandmother is set once.
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // After a save: the row's id, so the note can still be added or changed
  // without leaving the page. Its own draft and status, separate from `note`,
  // which belongs to the take still on screen.
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState("");
  const [noteState, setNoteState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // "held": a take from before sign-in is being saved on return; "sending":
  // the visitor chose a take and is on the way to Google.
  const [resuming, setResuming] = useState<"held" | "sending" | null>(null);
  // Bumped by "Try again" after a failed save on return.
  const [attempt, setAttempt] = useState(0);
  const [heldFailed, setHeldFailed] = useState(false);

  /* On return from sign-in, the held take for this word is saved without
     another click. Only with a user, and only for the kind this recorder is
     for — the example-sentence recorders on the same page share the entry
     id. `cancelled` is checked before the upload, so React's development
     double-run of effects cannot save the take twice: the first run is
     cancelled while it is still reading the store. */
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const held = await heldTake(entryId);
      if (cancelled || !held || held.kind !== kind || (held.senseId ?? null) !== (senseId ?? null)) return;
      setResuming("held");
      setHeldFailed(false);
      setError(null);
      try {
        const saved = await saveRecording(supabase, {
          userId,
          entryId,
          kind,
          senseId,
          blob: held.blob,
          seconds: held.seconds,
          note: held.note,
          speaker: held.speaker ?? null,
        });
        await releaseTake(entryId);
        if (cancelled) return;
        setSavedId(saved.id);
        setSavedNote(saved.note);
        setNoteState("idle");
        setDone(true);
        onSaved?.();
        router.refresh();
      } catch (e: any) {
        // The take is still held, so "Try saving it again" can have another go
        // once whatever went wrong — a cap, the network — is past.
        if (!cancelled) {
          setError(e?.message ?? "Could not save the recording you made before signing in.");
          setHeldFailed(true);
        }
      } finally {
        if (!cancelled) setResuming(null);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, entryId, kind, senseId, attempt]);

  async function save() {
    if (!rec.take) return;
    if (speaker && !speaker.name.trim()) {
      setError("Add the speaker's name, or choose “Me”.");
      return;
    }
    setSaving(true);
    setError(null);

    if (!userId) {
      // Hold the take, then go and sign in; the effect above saves it on the
      // way back. If the browser will not hold it, say so rather than lose
      // a recording someone just made.
      const held = await holdTake({
        entryId, kind, senseId: senseId ?? null,
        blob: rec.take.blob, seconds: rec.take.seconds, note, speaker, heldAt: Date.now(),
      });
      if (!held) {
        setError("This browser cannot keep the recording while you sign in. Sign in first, then record it again.");
        setSaving(false);
        return;
      }
      setResuming("sending");
      const err = await startGoogleSignIn(`${window.location.pathname}${window.location.search}`);
      if (err) {
        setError(err);
        setResuming(null);
        setSaving(false);
      }
      return;
    }

    try {
      const saved = await saveRecording(supabase, {
        userId,
        entryId,
        kind,
        senseId,
        blob: rec.take.blob,
        seconds: rec.take.seconds,
        note,
        speaker,
      });
      setSavedId(saved.id);
      setSavedNote(saved.note);
      setNoteState("idle");
      setDone(true);
      rec.discard();
      setNote("");
      onSaved?.();
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Could not save that recording.");
    } finally {
      setSaving(false);
    }
  }

  /* Write the note onto the saved row. RLS lets a person update their own
     recording, and a trigger makes sure the note is the only column that
     changes (supabase/recording_note.sql). */
  async function saveNote() {
    if (!savedId) return;
    setNoteState("saving");
    const { error: updErr } = await supabase
      .from("recordings")
      .update({ note: savedNote.trim().slice(0, MAX_RECORDING_NOTE) || null })
      .eq("id", savedId);
    if (updErr) {
      setNoteState("error");
      return;
    }
    setNoteState("saved");
    router.refresh();
  }

  if (rec.supported === false) {
    return (
      <p className="text-sm text-inkFaint">
        This browser cannot record audio. Try Chrome, Safari or Firefox on a phone or laptop with
        a microphone.
      </p>
    );
  }

  if (done) {
    return (
      <div className="space-y-2 text-sm text-inkSoft">
        <p className="flex flex-wrap items-center gap-3">
          <span>{isEditor ? "Saved." : "Saved. It will appear once an editor has listened to it."}</span>
          <button
            type="button"
            onClick={() => setDone(false)}
            className={`${recBtn} border-rule text-inkSoft hover:border-lacquer hover:text-lacquer`}
          >
            Record another
          </button>
        </p>
        {savedId && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveNote();
            }}
            className="flex max-w-md flex-wrap items-end gap-2"
          >
            <label className="block grow">
              <span className="meta text-inkFaint">
                {savedNote ? "Your note" : "Add a note"}
              </span>
              <input
                value={savedNote}
                onChange={(e) => {
                  setSavedNote(e.target.value);
                  setNoteState("idle");
                }}
                maxLength={MAX_RECORDING_NOTE}
                disabled={noteState === "saving"}
                placeholder="e.g. a sentence you said it in, or how it is used"
                className="mt-1 w-full border border-rule bg-paper px-3 py-1.5 text-sm text-ink outline-none focus:border-lacquer placeholder:text-inkFaint"
              />
            </label>
            <button
              type="submit"
              disabled={noteState === "saving"}
              className={`${recBtn} border-rule text-inkSoft hover:border-lacquer hover:text-lacquer`}
            >
              {noteState === "saving" ? "Saving…" : "Save note"}
            </button>
            {noteState === "saved" && <span className="basis-full text-xs text-lacquer">Note saved.</span>}
            {noteState === "error" && (
              <span className="basis-full text-xs text-lacquer">The note could not be saved. Please try again.</span>
            )}
          </form>
        )}
      </div>
    );
  }

  if (resuming === "held") {
    return (
      <p className="text-sm text-inkSoft" role="status">
        Saving the recording you made before signing in…
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <p className="meta text-inkFaint">{label}</p>
      )}
      {!userId && !rec.take && !rec.recording && (
        <p className="text-sm text-inkSoft">
          You can record first and sign in after — the recording waits for you.
        </p>
      )}
      {heldFailed && !rec.take && (
        <p className="flex flex-wrap items-center gap-3 text-sm text-inkSoft">
          <span>Your recording from before signing in is still here.</span>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className={`${recBtn} border-lacquer text-lacquer hover:bg-lacquer hover:text-paper`}
          >
            Try saving it again
          </button>
        </p>
      )}

      <TakeControls
        recording={rec.recording}
        take={rec.take}
        seconds={rec.seconds}
        error={error ?? rec.error}
        onStart={rec.start}
        onStop={rec.stop}
        onDiscard={() => {
          rec.discard();
          setError(null);
        }}
        disabled={saving}
        playLabel="your recording"
        keep={
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={`${recBtn} border-lacquer bg-lacquer text-paper hover:bg-transparent hover:text-lacquer`}
          >
            {saving
              ? resuming === "sending" ? "Opening Google…" : "Saving…"
              : userId ? "Use this" : "Use this — sign in to save it"}
          </button>
        }
      />

      {rec.take && !rec.recording && (
        <SpeakerFields
          value={speaker}
          onChange={(s) => {
            setSpeaker(s);
            setError(null);
          }}
          disabled={saving}
          idBase={`spk-${entryId}-${kind}${senseId ? `-${senseId}` : ""}`}
        />
      )}

      {rec.take && !rec.recording && (
        <label className="block max-w-md">
          <span className="meta text-inkFaint">
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
    </div>
  );
}

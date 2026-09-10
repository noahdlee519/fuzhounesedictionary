"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MAX_RECORDING_NOTE } from "@/lib/constants";
import { saveRecording } from "@/lib/audio-upload";
import { useRecorder } from "./useRecorder";
import TakeControls, { recBtn } from "./TakeControls";

/* ---------------------------------------------------------------------------
   Record a word that already exists and save it straight away: the entry
   page and the Improve list. Capture is in useRecorder, the buttons in
   TakeControls; this file is the saving and the note.
   --------------------------------------------------------------------------- */

type Kind = "headword" | "example";

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
  const rec = useRecorder();

  // A line to go with the take: the sentence being read, or how the speaker
  // would put it. Optional; shown beside the play button once approved.
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // After a save: the row's id, so the note can still be added or changed
  // without leaving the page. Its own draft and status, separate from `note`,
  // which belongs to the take still on screen.
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState("");
  const [noteState, setNoteState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    if (!rec.take) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveRecording(supabase, {
        userId,
        entryId,
        kind,
        senseId,
        blob: rec.take.blob,
        seconds: rec.take.seconds,
        note,
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
          <span>Saved. It will appear once an editor has listened to it.</span>
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
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-inkFaint">
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

  return (
    <div className="space-y-2">
      {label && (
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-inkFaint">{label}</p>
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
            {saving ? "Saving…" : "Use this"}
          </button>
        }
      />

      {rec.take && !rec.recording && (
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
    </div>
  );
}

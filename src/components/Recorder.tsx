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
import { withdrawRecording, publishOwnRecording } from "@/app/account/actions";
import type { Speaker } from "@/lib/audio-upload";
import { useL } from "./LangProvider";

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

/* Fired on window after every successful save, so something outside the
   recorder can react: the Record-a-word page's thank-you banner (QuickRecord)
   listens for it. detail: { kind, entryId }. */
export const RECORDING_SAVED = "fz:recording-saved";
function announceSaved(kind: Kind, entryId: string) {
  try {
    window.dispatchEvent(new CustomEvent(RECORDING_SAVED, { detail: { kind, entryId } }));
  } catch {
    /* nothing listening, or no CustomEvent: nothing lost */
  }
}

export default function Recorder({
  userId,
  entryId,
  kind = "headword",
  senseId,
  label,
  onSaved,
  isEditor = false,
  phraseSenseId,
  phrase = false,
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
  /** For a recording of the word itself: once it is saved, ask for the word
      again in a sentence or phrase of the speaker's own, saved as an example
      on this meaning (usually the first). No follow-up when absent. */
  phraseSenseId?: string;
  /** This recorder is that follow-up: its note asks for the words said. */
  phrase?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const rec = useRecorder();
  const L = useL();

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
  // During the trust window (lib/trust) a saved take goes live at once;
  // this says whether the last one did, for the line after saving.
  const [live, setLive] = useState(false);
  /* Straight after a save: ask for it to go live. The server decides (the
     window, and that the take is the caller's own and still pending); an
     editor's take is live already. */
  const goLive = async (id: string) => {
    if (isEditor) return;
    try {
      const fd = new FormData();
      fd.set("id", id);
      const { live: now } = await publishOwnRecording(fd);
      setLive(now);
    } catch {
      setLive(false);
    }
  };
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
        await goLive(saved.id);
        setSavedNote(saved.note);
        setNoteState("idle");
        setDone(true);
        onSaved?.();
        announceSaved(kind, entryId);
        router.refresh();
      } catch (e: any) {
        // The take is still held, so "Try saving it again" can have another go
        // once whatever went wrong — a cap, the network — is past.
        if (!cancelled) {
          setError(e?.message ?? L("Could not save the recording you made before signing in.", "無法儲存你登入前錄的錄音。"));
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
      setError(L("Add the speaker's name, or choose “Me”.", "請填上講者的名字，或選「我」。"));
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
        setError(L("This browser cannot keep the recording while you sign in. Sign in first, then record it again.", "這個瀏覽器無法在你登入時保留錄音。請先登入，再重錄一次。"));
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
      await goLive(saved.id);
      setSavedNote(saved.note);
      setNoteState("idle");
      setDone(true);
      rec.discard();
      setNote("");
      onSaved?.();
      announceSaved(kind, entryId);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? L("Could not save that recording.", "無法儲存這段錄音。"));
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
    const { data: rows, error: updErr } = await supabase
      .from("recordings")
      .update({ note: savedNote.trim().slice(0, MAX_RECORDING_NOTE) || null })
      .eq("id", savedId)
      .select("id");
    // No row back: nothing changed, so it is not "saved".
    if (updErr || !rows?.length) {
      setNoteState("error");
      return;
    }
    setNoteState("saved");
    router.refresh();
  }

  if (rec.supported === false) {
    return (
      <p className="text-sm text-inkFaint">
        {L(
          "This browser cannot record audio. Try Chrome, Safari or Firefox on a phone or laptop with a microphone.",
          "這個瀏覽器無法錄音。請在有麥克風的手機或電腦上改用 Chrome、Safari 或 Firefox。"
        )}
      </p>
    );
  }

  if (done) {
    return (
      <div className="space-y-2 text-sm text-inkSoft">
        <p className="flex flex-wrap items-center gap-3">
          <span>
            {isEditor
              ? L("Saved.", "已儲存。")
              : live
                ? L("Saved, and live on the word's page now. An editor will listen to it afterwards.", "已儲存，現在已在詞條頁上線。編輯之後會再聽一次。")
                : L("Saved. It will appear once an editor has listened to it.", "已儲存。編輯聽過後就會刊出。")}
          </span>
          <button
            type="button"
            onClick={() => setDone(false)}
            className={`${recBtn} border-rule text-inkSoft hover:border-lacquer hover:text-lacquer`}
          >
            {L("Record another", "再錄一段")}
          </button>
          {/* Changed your mind? A take still waiting for review can be taken
              back from here (and later from your account page). An editor's
              is published at once, so this is not offered to them. */}
          {savedId && !isEditor && (
            <button
              type="button"
              onClick={async () => {
                const fd = new FormData();
                fd.set("id", savedId);
                const { ok } = await withdrawRecording(fd);
                if (ok) {
                  setSavedId(null);
                  setDone(false);
                  setError(null);
                  router.refresh();
                } else {
                  setError(L("That recording could not be removed. You can remove it from your account page.", "無法移除這段錄音，可以到你的帳號頁移除。"));
                }
              }}
              className="text-sm text-inkFaint underline decoration-rule underline-offset-4 transition-colors hover:text-lacquer"
            >
              {L("Remove it", "移除這段")}
            </button>
          )}
        </p>
        {error && <p className="text-sm text-lacquer">{error}</p>}
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
                {savedNote ? L("Your note", "你的附註") : L("Add a note", "加上附註")}
              </span>
              <input
                value={savedNote}
                onChange={(e) => {
                  setSavedNote(e.target.value);
                  setNoteState("idle");
                }}
                maxLength={MAX_RECORDING_NOTE}
                disabled={noteState === "saving"}
                placeholder={L("e.g. a sentence you said it in, or how it is used", "例如：你用這個詞講的一句話，或它怎麼用")}
                className="rounded-sm mt-1 w-full border border-rule bg-paper px-3 py-1.5 text-sm text-ink outline-none focus:border-lacquer placeholder:text-inkFaint"
              />
            </label>
            <button
              type="submit"
              disabled={noteState === "saving"}
              className={`${recBtn} border-rule text-inkSoft hover:border-lacquer hover:text-lacquer`}
            >
              {noteState === "saving" ? L("Saving…", "儲存中…") : L("Save note", "儲存附註")}
            </button>
            {noteState === "saved" && <span className="basis-full text-xs text-lacquer">{L("Note saved.", "附註已儲存。")}</span>}
            {noteState === "error" && (
              <span className="basis-full text-xs text-lacquer">{L("The note could not be saved. Please try again.", "附註無法儲存，請再試一次。")}</span>
            )}
          </form>
        )}
        {/* The word is in; now the word in use. A sentence or phrase of the
            speaker's own choosing, as an example on the word's first meaning,
            with a box for what they said. Its own recorder, keyed to this
            take, so it starts fresh after every word. */}
        {kind === "headword" && phraseSenseId && (
          <div className="mt-5 space-y-2 border-l-2 border-lacquer pl-4">
            <p className="text-[15px] font-semibold text-ink">
              {L("Now say it in a sentence or phrase of your own.", "再用這個詞講一句你自己的話。")}
            </p>
            <p className="text-sm text-inkSoft">
              {L(
                "Anything you would naturally say with it. It helps people hear how the word is really used.",
                "講什麼都可以，平常怎麼用就怎麼講。這樣大家可以聽到這個詞實際怎麼用。"
              )}
            </p>
            <Recorder
              key={savedId ?? "phrase"}
              userId={userId}
              entryId={entryId}
              kind="example"
              senseId={phraseSenseId}
              isEditor={isEditor}
              phrase
            />
          </div>
        )}
      </div>
    );
  }

  if (resuming === "held") {
    return (
      <p className="text-sm text-inkSoft" role="status">
        {L("Saving the recording you made before signing in…", "正在儲存你登入前錄的錄音…")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <p className="meta text-inkFaint">{label}</p>
      )}
      {heldFailed && !rec.take && (
        <p className="flex flex-wrap items-center gap-3 text-sm text-inkSoft">
          <span>{L("Your recording from before signing in is still here.", "你登入前錄的錄音還在。")}</span>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className={`${recBtn} border-lacquer text-lacquer hover:bg-lacquer hover:text-paper`}
          >
            {L("Try saving it again", "再試著儲存一次")}
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
        playLabel={L("your recording", "你的錄音")}
        keep={
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={`${recBtn} border-lacquer bg-lacquer text-paper hover:bg-transparent hover:text-lacquer`}
          >
            {saving
              ? resuming === "sending" ? L("Opening Google…", "正在開啟 Google…") : L("Saving…", "儲存中…")
              : userId ? L("Use this", "用這段") : L("Use this (sign in required)", "用這段（需要登入）")}
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
            {phrase ? L("What you said (optional)", "你講的話（選填）") : L("Note (optional)", "附註（選填）")}
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={MAX_RECORDING_NOTE}
            disabled={saving}
            placeholder={
              phrase
                ? L("e.g. 食飯未？ Have you eaten?", "例如：食飯未？（吃飯了嗎？）")
                : kind === "example"
                ? L("e.g. how you would actually say it, if it differs", "例如：如果你平常的講法不一樣，實際怎麼講")
                : L("e.g. a sentence you said it in, or how it is used", "例如：你用這個詞講的一句話，或它怎麼用")
            }
            className="rounded-sm mt-1 w-full border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-lacquer placeholder:text-inkFaint"
          />
        </label>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PARTS_OF_SPEECH, MAX_RECORDING_NOTE } from "@/lib/constants";
import { ORIGIN_AREAS, ORIGIN_GROUPS } from "@/lib/origins";
import { saveRecording } from "@/lib/audio-upload";
import { useRecorder } from "@/components/useRecorder";
import TakeControls from "@/components/TakeControls";
import Recorder from "@/components/Recorder";

/* ---------------------------------------------------------------------------
   Add a word. One form, read top to bottom: the word, what it means, how it
   sounds, where it is from. The recording is made right here from the
   microphone and sent with the word — there is no file to find and no link
   to paste. Only the word (characters or romanization) and one English
   meaning are required; everything else can be added later by anyone.
   --------------------------------------------------------------------------- */

/** A sense that got saved, so an example-sentence recorder can be wired to it. */
interface SavedSense {
  id: string;
  example: string | null;
}

interface SenseDraft {
  part_of_speech: string;
  definition_en: string;
  gloss_zh: string;
  example: string;
  example_gloss: string;
}

const emptySense = (): SenseDraft => ({
  part_of_speech: "",
  definition_en: "",
  gloss_zh: "",
  example: "",
  example_gloss: "",
});

const inputCls =
  "mt-1 w-full border border-rule bg-surface px-3 py-2 outline-none focus:border-lacquer placeholder:text-inkFaint";
const fieldLabel = "block text-sm";
const eyebrow = "font-mono text-xs uppercase tracking-[0.1em] text-lacquer";

/* A section of the form: a mono eyebrow, a one-line explanation, the fields. */
function Part({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-rule pt-6 sm:grid-cols-[11rem_1fr] sm:gap-8">
      <div className="space-y-1">
        <h2 className={eyebrow}>{title}</h2>
        {lead && <p className="text-sm leading-relaxed text-inkFaint">{lead}</p>}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

export default function SubmitForm({
  userId,
  isEditor = false,
  initialRomanization,
  defaultOriginArea = "",
  defaultOriginLocality = "",
}: {
  userId: string;
  /** Editors are not told about the review queue they run. */
  isEditor?: boolean;
  initialRomanization: string;
  defaultOriginArea?: string;
  defaultOriginLocality?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const rec = useRecorder();

  const [hanzi, setHanzi] = useState("");
  const [romanization, setRomanization] = useState(initialRomanization);
  const [ipa, setIpa] = useState("");
  const [originArea, setOriginArea] = useState(defaultOriginArea);
  const [originLocality, setOriginLocality] = useState(defaultOriginLocality);
  const [notes, setNotes] = useState("");
  const [recNote, setRecNote] = useState("");
  const [senses, setSenses] = useState<SenseDraft[]>([emptySense()]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After the word is saved: its id and senses, for the optional step that
  // records example sentences (and retries the word if its upload failed).
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [savedSenses, setSavedSenses] = useState<SavedSense[]>([]);
  const [recordingFailed, setRecordingFailed] = useState<string | null>(null);

  function updateSense(i: number, patch: Partial<SenseDraft>) {
    setSenses((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addSense() {
    setSenses((prev) => [...prev, emptySense()]);
  }
  function removeSense(i: number) {
    setSenses((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  const wordShown = romanization.trim() || hanzi.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!romanization.trim() && !hanzi.trim()) {
      setError("Please give the word, as characters or in romanization.");
      return;
    }
    if (!senses.some((s) => s.definition_en.trim())) {
      setError("Please give at least one English meaning.");
      return;
    }
    if (rec.recording) {
      setError("Stop the recording first, then submit.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: newId, error: rpcErr } = await supabase.rpc("submit_entry", {
        p_hanzi: hanzi,
        p_romanization: romanization,
        p_ipa: ipa,
        // Recordings live in the recordings table now; the legacy column stays empty.
        p_audio_url: "",
        p_notes: notes,
        p_variety: "",
        p_senses: senses.filter((s) => s.definition_en.trim()),
        p_origin_area: originArea,
        p_origin_locality: originLocality,
      });
      if (rpcErr) throw new Error(rpcErr.message);
      const entryId = newId as string;

      // The word exists; now the take made above goes with it.
      let recFail: string | null = null;
      if (rec.take) {
        try {
          await saveRecording(supabase, {
            userId,
            entryId,
            kind: "headword",
            blob: rec.take.blob,
            seconds: rec.take.seconds,
            note: recNote,
          });
        } catch (err: any) {
          recFail = err?.message ?? "The recording could not be saved.";
        }
      }

      const { data: senseRows } = await supabase
        .from("senses")
        .select("id, example")
        .eq("entry_id", entryId)
        .order("sort", { ascending: true });
      const withExamples = ((senseRows ?? []) as SavedSense[]).filter((s) => (s.example ?? "").trim());

      router.refresh();
      if (!withExamples.length && !recFail) {
        router.push("/submit?success=1");
        return;
      }
      setSavedSenses(withExamples);
      setRecordingFailed(recFail);
      setSavedEntryId(entryId);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  // ---- After saving: example sentences to read, or a failed upload to retry. ----
  if (savedEntryId) {
    return (
      <div className="space-y-6">
        <div className="border-l-2 border-lacquer bg-surface p-4">
          <p className="font-display text-lg font-semibold">
            <span className="romanization">{wordShown}</span> is saved and waiting for an editor.
          </p>
          <p className="mt-1 text-sm text-inkSoft">
            {recordingFailed
              ? "The word went through, but its recording did not."
              : "One more thing you can do, if you like: read the example sentences aloud."}{" "}
            You can finish without it.
          </p>
        </div>

        {recordingFailed && (
          <div className="space-y-3 border border-rule p-4">
            <p className="text-sm text-lacquer">{recordingFailed}</p>
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Try the word again</p>
            <Recorder userId={userId} entryId={savedEntryId} isEditor={isEditor} kind="headword" />
          </div>
        )}

        {savedSenses.length > 0 && (
          <div className="space-y-4">
            {savedSenses.map((s) => (
              <div key={s.id} className="space-y-2 border border-rule p-4">
                <p className="romanization text-inkSoft">{s.example}</p>
                <Recorder userId={userId} entryId={savedEntryId} isEditor={isEditor} kind="example" senseId={s.id} />
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-4">
          <Link
            href="/submit?success=1"
            className="border border-lacquer bg-lacquer px-6 py-2.5 font-display font-semibold uppercase tracking-wide text-paper transition-opacity hover:opacity-90"
          >
            Done
          </Link>
          <Link href="/account" className="font-mono text-xs uppercase tracking-wide text-inkSoft hover:text-lacquer">
            View my submissions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="border-l-2 border-lacquer bg-surface p-3 text-sm text-inkSoft">
          {error}
        </div>
      )}

      <Part
        title="The word"
        lead="Characters or romanization, whichever you know. Both if you can."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={fieldLabel}>
            Characters 漢字
            <input
              value={hanzi}
              onChange={(e) => setHanzi(e.target.value)}
              placeholder="厝"
              className={inputCls}
            />
          </label>
          <label className={fieldLabel}>
            Romanization
            <input
              value={romanization}
              onChange={(e) => setRomanization(e.target.value)}
              placeholder="chuó"
              className={`${inputCls} romanization`}
            />
            <span className="mt-1 block text-xs text-inkFaint">
              Any system—Bàng-uâ-cê, or the way you would spell it out.
            </span>
          </label>
        </div>
        <label className={`${fieldLabel} sm:max-w-[50%] sm:pr-2`}>
          IPA <span className="text-inkFaint">(optional)</span>
          <input value={ipa} onChange={(e) => setIpa(e.target.value)} placeholder="tsʰuo˨˦˨" className={inputCls} />
        </label>
      </Part>

      <Part
        title="What it means"
        lead="One English meaning is enough. Add another if the word has more than one."
      >
        {senses.map((s, i) => (
          <div key={i} className="space-y-3 border border-rule p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wide text-inkFaint">
                Meaning {i + 1}
              </span>
              {senses.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSense(i)}
                  className="font-mono text-xs uppercase tracking-wide text-inkFaint hover:text-lacquer"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
              <label className={fieldLabel}>
                In English <span className="text-lacquer">*</span>
                <input
                  value={s.definition_en}
                  onChange={(e) => updateSense(i, { definition_en: e.target.value })}
                  placeholder="house; home"
                  className={inputCls}
                />
              </label>
              <label className={fieldLabel}>
                Part of speech
                <select
                  value={s.part_of_speech}
                  onChange={(e) => updateSense(i, { part_of_speech: e.target.value })}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {PARTS_OF_SPEECH.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className={fieldLabel}>
              In Mandarin <span className="text-inkFaint">(optional)</span>
              <input
                value={s.gloss_zh}
                onChange={(e) => updateSense(i, { gloss_zh: e.target.value })}
                placeholder="房子"
                className={inputCls}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={fieldLabel}>
                A sentence using it <span className="text-inkFaint">(optional)</span>
                <input
                  value={s.example}
                  onChange={(e) => updateSense(i, { example: e.target.value })}
                  placeholder="Nguāi gì chuó"
                  className={`${inputCls} romanization`}
                />
              </label>
              <label className={fieldLabel}>
                What it means
                <input
                  value={s.example_gloss}
                  onChange={(e) => updateSense(i, { example_gloss: e.target.value })}
                  placeholder="my house"
                  className={inputCls}
                />
              </label>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addSense}
          className="font-mono text-xs uppercase tracking-wide text-lacquer hover:underline"
        >
          + Another meaning
        </button>
      </Part>

      <Part
        title="How it sounds"
        lead="Say the word once, clearly. Optional, but a recording is the one thing only a speaker can give."
      >
        {rec.supported === false ? (
          <p className="text-sm text-inkFaint">
            This browser cannot record audio. Submit the word anyway—you or anyone else can record
            it from its page later.
          </p>
        ) : (
          <div className="space-y-3 border border-rule p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="romanization font-display text-lg font-semibold text-lacquer">
                {wordShown || <span className="text-inkFaint">the word above</span>}
              </span>
              {rec.take && !rec.recording && (
                <span className="font-mono text-[11px] uppercase tracking-wide text-inkFaint">
                  kept—sent with the word
                </span>
              )}
            </div>
            <TakeControls
              recording={rec.recording}
              take={rec.take}
              seconds={rec.seconds}
              error={rec.error}
              onStart={rec.start}
              onStop={rec.stop}
              onDiscard={rec.discard}
              disabled={submitting}
              playLabel={`your recording of ${wordShown || "the word"}`}
            />
            {rec.take && !rec.recording && (
              <label className="block">
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-inkFaint">
                  A note with it <span className="normal-case tracking-normal">(optional)</span>
                </span>
                <input
                  value={recNote}
                  onChange={(e) => setRecNote(e.target.value)}
                  maxLength={MAX_RECORDING_NOTE}
                  placeholder="e.g. a sentence you said it in, or how it is used"
                  className="mt-1 w-full border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-lacquer placeholder:text-inkFaint"
                />
              </label>
            )}
          </div>
        )}
      </Part>

      <Part
        title="Where it's from"
        lead="Filled in from your profile. Change it if you learned this word somewhere else."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={fieldLabel}>
            County or district
            <select value={originArea} onChange={(e) => setOriginArea(e.target.value)} className={inputCls}>
              <option value="">Not specified</option>
              {ORIGIN_GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {ORIGIN_AREAS.filter((a) => a.group === g).map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.label} {a.hanzi}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className={fieldLabel}>
            Town or village <span className="text-inkFaint">(optional)</span>
            <input
              value={originLocality}
              onChange={(e) => setOriginLocality(e.target.value)}
              placeholder="e.g. Jinfeng"
              className={inputCls}
            />
          </label>
        </div>
      </Part>

      <Part title="Anything else" lead="Where the word comes from, who says it, when you would not use it.">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional"
          className={inputCls.replace("mt-1 ", "")}
        />
      </Part>

      <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-6">
        <button
          type="submit"
          disabled={submitting}
          className="border border-lacquer bg-lacquer px-8 py-3 font-display font-semibold uppercase tracking-wide text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Submit for review"}
        </button>
        <p className="max-w-[36ch] text-xs leading-relaxed text-inkFaint">
          An editor reads it before it appears. Contributions are published under{" "}
          <Link href="/terms" className="underline hover:text-lacquer">
            CC BY-SA 4.0
          </Link>
          .
        </p>
      </div>
    </form>
  );
}

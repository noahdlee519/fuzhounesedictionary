"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PARTS_OF_SPEECH, AUDIO_BUCKET, MAX_AUDIO_BYTES } from "@/lib/constants";
import { ORIGIN_AREAS, ORIGIN_GROUPS } from "@/lib/origins";
import Recorder from "@/components/Recorder";

/** A sense that got saved, so we can wire an example recorder to it. */
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
const labelCls = "block font-mono text-xs uppercase tracking-wide text-inkFaint";

export default function SubmitForm({
  userId,
  initialRomanization,
  defaultOriginArea = "",
  defaultOriginLocality = "",
}: {
  userId: string;
  initialRomanization: string;
  defaultOriginArea?: string;
  defaultOriginLocality?: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [hanzi, setHanzi] = useState("");
  const [romanization, setRomanization] = useState(initialRomanization);
  const [ipa, setIpa] = useState("");
  const [variety, setVariety] = useState("");
  const [originArea, setOriginArea] = useState(defaultOriginArea);
  const [originLocality, setOriginLocality] = useState(defaultOriginLocality);
  const [notes, setNotes] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [senses, setSenses] = useState<SenseDraft[]>([emptySense()]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After the word is saved we switch to a recording step wired to the new ids.
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [savedSenses, setSavedSenses] = useState<SavedSense[]>([]);

  function updateSense(i: number, patch: Partial<SenseDraft>) {
    setSenses((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addSense() {
    setSenses((prev) => [...prev, emptySense()]);
  }
  function removeSense(i: number) {
    setSenses((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!romanization.trim() && !hanzi.trim()) {
      setError("Please give at least the characters or the romanization.");
      return;
    }
    if (!senses.some((s) => s.definition_en.trim())) {
      setError("Please give at least one English meaning.");
      return;
    }

    setSubmitting(true);
    try {
      let finalAudio = audioUrl.trim();
      if (audioFile) {
        if (audioFile.size > MAX_AUDIO_BYTES) {
          throw new Error("Audio file is larger than 5 MB.");
        }
        // From the type, never from the file name — a name is whatever the
        // uploader chose, including "/" and "..". Same rule as AvatarUpload.
        const t = (audioFile.type || "").toLowerCase();
        const ext = t.includes("mpeg") || t.includes("mp3") ? "mp3"
          : t.includes("mp4") || t.includes("m4a") || t.includes("aac") ? "m4a"
          : t.includes("wav") ? "wav"
          : t.includes("ogg") || t.includes("opus") ? "ogg"
          : t.includes("flac") ? "flac"
          : "webm";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(AUDIO_BUCKET)
          .upload(path, audioFile, { upsert: false, contentType: audioFile.type || undefined });
        if (upErr) throw new Error(`Audio upload failed: ${upErr.message}`);
        const { data: pub } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path);
        finalAudio = pub.publicUrl;
      }

      const { data: newId, error: rpcErr } = await supabase.rpc("submit_entry", {
        p_hanzi: hanzi,
        p_romanization: romanization,
        p_ipa: ipa,
        p_audio_url: finalAudio,
        p_notes: notes,
        p_variety: variety,
        p_senses: senses.filter((s) => s.definition_en.trim()),
        p_origin_area: originArea,
        p_origin_locality: originLocality,
      });
      if (rpcErr) throw new Error(rpcErr.message);

      // Fetch the saved senses so we can offer to record each example sentence.
      const { data: senseRows } = await supabase
        .from("senses")
        .select("id, example")
        .eq("entry_id", newId as string)
        .order("sort", { ascending: true });

      setSavedSenses((senseRows ?? []) as SavedSense[]);
      setSavedEntryId(newId as string);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  // ---- Step 2: the word is saved; offer to record it in your own voice. ----
  if (savedEntryId) {
    const exampleSenses = savedSenses.filter((s) => (s.example ?? "").trim());
    return (
      <div className="space-y-6">
        <div className="border-l-2 border-lacquer bg-surface p-4">
          <p className="font-display text-lg font-semibold">Saved — it&apos;s in the review queue.</p>
          <p className="mt-1 text-sm text-inkSoft">
            Now the best part: add your own voice. A real recording is the one thing a dictionary
            can&apos;t fake, and it&apos;s optional — you can finish without it.
          </p>
        </div>

        <div className="space-y-3 border border-rule p-4">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Say the word on its own</p>
          <p className="romanization text-inkSoft">{romanization || hanzi}</p>
          <Recorder userId={userId} entryId={savedEntryId} kind="headword" />
        </div>

        {exampleSenses.length > 0 && (
          <div className="space-y-4">
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">
              Say it inside a sentence
            </p>
            {exampleSenses.map((s) => (
              <div key={s.id} className="space-y-2 border border-rule p-4">
                <p className="romanization text-inkSoft">{s.example}</p>
                <Recorder userId={userId} entryId={savedEntryId} kind="example" senseId={s.id} />
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
        <div className="border-l-2 border-lacquer bg-surface p-3 text-sm text-inkSoft">{error}</div>
      )}

      <fieldset className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Chinese characters (漢字)</span>
            <input value={hanzi} onChange={(e) => setHanzi(e.target.value)} placeholder="福州" className={inputCls} />
            <span className="mt-1 block text-xs text-inkFaint">Leave blank if there are none.</span>
          </label>
          <label className="block">
            <span className={labelCls}>Romanization</span>
            <input
              value={romanization}
              onChange={(e) => setRomanization(e.target.value)}
              placeholder="Hók-ciŭ"
              className={`${inputCls} romanization`}
            />
            <span className="mt-1 block text-xs text-inkFaint">Any system you know—no fixed standard.</span>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>IPA / pronunciation</span>
            <input value={ipa} onChange={(e) => setIpa(e.target.value)} placeholder="houʔ tsiu" className={inputCls} />
          </label>
          <div />
        </div>

        <div className="space-y-3 border-t border-rule pt-4">
          <p className={labelCls}>Where is this word from?</p>
          <p className="text-xs text-inkFaint">
            Prefilled from your profile. Change it if you learned this particular word somewhere else.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm">County or district</span>
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
            <label className="block">
              <span className="text-sm">Town or village (optional)</span>
              <input
                value={originLocality}
                onChange={(e) => setOriginLocality(e.target.value)}
                placeholder="e.g. Jinfeng"
                className={inputCls}
              />
            </label>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3 border border-rule p-4">
        <legend className="px-1 font-mono text-xs uppercase tracking-wide text-inkFaint">Pronunciation audio (optional)</legend>
        <p className="text-xs text-inkFaint">
          Want to record straight from your microphone instead? Save the word first — the next step
          lets you record it on its own and inside your example sentences.
        </p>
        <label className="block text-sm">
          Upload a recording (max 5 MB)
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm"
          />
        </label>
        <div className="text-center font-mono text-xs uppercase tracking-wide text-inkFaint">— or —</div>
        <label className="block text-sm">
          Paste a link to a recording
          <input value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://…" className={inputCls} />
        </label>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-mono text-xs uppercase tracking-wide text-inkFaint">Meanings</legend>
        {senses.map((s, i) => (
          <div key={i} className="space-y-3 border border-rule p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wide text-inkFaint">Meaning {i + 1}</span>
              {senses.length > 1 && (
                <button type="button" onClick={() => removeSense(i)} className="font-mono text-xs uppercase tracking-wide text-inkFaint hover:text-lacquer">
                  Remove
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <label className="block">
                <span className="text-sm">Part of speech</span>
                <select value={s.part_of_speech} onChange={(e) => updateSense(i, { part_of_speech: e.target.value })} className={inputCls}>
                  <option value="">—</option>
                  {PARTS_OF_SPEECH.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm">English definition <span className="text-lacquer">*</span></span>
                <input value={s.definition_en} onChange={(e) => updateSense(i, { definition_en: e.target.value })} placeholder="Fuzhou (the city)" className={inputCls} />
              </label>
            </div>
            <label className="block">
              <span className="text-sm">Chinese gloss (optional)</span>
              <input value={s.gloss_zh} onChange={(e) => updateSense(i, { gloss_zh: e.target.value })} placeholder="福州" className={inputCls} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm">Example (Fuzhounese)</span>
                <input value={s.example} onChange={(e) => updateSense(i, { example: e.target.value })} placeholder="Nguāi sê Hók-ciŭ nè̤ng." className={`${inputCls} romanization`} />
              </label>
              <label className="block">
                <span className="text-sm">Example translation</span>
                <input value={s.example_gloss} onChange={(e) => updateSense(i, { example_gloss: e.target.value })} placeholder="I am a Fuzhou person." className={inputCls} />
              </label>
            </div>
          </div>
        ))}
        <button type="button" onClick={addSense} className="font-mono text-xs uppercase tracking-wide text-lacquer hover:underline">
          + Add another meaning
        </button>
      </fieldset>

      <label className="block">
        <span className={labelCls}>Notes (optional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Etymology, regional variation, register…" className={inputCls} />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="border border-lacquer bg-lacquer px-8 py-3 font-display font-semibold uppercase tracking-wide text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}

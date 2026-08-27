"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PARTS_OF_SPEECH, AUDIO_BUCKET, MAX_AUDIO_BYTES } from "@/lib/constants";

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
}: {
  userId: string;
  initialRomanization: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [hanzi, setHanzi] = useState("");
  const [romanization, setRomanization] = useState(initialRomanization);
  const [ipa, setIpa] = useState("");
  const [variety, setVariety] = useState("");
  const [notes, setNotes] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [senses, setSenses] = useState<SenseDraft[]>([emptySense()]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const ext = audioFile.name.split(".").pop() || "webm";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(AUDIO_BUCKET)
          .upload(path, audioFile, { upsert: false, contentType: audioFile.type || undefined });
        if (upErr) throw new Error(`Audio upload failed: ${upErr.message}`);
        const { data: pub } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path);
        finalAudio = pub.publicUrl;
      }

      const { error: rpcErr } = await supabase.rpc("submit_entry", {
        p_hanzi: hanzi,
        p_romanization: romanization,
        p_ipa: ipa,
        p_audio_url: finalAudio,
        p_notes: notes,
        p_variety: variety,
        p_senses: senses.filter((s) => s.definition_en.trim()),
      });
      if (rpcErr) throw new Error(rpcErr.message);

      router.push("/submit?success=1");
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
      setSubmitting(false);
    }
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
            <span className="mt-1 block text-xs text-inkFaint">Any system you know — no fixed standard.</span>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>IPA / pronunciation</span>
            <input value={ipa} onChange={(e) => setIpa(e.target.value)} placeholder="houʔ tsiu" className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Variety / region</span>
            <input value={variety} onChange={(e) => setVariety(e.target.value)} placeholder="e.g. Fuzhou city, Changle…" className={inputCls} />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3 border border-rule p-4">
        <legend className="px-1 font-mono text-xs uppercase tracking-wide text-inkFaint">Pronunciation audio (optional)</legend>
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

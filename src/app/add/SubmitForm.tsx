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
import { useL } from "@/components/LangProvider";
import DuplicateWarning from "./DuplicateWarning";
import HanziTraditional from "./HanziTraditional";

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
const eyebrow = "meta text-lacquer";

/* Display names for the part-of-speech options in 中文 mode; the stored
   value stays the English one. */
const POS_ZH: Record<string, string> = {
  noun: "名詞",
  verb: "動詞",
  adjective: "形容詞",
  adverb: "副詞",
  pronoun: "代詞",
  numeral: "數詞",
  "measure word": "量詞",
  particle: "助詞",
  phrase: "短語",
  "proper noun": "專有名詞",
};

/* A section of the form: a small-caps title, the fields beside it. The
   one-line explanation lives in a tooltip on the title (hover, or focus by
   keyboard or tap), marked by a dotted underline and a small "i". */
function Part({
  id,
  title,
  lead,
  children,
}: {
  /** Stable, language-independent id for the tooltip. */
  id: string;
  title: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
}) {
  const tipId = `part-${id}`;
  return (
    <section className="grid gap-4 border-t border-rule pt-6 sm:grid-cols-[11rem_1fr] sm:gap-8">
      <div>
        {lead ? (
          <h2 className="group relative inline-block">
            <span
              tabIndex={0}
              aria-describedby={tipId}
              className={`${eyebrow} cursor-help underline decoration-dotted decoration-1 underline-offset-4 outline-none focus-visible:outline-2`}
            >
              {title}
              <span className="info-dot" aria-hidden="true">i</span>
            </span>
            <span
              id={tipId}
              role="tooltip"
              className="invisible absolute left-0 top-full z-30 w-64 pt-2 opacity-0 transition-[opacity,visibility] duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
            >
              <span className="block rounded-sm border border-ruleStrong bg-paper px-3 py-2.5 text-[13px] font-normal normal-case leading-relaxed tracking-normal text-inkSoft shadow-[0_8px_28px_rgb(0_0_0/.12)]">
                {lead}
              </span>
            </span>
          </h2>
        ) : (
          <h2 className={eyebrow}>{title}</h2>
        )}
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
  const L = useL();

  const [hanzi, setHanzi] = useState("");
  // What is saved: the traditional form when the characters were typed in
  // simplified (HanziTraditional), else the characters as typed.
  const [hanziTrad, setHanziTrad] = useState<string | null>(null);
  const hanziToSave = hanziTrad ?? hanzi;
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

  const wordShown = romanization.trim() || hanziToSave.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!romanization.trim() && !hanzi.trim()) {
      setError(L("Please give the word, as characters or in romanization.", "請填寫這個詞，漢字或羅馬字都可以。"));
      return;
    }
    if (!senses.some((s) => s.definition_en.trim())) {
      setError(L("Please give at least one English meaning.", "請至少填寫一個英文意思。"));
      return;
    }
    if (rec.recording) {
      setError(L("Stop the recording first, then submit.", "請先停止錄音，再送出。"));
      return;
    }

    setSubmitting(true);
    try {
      const { data: newId, error: rpcErr } = await supabase.rpc("submit_entry", {
        p_hanzi: hanziToSave,
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
          recFail = err?.message ?? L("The recording could not be saved.", "錄音無法儲存。");
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
        router.push("/add?success=1");
        return;
      }
      setSavedSenses(withExamples);
      setRecordingFailed(recFail);
      setSavedEntryId(entryId);
    } catch (err: any) {
      setError(err.message ?? L("Something went wrong. Please try again.", "出了點問題，請再試一次。"));
      setSubmitting(false);
    }
  }

  // ---- After saving: example sentences to read, or a failed upload to retry. ----
  if (savedEntryId) {
    return (
      <div className="space-y-6">
        <div className="border-l-2 border-lacquer bg-surface p-4">
          <p className="font-display text-lg font-semibold">
            {L("", "「")}
            <span className="romanization">{wordShown}</span>
            {L(" is saved and waiting for an editor.", "」已儲存，正在等編輯審閱。")}
          </p>
          <p className="mt-1 text-sm text-inkSoft">
            {recordingFailed
              ? L("The word went through, but its recording did not.", "詞已送出，但錄音沒有成功。")
              : L("One more thing you can do, if you like: read the example sentences aloud.", "如果願意，還可以再做一件事：把例句念出來。")}
            {L(" You can finish without it.", "不做也可以直接完成。")}
          </p>
        </div>

        {recordingFailed && (
          <div className="space-y-3 border border-rule p-4">
            <p className="text-sm text-lacquer">{recordingFailed}</p>
            <p className="meta text-inkFaint">{L("Try the word again", "重錄這個詞")}</p>
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
            href="/add?success=1"
            className="border border-lacquer bg-lacquer px-6 py-2.5 font-semibold text-paper transition-opacity hover:opacity-90"
          >
            {L("Done", "完成")}
          </Link>
          <Link href="/account" className="meta text-inkSoft hover:text-lacquer">
            {L("View my submissions", "查看我的投稿")}
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
        id="word"
        title={L("The word", "詞")}
        lead={L("Characters or romanization, whichever you know. Both if you can.", "漢字或羅馬字，知道哪個填哪個。能兩個都填更好。")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={fieldLabel}>
            {L("Characters 漢字", "漢字")}
            <input
              value={hanzi}
              onChange={(e) => setHanzi(e.target.value)}
              placeholder="厝"
              className={inputCls}
            />
          </label>
          <label className={fieldLabel}>
            {L("Romanization", "羅馬字")}
            <input
              value={romanization}
              onChange={(e) => setRomanization(e.target.value)}
              placeholder="chuó"
              className={`${inputCls} romanization`}
            />
            <span className="mt-1 block text-xs text-inkFaint">
              {L("Any system—Bàng-uâ-cê, or the way you would spell it out.", "任何拼法都可以——平話字（Bàng-uâ-cê），或你自己的拼法。")}
            </span>
          </label>
        </div>
        <HanziTraditional value={hanzi} onResolved={setHanziTrad} />
        <DuplicateWarning hanzi={hanziToSave} romanization={romanization} />
        <label className={`${fieldLabel} sm:max-w-[50%] sm:pr-2`}>
          IPA <span className="text-inkFaint">{L("(optional)", "（選填）")}</span>
          <input value={ipa} onChange={(e) => setIpa(e.target.value)} placeholder="tsʰuo˨˦˨" className={inputCls} />
        </label>
      </Part>

      <Part
        id="meaning"
        title={L("What it means", "意思")}
        lead={L("One English meaning is enough. Add another if the word has more than one.", "一個英文意思就夠了。如果這個詞有好幾個意思，可以再加。")}
      >
        {senses.map((s, i) => (
          <div key={i} className="space-y-3 border border-rule p-4">
            <div className="flex items-center justify-between">
              <span className="meta text-inkFaint">
                {L("Meaning {n}", "意思 {n}", { n: i + 1 })}
              </span>
              {senses.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSense(i)}
                  className="meta text-inkFaint hover:text-lacquer"
                >
                  {L("Remove", "移除")}
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
              <label className={fieldLabel}>
                {L("In English", "英文")} <span className="text-lacquer">*</span>
                <input
                  value={s.definition_en}
                  onChange={(e) => updateSense(i, { definition_en: e.target.value })}
                  placeholder="house; home"
                  className={inputCls}
                />
              </label>
              <label className={fieldLabel}>
                {L("Part of speech", "詞性")}
                <select
                  value={s.part_of_speech}
                  onChange={(e) => updateSense(i, { part_of_speech: e.target.value })}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {PARTS_OF_SPEECH.map((p) => (
                    <option key={p} value={p}>
                      {L(p, POS_ZH[p] ?? p)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className={fieldLabel}>
              {L("In Mandarin", "普通話")} <span className="text-inkFaint">{L("(optional)", "（選填）")}</span>
              <input
                value={s.gloss_zh}
                onChange={(e) => updateSense(i, { gloss_zh: e.target.value })}
                placeholder="房子"
                className={inputCls}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={fieldLabel}>
                {L("A sentence using it", "例句")} <span className="text-inkFaint">{L("(optional)", "（選填）")}</span>
                <input
                  value={s.example}
                  onChange={(e) => updateSense(i, { example: e.target.value })}
                  placeholder="Nguāi gì chuó"
                  className={`${inputCls} romanization`}
                />
              </label>
              <label className={fieldLabel}>
                {L("What it means", "例句的英文意思")}
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
          className="meta text-lacquer hover:underline"
        >
          {L("+ Another meaning", "＋ 再加一個意思")}
        </button>
      </Part>

      <Part
        id="sound"
        title={L("How it sounds", "發音")}
        lead={L("Say the word once, clearly. Optional, but a recording is the one thing only a speaker can give.", "清楚地把這個詞講一次。錄音是選填的，但只有會講的人才能提供。")}
      >
        {rec.supported === false ? (
          <p className="text-sm text-inkFaint">
            {L(
              "This browser cannot record audio. Submit the word anyway—you or anyone else can record it from its page later.",
              "這個瀏覽器無法錄音。還是可以先送出這個詞——之後你或其他人都能在詞條頁補上錄音。"
            )}
          </p>
        ) : (
          <div className="space-y-3 border border-rule p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              {/* Blank until the word is typed; the "the word above"
                  placeholder was removed (Noah, 23 Sep 2026). */}
              <span className="romanization font-display text-lg font-semibold text-lacquer">
                {wordShown}
              </span>
              {rec.take && !rec.recording && (
                <span className="meta text-inkFaint">
                  {L("kept—sent with the word", "已保留——會隨詞一起送出")}
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
              playLabel={
                wordShown
                  ? L("your recording of {w}", "你錄的「{w}」", { w: wordShown })
                  : L("your recording of the word", "你錄的這個詞")
              }
            />
            {rec.take && !rec.recording && (
              <label className="block">
                <span className="meta text-inkFaint">
                  {L("A note with it", "附註")} <span className="normal-case tracking-normal">{L("(optional)", "（選填）")}</span>
                </span>
                <input
                  value={recNote}
                  onChange={(e) => setRecNote(e.target.value)}
                  maxLength={MAX_RECORDING_NOTE}
                  placeholder={L("e.g. a sentence you said it in, or how it is used", "例如：你用這個詞講的一句話，或它怎麼用")}
                  className="mt-1 w-full border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-lacquer placeholder:text-inkFaint"
                />
              </label>
            )}
          </div>
        )}
      </Part>

      <Part
        id="origin"
        title={L("Where it's from", "來自哪裡")}
        lead={L("Filled in from your profile. Change it if you learned this word somewhere else.", "已依你的個人資料填好。如果這個詞是在別的地方學的，可以修改。")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={fieldLabel}>
            {L("County or district", "縣或區")}
            <select value={originArea} onChange={(e) => setOriginArea(e.target.value)} className={inputCls}>
              <option value="">{L("Not specified", "未指定")}</option>
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
            {L("Town or village", "鄉鎮或村")} <span className="text-inkFaint">{L("(optional)", "（選填）")}</span>
            <input
              value={originLocality}
              onChange={(e) => setOriginLocality(e.target.value)}
              placeholder={L("e.g. Jinfeng", "例如：金峰")}
              className={inputCls}
            />
          </label>
        </div>
      </Part>

      <Part
        id="else"
        title={L("Anything else", "其他")}
        lead={L("Where the word comes from, who says it, when you would not use it.", "這個詞的來源、誰會這樣講、什麼時候不用。")}
      >
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder={L("Optional", "選填")}
          className={inputCls.replace("mt-1 ", "")}
        />
      </Part>

      <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-6">
        <button
          type="submit"
          disabled={submitting}
          className="border border-lacquer bg-lacquer px-8 py-3 font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? L("Sending…", "送出中…") : L("Submit for review", "送出審核")}
        </button>
        {/* Wide enough for two lines, and the licence's name kept whole, so
            "4.0" never hangs on a line of its own. */}
        <p className="max-w-[48ch] text-xs leading-relaxed text-inkFaint">
          {L("An editor reads it before it appears. Contributions are published under", "編輯看過後才會刊出。所有貢獻以")}{" "}
          <Link href="/terms" className="whitespace-nowrap underline hover:text-lacquer">
            CC BY-SA 4.0
          </Link>
          {L(".", " 授權發布。")}
        </p>
      </div>
    </form>
  );
}

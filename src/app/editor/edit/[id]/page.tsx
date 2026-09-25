import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { saveEdit } from "../../actions";
import { PARTS_OF_SPEECH } from "@/lib/constants";
import type { Sense } from "@/lib/types";
import type { Metadata } from "next";
import { ORIGIN_AREAS, ORIGIN_GROUPS } from "@/lib/origins";
import { sortSenses } from "@/lib/entries";
import DeleteEntry from "@/components/DeleteEntry";
import { localPath } from "@/lib/local-path";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const L = pick(getLang());
  return {
    title: L("Edit entry", "編輯詞條"),
    robots: { index: false, follow: false },
  };
}

/* Chinese for the group headings and the descriptive choices in the county
   list; place names keep their "Changle 長樂" form in both languages. */
const GROUP_ZH: Record<string, string> = {
  "Fuzhou city": "福州市區",
  "Fuzhou prefecture": "福州其他縣市",
  "Beyond Fuzhou": "福州以外",
};
const AREA_ZH: Record<string, string> = {
  fuzhou_unsure: "福州市區（不確定哪一區）",
  matsu: "馬祖（連江）",
  ningde: "寧德一帶（福寧）",
  fujian_other: "福建其他地方",
  overseas: "海外社群",
};
const POS_ZH: Record<string, string> = {
  noun: "名詞",
  verb: "動詞",
  adjective: "形容詞",
  adverb: "副詞",
  pronoun: "代詞",
  numeral: "數詞",
  "measure word": "量詞",
  particle: "助詞",
  phrase: "片語",
  "proper noun": "專有名詞",
};

const cls =
  "rounded-sm mt-1 w-full border border-rule bg-surface px-3 py-2 outline-none focus:border-lacquer placeholder:text-inkFaint";

export default async function EditEntryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { back?: string };
}) {
  const L = pick(getLang());
  const { profile } = await getSessionUser();
  if (!profile?.is_editor) redirect("/editor");

  // Where Save returns to: the queue by default, or the entry page when the
  // edit was opened from there. Only a path on this site is honoured.
  const raw = (searchParams.back ?? "").trim();
  const back = localPath(raw, "/editor");
  const backLabel = back.startsWith("/entry/")
    ? L("← Back to the word", "← 回到詞條")
    : back.startsWith("/editor")
      ? L("← Back to queue", "← 回到審核清單")
      : L("← Back to the list", "← 回到清單");

  // Service role read so editors can edit entries in any status.
  const { data: entry } = await adminClient()
    .from("entries")
    .select("*, senses(*)")
    .eq("id", params.id)
    .maybeSingle();

  if (!entry) redirect("/editor");
  const senses: Sense[] = sortSenses((entry as any).senses);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{L("Edit entry", "編輯詞條")}</h1>
        <Link href={back} className="meta text-lacquer hover:underline">
          {backLabel}
        </Link>
      </div>

      <form action={saveEdit} className="space-y-5">
        <input type="hidden" name="id" value={entry.id} />
        <input type="hidden" name="back" value={back} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-medium">{L("Characters", "漢字")}</span>
            <input name="hanzi" defaultValue={entry.hanzi ?? ""} className={cls} /></label>
          <label className="block"><span className="text-sm font-medium">{L("Romanization", "羅馬字")}</span>
            <input name="romanization" defaultValue={entry.romanization ?? ""} className={`${cls} romanization`} /></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-medium">IPA</span>
            <input name="ipa" defaultValue={entry.ipa ?? ""} className={cls} /></label>
          <label className="block"><span className="text-sm font-medium">{L("Town or village", "鄉鎮／村")}</span>
            <input name="origin_locality" defaultValue={entry.origin_locality ?? ""} className={cls} /></label>
        </div>
        <label className="block"><span className="text-sm font-medium">{L("County or district", "縣／區")}</span>
          <select name="origin_area" defaultValue={entry.origin_area ?? ""} className={cls}>
            <option value="">{L("Not specified", "未指定")}</option>
            {ORIGIN_GROUPS.map((g) => (
              <optgroup key={g} label={L(g, GROUP_ZH[g] ?? g)}>
                {ORIGIN_AREAS.filter((a) => a.group === g).map((a) => (
                  <option key={a.code} value={a.code}>{AREA_ZH[a.code] ? L(`${a.label} ${a.hanzi}`, AREA_ZH[a.code]) : `${a.label} ${a.hanzi}`}</option>
                ))}
              </optgroup>
            ))}
          </select></label>

        <fieldset className="space-y-4">
          <legend className="meta text-inkFaint">{L("Meanings", "意思")}</legend>
          {senses.map((s, i) => (
            <div key={s.id} className="rounded-sm space-y-3 border border-rule p-4">
              <input type="hidden" name="sense_id" value={s.id} />
              <span className="meta text-inkFaint">{L("Meaning {n}", "意思 {n}", { n: i + 1 })}</span>
              <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                <label className="block"><span className="text-sm">{L("Part of speech", "詞性")}</span>
                  <select name={`pos_${s.id}`} defaultValue={s.part_of_speech ?? ""} className={cls}>
                    <option value="">—</option>
                    {PARTS_OF_SPEECH.map((p) => <option key={p} value={p}>{L(p, POS_ZH[p] ?? p)}</option>)}
                  </select></label>
                <label className="block"><span className="text-sm">{L("English definition", "英文釋義")}</span>
                  <input name={`def_${s.id}`} defaultValue={s.definition_en} className={cls} required /></label>
              </div>
              <label className="block"><span className="text-sm">{L("Chinese gloss", "中文釋義")}</span>
                <input name={`zh_${s.id}`} defaultValue={s.gloss_zh ?? ""} className={cls} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="text-sm">{L("Example", "例句")}</span>
                  <input name={`ex_${s.id}`} defaultValue={s.example ?? ""} className={`${cls} romanization`} /></label>
                <label className="block"><span className="text-sm">{L("Example translation", "例句翻譯")}</span>
                  <input name={`exg_${s.id}`} defaultValue={s.example_gloss ?? ""} className={cls} /></label>
              </div>
            </div>
          ))}
        </fieldset>

        <label className="block"><span className="text-sm font-medium">{L("Notes", "附註")}</span>
          <textarea name="notes" defaultValue={entry.notes ?? ""} rows={2} className={cls} /></label>

        <button className="rounded-sm border border-lacquer bg-lacquer px-8 py-3 meta text-paper transition-[color,background-color,border-color,transform] active:scale-[.97] hover:bg-transparent hover:text-lacquer">{L("Save changes", "儲存變更")}</button>
      </form>

      {/* Outside the edit form: a form cannot nest inside another form. */}
      <div className="flex justify-end border-t border-rule pt-4">
        <DeleteEntry id={entry.id} back="/editor" />
      </div>
    </div>
  );
}

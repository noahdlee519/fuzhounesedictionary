import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { saveEdit } from "../../actions";
import { PARTS_OF_SPEECH } from "@/lib/constants";
import type { Sense } from "@/lib/types";
import type { Metadata } from "next";
import { ORIGIN_AREAS, ORIGIN_GROUPS } from "@/lib/origins";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit entry",
  robots: { index: false, follow: false },
};

const cls =
  "mt-1 w-full border border-rule bg-surface px-3 py-2 outline-none focus:border-lacquer placeholder:text-inkFaint";

export default async function EditEntryPage({ params }: { params: { id: string } }) {
  const { profile } = await getSessionUser();
  if (!profile?.is_editor) redirect("/admin");

  // Service role read so editors can edit entries in any status.
  const { data: entry } = await adminClient()
    .from("entries")
    .select("*, senses(*)")
    .eq("id", params.id)
    .maybeSingle();

  if (!entry) redirect("/admin");
  const senses: Sense[] = [...((entry as any).senses ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight">Edit entry</h1>
        <Link href="/admin" className="font-mono text-xs uppercase tracking-[0.1em] text-lacquer hover:underline">
          ← Back to queue
        </Link>
      </div>

      <form action={saveEdit} className="space-y-5">
        <input type="hidden" name="id" value={entry.id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-medium">Characters</span>
            <input name="hanzi" defaultValue={entry.hanzi ?? ""} className={cls} /></label>
          <label className="block"><span className="text-sm font-medium">Romanization</span>
            <input name="romanization" defaultValue={entry.romanization ?? ""} className={`${cls} romanization`} /></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-medium">IPA</span>
            <input name="ipa" defaultValue={entry.ipa ?? ""} className={cls} /></label>
          <label className="block"><span className="text-sm font-medium">Town or village</span>
            <input name="origin_locality" defaultValue={entry.origin_locality ?? ""} className={cls} /></label>
        </div>
        <label className="block"><span className="text-sm font-medium">County or district</span>
          <select name="origin_area" defaultValue={entry.origin_area ?? ""} className={cls}>
            <option value="">Not specified</option>
            {ORIGIN_GROUPS.map((g) => (
              <optgroup key={g} label={g}>
                {ORIGIN_AREAS.filter((a) => a.group === g).map((a) => (
                  <option key={a.code} value={a.code}>{a.label} {a.hanzi}</option>
                ))}
              </optgroup>
            ))}
          </select></label>
        <label className="block"><span className="text-sm font-medium">Audio URL</span>
          <input name="audio_url" defaultValue={entry.audio_url ?? ""} className={cls} /></label>

        <fieldset className="space-y-4">
          <legend className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Meanings</legend>
          {senses.map((s, i) => (
            <div key={s.id} className="space-y-3 border border-rule p-4">
              <input type="hidden" name="sense_id" value={s.id} />
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint">Meaning {i + 1}</span>
              <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                <label className="block"><span className="text-sm">Part of speech</span>
                  <select name={`pos_${s.id}`} defaultValue={s.part_of_speech ?? ""} className={cls}>
                    <option value="">—</option>
                    {PARTS_OF_SPEECH.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select></label>
                <label className="block"><span className="text-sm">English definition</span>
                  <input name={`def_${s.id}`} defaultValue={s.definition_en} className={cls} required /></label>
              </div>
              <label className="block"><span className="text-sm">Chinese gloss</span>
                <input name={`zh_${s.id}`} defaultValue={s.gloss_zh ?? ""} className={cls} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="text-sm">Example</span>
                  <input name={`ex_${s.id}`} defaultValue={s.example ?? ""} className={`${cls} romanization`} /></label>
                <label className="block"><span className="text-sm">Example translation</span>
                  <input name={`exg_${s.id}`} defaultValue={s.example_gloss ?? ""} className={cls} /></label>
              </div>
            </div>
          ))}
        </fieldset>

        <label className="block"><span className="text-sm font-medium">Notes</span>
          <textarea name="notes" defaultValue={entry.notes ?? ""} rows={2} className={cls} /></label>

        <button className="border border-lacquer bg-lacquer px-8 py-3 font-mono text-xs uppercase tracking-[0.1em] text-paper transition-colors hover:bg-transparent hover:text-lacquer">Save changes</button>
      </form>
    </div>
  );
}

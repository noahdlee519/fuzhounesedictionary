import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { saveEdit } from "../../actions";
import { PARTS_OF_SPEECH } from "@/lib/constants";
import type { Sense } from "@/lib/types";

export const dynamic = "force-dynamic";

const cls = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-accent dark:bg-stone-900 dark:border-stone-700";

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
        <h1 className="font-serif text-2xl font-bold">Edit entry</h1>
        <Link href="/admin" className="text-sm text-accent hover:underline">← Back to queue</Link>
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
          <label className="block"><span className="text-sm font-medium">Variety</span>
            <input name="variety" defaultValue={entry.variety ?? ""} className={cls} /></label>
        </div>
        <label className="block"><span className="text-sm font-medium">Audio URL</span>
          <input name="audio_url" defaultValue={entry.audio_url ?? ""} className={cls} /></label>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold">Meanings</legend>
          {senses.map((s, i) => (
            <div key={s.id} className="space-y-3 rounded-lg border border-stone-200 p-4 dark:border-stone-700">
              <input type="hidden" name="sense_id" value={s.id} />
              <span className="text-sm font-semibold text-stone-500">Meaning {i + 1}</span>
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

        <button className="rounded-full bg-accent px-8 py-3 font-medium text-white hover:opacity-90">Save changes</button>
      </form>
    </div>
  );
}

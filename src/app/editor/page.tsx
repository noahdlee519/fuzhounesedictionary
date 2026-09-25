import Link from "next/link";
import { TRUST_RECORDINGS_FROM } from "@/lib/trust";
import SubmitButton from "@/components/SubmitButton";
import DeleteRecording from "@/components/DeleteRecording";
import DeleteEntry from "@/components/DeleteEntry";
import PlayButton from "@/components/PlayButton";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInButton from "@/components/SignInButton";
import { translator, pick } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import ContributeTabs from "@/components/ContributeTabs";
import LocalTime from "@/components/LocalTime";
import {
  approve,
  reject,
  approveRecording,
  rejectRecording,
  approveSuggestion,
  rejectSuggestion,
} from "./actions";
import type { Sense } from "@/lib/types";
import { formatOrigin } from "@/lib/origins";
import { one, sortSenses } from "@/lib/entries";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const L = pick(getLang());
  return {
    title: L("Review", "審核"),
    robots: { index: false, follow: false },
  };
}

/* Part of speech is stored in English; Chinese readers get a label. */
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

const chip =
  "rounded-sm meta text-inkSoft ring-1 ring-rule px-2 py-0.5";
const btn =
  "rounded-sm border px-4 py-1.5 meta transition-[color,background-color,border-color,opacity,transform] active:scale-[.97]";

export default async function AdminPage() {
  const { user, profile } = await getSessionUser();

  const t = translator(getLang());
  const L = pick(getLang());

  if (!user) {
    return (
      <div className="space-y-8">
        <ContributeTabs active="review" />
        <div className="max-w-lg space-y-4 rounded-sm border border-rule bg-surface p-8">
          <p className="h3">{t("admin.signin.h")}</p>
          <p className="text-inkSoft">{t("admin.signin.p")}</p>
          <div className="flex justify-center"><SignInButton next="/editor" label={t("signin.google")} /></div>
        </div>
      </div>
    );
  }

  if (!profile?.is_editor) {
    return (
      <div className="space-y-8">
        <ContributeTabs active="add" />
        <div className="max-w-lg space-y-3 rounded-sm border border-rule bg-surface p-8">
          <p className="h3">{t("admin.only.h")}</p>
          <p className="text-inkSoft">{t("admin.only.p", { name: profile?.display_name ?? "" })}</p>
          <Link href="/add" className="link">{t("admin.only.link")}</Link>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  // Three independent queues, fetched together. To-one embeds are flattened
  // here so the markup below never has to ask whether it got an array.
  const [{ data, error }, { data: recData, error: recError }, { data: sugData, error: sugError }] =
    await Promise.all([
      supabase
        .from("entries")
        .select("*, senses(*), contributor:profiles(id, display_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      // The word is embedded, the speaker is not: production will not join
      // recordings to profiles, and asking takes the whole queue down with
      // it. See supabase/recordings_profiles_fk.sql.
      supabase
        .from("recordings")
        // The word's meanings come with it, so an editor can tell at a glance
        // whether the take says the right thing (Noah, 23 Sep 2026).
        .select("*, entry:entries(hanzi, romanization, headword, status, senses(id, definition_en, example, example_gloss, sort))")
        // Waiting for review, and (lib/trust) those that went live in the
        // trust window and no editor has checked yet.
        .or(`status.eq.pending,and(status.eq.approved,reviewed_at.is.null,created_at.gte.${TRUST_RECORDINGS_FROM})`)
        .order("created_at", { ascending: true }),
      supabase
        .from("suggestions")
        .select(
          "id, entry_id, kind, value, value_gloss, origin_area, origin_locality, created_at, contributor:profiles(id, display_name), entry:entries(hanzi, romanization, headword, status), sense:senses(definition_en)"
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
    ]);
  const pending = (data ?? []).map((e: any) => ({ ...e, contributor: one(e.contributor) }));

  /* Possible duplicates (Noah, 23 Sep 2026): for each word waiting, any live
     entry with the same characters, or the same romanization ignoring case.
     The same test as the warning on the Add a word form, so anything that
     got past that is flagged here. A flag, not a verdict: the same
     characters can be a different word. */
  const literal = (v: string) => v.replace(/[\\%_]/g, (c) => `\\${c}`);
  const dupes = new Map<string, { id: string; hanzi: string | null; romanization: string | null; headword: string }[]>();
  await Promise.all(
    pending.map(async (e: any) => {
      const h = (e.hanzi ?? "").trim();
      const r = (e.romanization ?? "").trim() || (e.headword ?? "").trim();
      const base = () =>
        supabase.from("entries").select("id, hanzi, romanization, headword").eq("status", "approved").neq("id", e.id).limit(3);
      const results = await Promise.all(
        [
          h ? base().eq("hanzi", h) : null,
          r ? base().ilike("romanization", literal(r)) : null,
          r ? base().ilike("headword", literal(r)) : null,
        ].filter(Boolean) as ReturnType<typeof base>[]
      ).catch(() => []);
      const seen = new Map<string, any>();
      for (const { data: rows } of results) for (const m of (rows as any[]) ?? []) seen.set(m.id, m);
      if (seen.size) dupes.set(e.id, [...seen.values()].slice(0, 3));
    })
  );
  const recSpeakerIds = [...new Set(((recData ?? []) as any[]).map((r) => r.contributor_id).filter(Boolean))];
  const recSpeakers = new Map<string, { id: string; display_name: string | null }>();
  if (recSpeakerIds.length) {
    const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", recSpeakerIds);
    for (const p of (profs ?? []) as any[]) recSpeakers.set(p.id, { id: p.id, display_name: p.display_name ?? null });
  }
  const pendingRecs = (recData ?? []).map((r: any) => ({
    ...r,
    entry: one(r.entry),
    contributor: recSpeakers.get(r.contributor_id) ?? null,
  }));
  const pendingSugs = (sugData ?? []).map((s: any) => ({
    ...s,
    entry: one(s.entry),
    contributor: one(s.contributor),
    sense: one(s.sense),
  }));
  /* Each queue reports its own failure, by name, and the others still show.
     This page is editors-only, so the message can say what is actually wrong:
     the usual cause is a migration that has not been run, and "could not be
     loaded" on its own sent Noah looking for a bug in the code. */
  const missingTable = (e: { code?: string; message?: string } | null) =>
    e?.code === "PGRST205" || /schema cache|does not exist/i.test(e?.message ?? "");
  const problem = (what: string, file: string, e: { code?: string; message?: string } | null) =>
    e ? (
      <p className="rounded-sm border-l-2 border-lacquer bg-surface p-4 text-sm text-inkSoft">
        <span className="font-medium text-ink">{L("{what} could not be loaded.", "無法載入{what}。", { what })}</span>{L(" ", "")}
        {missingTable(e) ? (
          <>
            {L("The database does not have that table yet: run ", "資料庫還沒有這個資料表：請在 Supabase SQL 編輯器中執行 ")}
            <code className="text-[13px]">supabase/{file}</code>
            {L(" in the Supabase SQL editor and reload.", "，然後重新載入。")}
          </>
        ) : (
          <>{L("Please reload in a moment. ({msg})", "請稍後重新載入。（{msg}）", { msg: e.message ?? "" })}</>
        )}
      </p>
    ) : null;
  const waiting = pending.length + pendingRecs.length + pendingSugs.length;
  const anyFailed = Boolean(error || recError || sugError);

  return (
    <div className="space-y-6">
      <ContributeTabs active="review" />
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span />
        <span className="meta text-inkFaint">
          {t("tab.waiting", { n: waiting })}
        </span>
      </div>

      {problem(L("Suggestions", "建議"), "suggestions.sql", sugError)}
      {problem(L("Recordings", "錄音"), "recordings.sql", recError)}
      {problem(L("Words", "詞條"), "schema.sql", error)}

      {pendingSugs.length > 0 && (
        <section className="space-y-3">
          <h2 className="meta text-lacquer">
            {pendingSugs.length === 1
              ? L("1 suggestion to read", "1 則建議待閱")
              : L("{n} suggestions to read", "{n} 則建議待閱", { n: pendingSugs.length })}
          </h2>
          <div className="grid gap-3">
            {pendingSugs.map((s: any) => {
              const { entry: e, contributor: c, sense } = s;
              const origin = formatOrigin(s.origin_area, s.origin_locality);
              return (
                <div key={s.id} className="rounded-sm border border-rule bg-surface p-4">
                  <div className="flex flex-wrap items-baseline gap-3">
                    {e?.hanzi && <span className="font-display text-xl font-bold">{e.hanzi}</span>}
                    <Link
                      href={e?.status === "approved" ? `/entry/${s.entry_id}` : `/editor/edit/${s.entry_id}`}
                      className="romanization font-display font-semibold text-lacquer hover:underline"
                    >
                      {e?.romanization || e?.headword}
                    </Link>
                    <span className={s.kind === "report" ? "rounded-sm meta text-lacquer ring-1 ring-lacquer px-2 py-0.5" : chip}>{s.kind === "edit" ? L("suggested edit", "建議修改") : s.kind === "report" ? L("report", "檢舉") : s.kind}</span>
                    {origin && <span className={chip}>{origin}</span>}
                    <span className="ml-auto meta text-inkFaint">
                      <LocalTime iso={s.created_at} time />
                      {c?.display_name ? ` · ${c.display_name}` : ""}
                    </span>
                  </div>

                  <div className="mt-3 border-l-2 border-lacquer pl-3">
                    <p className={s.kind === "edit" || s.kind === "report" ? "whitespace-pre-line" : "text-lg"}>{s.value}</p>
                    {s.value_gloss && <p className="text-sm text-inkSoft">{s.value_gloss}</p>}
                    {sense?.definition_en && (
                      <p className="mt-1 meta text-inkFaint">
                        {L("for the sense: ", "針對這個意思：")}{sense.definition_en}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
                    <form action={approveSuggestion}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="entry_id" value={s.entry_id} />
                      <SubmitButton pending="…" className={`${btn} border-lacquer bg-lacquer text-paper hover:opacity-90 disabled:opacity-60`}>
                        {/* An edit is made by hand in the entry editor;
                            approving it only marks it done. */}
                        {s.kind === "edit" || s.kind === "report" ? L("✓ Done", "✓ 完成") : L("✓ Publish", "✓ 刊出")}
                      </SubmitButton>
                    </form>
                    {(s.kind === "edit" || s.kind === "report") && (
                      <Link href={`/editor/edit/${s.entry_id}`} className={`${btn} border-rule text-inkSoft hover:border-ink hover:text-ink`}>
                        {L("Edit the entry", "編輯詞條")}
                      </Link>
                    )}
                    <form action={rejectSuggestion} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="entry_id" value={s.entry_id} />
                      <label htmlFor={`snote-${s.id}`} className="sr-only">{L("Reason for rejection", "退回原因")}</label>
                      <input
                        id={`snote-${s.id}`}
                        name="note"
                        placeholder={L("Reason (optional)", "原因（選填）")}
                        className="rounded-sm border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-lacquer placeholder:text-inkFaint"
                      />
                      <SubmitButton pending="…" className={`${btn} border-rule text-inkSoft hover:border-ink hover:text-ink disabled:opacity-60`}>
                        {L("✕ Reject", "✕ 退回")}
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {pendingRecs.length > 0 && (
        <section className="space-y-3">
          <h2 className="meta text-lacquer">
            {pendingRecs.length === 1
              ? L("1 recording to listen to", "1 段錄音待聽")
              : L("{n} recordings to listen to", "{n} 段錄音待聽", { n: pendingRecs.length })}
          </h2>
          <div className="grid gap-3">
            {pendingRecs.map((r: any) => {
              const { entry: e, contributor: c } = r;
              const origin = formatOrigin(r.origin_area, r.origin_locality);
              return (
                <div key={r.id} className="rounded-sm border border-rule bg-surface p-4">
                  <div className="flex flex-wrap items-baseline gap-3">
                    {e?.hanzi && <span className="font-display text-xl font-bold">{e.hanzi}</span>}
                    <Link
                      href={e?.status === "approved" ? `/entry/${r.entry_id}` : `/editor/edit/${r.entry_id}`}
                      className="romanization font-display font-semibold text-lacquer hover:underline"
                    >
                      {e?.romanization || e?.headword}
                    </Link>
                    {origin && <span className={chip}>{origin}</span>}
                    {r.status === "approved" && (
                      <span className="rounded-sm meta px-2 py-0.5 text-lacquer ring-1 ring-lacquer" title={L("Went live when it was saved (trust window); not yet checked", "儲存時就已上線（信任期間）；尚未審核")}>
                        {L("live", "已上線")}
                      </span>
                    )}
                    <span className="ml-auto meta text-inkFaint">
                      <LocalTime iso={r.created_at} time />
                      {c?.display_name ? ` · ${c.display_name}` : ""}
                    </span>
                  </div>
                  {(() => {
                    /* What the take should say. The word itself: its English
                       meanings, numbered when there are several. A sentence
                       take: the sentence of the meaning it belongs to, and
                       its translation. */
                    const recSenses: any[] = sortSenses(e?.senses ?? []);
                    if (r.kind === "example") {
                      const s = recSenses.find((x) => x.id === r.sense_id) ?? recSenses.find((x) => x.example);
                      if (!s?.example && !s?.definition_en) return null;
                      return (
                        <p className="mt-2 text-sm text-inkSoft">
                          <span className="meta mr-2 text-inkFaint">{L("sentence", "例句")}</span>
                          {s.example && <span className="romanization text-ink">{s.example}</span>}
                          {s.example_gloss && <span> — {s.example_gloss}</span>}
                          {!s.example && s.definition_en && <span>{L("for “{d}”", "對應「{d}」", { d: s.definition_en })}</span>}
                        </p>
                      );
                    }
                    const glosses = recSenses.map((x) => x.definition_en).filter(Boolean);
                    if (!glosses.length) return null;
                    return (
                      <p className="mt-2 text-sm text-inkSoft">
                        {glosses.length === 1
                          ? glosses[0]
                          : glosses.map((g, i) => (
                              <span key={i}>
                                {i > 0 && " · "}
                                <span className="tabular-nums text-inkFaint">{i + 1}.</span> {g}
                              </span>
                            ))}
                      </p>
                    );
                  })()}
                  <div className="mt-3"><PlayButton src={r.audio_url} label={`${e?.romanization || e?.headword || L("recording", "錄音")}${c?.display_name ? L(", recorded by {name}", "，由 {name} 錄音", { name: c.display_name }) : ""}`} /></div>
                  {r.speaker_name && (
                    <p className="mt-2 meta text-inkSoft">{L("said by {speaker}, recorded by {name}", "由 {speaker} 發音，{name} 錄音", { speaker: r.speaker_name, name: c?.display_name || L("the contributor", "貢獻者") })}</p>
                  )}
                  {r.note && (
                    <p className="romanization mt-2 text-sm text-inkSoft">{r.note}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
                    <form action={approveRecording}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="entry_id" value={r.entry_id} />
                      <SubmitButton pending="…" className={`${btn} border-lacquer bg-lacquer text-paper hover:opacity-90 disabled:opacity-60`}>
                        {r.status === "approved" ? L("✓ Keep", "✓ 保留") : L("✓ Publish", "✓ 刊出")}
                      </SubmitButton>
                    </form>
                    <form action={rejectRecording} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="entry_id" value={r.entry_id} />
                      <label htmlFor={`rnote-${r.id}`} className="sr-only">{L("Reason for rejection", "退回原因")}</label>
                      <input
                        id={`rnote-${r.id}`}
                        name="note"
                        placeholder={L("Reason (optional)", "原因（選填）")}
                        className="rounded-sm border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-lacquer placeholder:text-inkFaint"
                      />
                      <SubmitButton pending="…" className={`${btn} border-rule text-inkSoft hover:border-ink hover:text-ink disabled:opacity-60`}>
                        {r.status === "approved" ? L("✕ Take down", "✕ 撤下") : L("✕ Reject", "✕ 退回")}
                      </SubmitButton>
                    </form>
                    {/* Reject keeps the row; this removes it and its file. */}
                    <DeleteRecording id={r.id} back="/editor" className="ml-auto" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {waiting === 0 ? (
        !anyFailed && (
          <div className="rounded-sm border border-rule bg-surface p-8 text-inkSoft">
            {L("Nothing waiting for review.", "目前沒有待審的項目。")}
          </div>
        )
      ) : pending.length === 0 ? null : (
        <div className="grid gap-4">
          {pending.map((e: any) => {
            const senses: Sense[] = sortSenses(e.senses);
            const origin = formatOrigin(e.origin_area, e.origin_locality) || e.variety;
            return (
              <div key={e.id} className="rounded-sm border border-rule bg-surface p-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  {e.hanzi && <span className="font-display text-2xl font-bold">{e.hanzi}</span>}
                  <span className="romanization font-display text-lg font-semibold text-lacquer">
                    {e.romanization || e.headword}
                  </span>
                  {e.ipa && <span className="text-sm text-inkFaint">/{e.ipa}/</span>}
                  {origin && <span className={chip}>{origin}</span>}
                  {dupes.has(e.id) && (
                    <span className="rounded-sm meta border border-lacquer px-1.5 py-0.5 text-lacquer">{L("Possible duplicate", "可能重複")}</span>
                  )}
                  <span className="ml-auto meta text-inkFaint">
                    <LocalTime iso={e.created_at} time />
                    {" · "}
                    {e.contributor?.id ? (
                      <Link href={`/contributor/${e.contributor.id}`} className="hover:text-lacquer">
                        {e.contributor.display_name ?? L("unknown", "不明")}
                      </Link>
                    ) : (
                      L("unknown", "不明")
                    )}
                  </span>
                </div>

                {dupes.has(e.id) && (
                  <p className="mt-2 text-sm text-inkSoft">
                    {L("Already in the dictionary: ", "辭典裡已有：")}
                    {dupes.get(e.id)!.map((m, i) => (
                      <span key={m.id}>
                        {i > 0 && ", "}
                        <Link href={`/entry/${m.id}`} target="_blank" className="text-lacquer hover:underline">
                          {m.hanzi ? `${m.hanzi} ` : ""}
                          <span className="romanization">{m.romanization || m.headword}</span>
                        </Link>
                      </span>
                    ))}
                  </p>
                )}

                {e.audio_url && <div className="mt-3"><PlayButton src={e.audio_url} label={L("{w}, submitted recording", "{w}，投稿的錄音", { w: e.romanization || e.headword })} /></div>}

                <ol className="mt-3 space-y-1">
                  {senses.map((s, i) => (
                    <li key={s.id} className="text-sm">
                      <span className="text-inkFaint tabular-nums">{i + 1}.</span>{" "}
                      {s.part_of_speech && <em className="text-lacquer">{L(s.part_of_speech, POS_ZH[s.part_of_speech] ?? s.part_of_speech)} </em>}
                      {s.definition_en}
                      {s.gloss_zh && <span className="text-inkSoft"> · {s.gloss_zh}</span>}
                      {s.example && <span className="romanization text-inkSoft">—{s.example}</span>}
                    </li>
                  ))}
                </ol>

                {e.notes && <p className="mt-3 text-sm text-inkSoft">{L("Notes: ", "附註：")}{e.notes}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
                  <form action={approve}>
                    <input type="hidden" name="id" value={e.id} />
                    <SubmitButton pending="…" className={`${btn} border-lacquer bg-lacquer text-paper hover:opacity-90 disabled:opacity-60`}>
                      {L("✓ Approve", "✓ 核准")}
                    </SubmitButton>
                  </form>
                  <form action={reject} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={e.id} />
                    <label htmlFor={`note-${e.id}`} className="sr-only">{L("Reason for rejection", "退回原因")}</label>
                    <input
                      id={`note-${e.id}`}
                      name="note"
                      placeholder={L("Reason (optional)", "原因（選填）")}
                      className="rounded-sm border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-lacquer placeholder:text-inkFaint"
                    />
                    <SubmitButton pending="…" className={`${btn} border-rule text-inkSoft hover:border-ink hover:text-ink disabled:opacity-60`}>
                      {L("✕ Reject", "✕ 退回")}
                    </SubmitButton>
                  </form>
                  <Link
                    href={`/editor/edit/${e.id}`}
                    className="meta text-lacquer hover:underline"
                  >
                    {L("Edit", "編輯")}
                  </Link>
                  <DeleteEntry id={e.id} back="/editor" className="ml-auto" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

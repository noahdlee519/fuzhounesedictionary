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
import { translator } from "@/lib/i18n";
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

export const metadata: Metadata = {
  title: "Review",
  robots: { index: false, follow: false },
};

const chip =
  "rounded-sm meta text-inkSoft ring-1 ring-rule px-2 py-0.5";
const btn =
  "rounded-sm border px-4 py-1.5 meta transition-[color,background-color,border-color,opacity,transform] active:scale-[.97]";

export default async function AdminPage() {
  const { user, profile } = await getSessionUser();

  const t = translator(getLang());

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
        <span className="font-medium text-ink">{what} could not be loaded.</span>{" "}
        {missingTable(e) ? (
          <>
            The database does not have that table yet: run{" "}
            <code className="text-[13px]">supabase/{file}</code> in the Supabase SQL
            editor and reload.
          </>
        ) : (
          <>Please reload in a moment. ({e.message})</>
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
          {waiting} waiting
        </span>
      </div>

      {problem("Suggestions", "suggestions.sql", sugError)}
      {problem("Recordings", "recordings.sql", recError)}
      {problem("Words", "schema.sql", error)}

      {pendingSugs.length > 0 && (
        <section className="space-y-3">
          <h2 className="meta text-lacquer">
            {pendingSugs.length} suggestion{pendingSugs.length === 1 ? "" : "s"} to read
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
                    <span className={s.kind === "report" ? "rounded-sm meta text-lacquer ring-1 ring-lacquer px-2 py-0.5" : chip}>{s.kind === "edit" ? "suggested edit" : s.kind === "report" ? "report" : s.kind}</span>
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
                        for the sense: {sense.definition_en}
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
                        {s.kind === "edit" || s.kind === "report" ? "✓ Done" : "✓ Publish"}
                      </SubmitButton>
                    </form>
                    {(s.kind === "edit" || s.kind === "report") && (
                      <Link href={`/editor/edit/${s.entry_id}`} className={`${btn} border-rule text-inkSoft hover:border-ink hover:text-ink`}>
                        Edit the entry
                      </Link>
                    )}
                    <form action={rejectSuggestion} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="entry_id" value={s.entry_id} />
                      <label htmlFor={`snote-${s.id}`} className="sr-only">Reason for rejection</label>
                      <input
                        id={`snote-${s.id}`}
                        name="note"
                        placeholder="Reason (optional)"
                        className="rounded-sm border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-lacquer placeholder:text-inkFaint"
                      />
                      <SubmitButton pending="…" className={`${btn} border-rule text-inkSoft hover:border-ink hover:text-ink disabled:opacity-60`}>
                        ✕ Reject
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
            {pendingRecs.length} recording{pendingRecs.length === 1 ? "" : "s"} to listen to
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
                      <span className="rounded-sm meta px-2 py-0.5 text-lacquer ring-1 ring-lacquer" title="Went live when it was saved (trust window); not yet checked">
                        live
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
                          <span className="meta mr-2 text-inkFaint">sentence</span>
                          {s.example && <span className="romanization text-ink">{s.example}</span>}
                          {s.example_gloss && <span> — {s.example_gloss}</span>}
                          {!s.example && s.definition_en && <span>for “{s.definition_en}”</span>}
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
                  <div className="mt-3"><PlayButton src={r.audio_url} label={`${e?.romanization || e?.headword || "recording"}${c?.display_name ? `, recorded by ${c.display_name}` : ""}`} /></div>
                  {r.speaker_name && (
                    <p className="mt-2 meta text-inkSoft">said by {r.speaker_name}, recorded by {c?.display_name || "the contributor"}</p>
                  )}
                  {r.note && (
                    <p className="romanization mt-2 text-sm text-inkSoft">{r.note}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
                    <form action={approveRecording}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="entry_id" value={r.entry_id} />
                      <SubmitButton pending="…" className={`${btn} border-lacquer bg-lacquer text-paper hover:opacity-90 disabled:opacity-60`}>
                        {r.status === "approved" ? "✓ Keep" : "✓ Publish"}
                      </SubmitButton>
                    </form>
                    <form action={rejectRecording} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="entry_id" value={r.entry_id} />
                      <label htmlFor={`rnote-${r.id}`} className="sr-only">Reason for rejection</label>
                      <input
                        id={`rnote-${r.id}`}
                        name="note"
                        placeholder="Reason (optional)"
                        className="rounded-sm border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-lacquer placeholder:text-inkFaint"
                      />
                      <SubmitButton pending="…" className={`${btn} border-rule text-inkSoft hover:border-ink hover:text-ink disabled:opacity-60`}>
                        {r.status === "approved" ? "✕ Take down" : "✕ Reject"}
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
            Nothing waiting for review.
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
                    <span className="rounded-sm meta border border-lacquer px-1.5 py-0.5 text-lacquer">Possible duplicate</span>
                  )}
                  <span className="ml-auto meta text-inkFaint">
                    <LocalTime iso={e.created_at} time />
                    {" · "}
                    {e.contributor?.id ? (
                      <Link href={`/contributor/${e.contributor.id}`} className="hover:text-lacquer">
                        {e.contributor.display_name ?? "unknown"}
                      </Link>
                    ) : (
                      "unknown"
                    )}
                  </span>
                </div>

                {dupes.has(e.id) && (
                  <p className="mt-2 text-sm text-inkSoft">
                    Already in the dictionary:{" "}
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

                {e.audio_url && <div className="mt-3"><PlayButton src={e.audio_url} label={`${e.romanization || e.headword}, submitted recording`} /></div>}

                <ol className="mt-3 space-y-1">
                  {senses.map((s, i) => (
                    <li key={s.id} className="text-sm">
                      <span className="text-inkFaint tabular-nums">{i + 1}.</span>{" "}
                      {s.part_of_speech && <em className="text-lacquer">{s.part_of_speech} </em>}
                      {s.definition_en}
                      {s.gloss_zh && <span className="text-inkSoft"> · {s.gloss_zh}</span>}
                      {s.example && <span className="romanization text-inkSoft">—{s.example}</span>}
                    </li>
                  ))}
                </ol>

                {e.notes && <p className="mt-3 text-sm text-inkSoft">Notes: {e.notes}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
                  <form action={approve}>
                    <input type="hidden" name="id" value={e.id} />
                    <SubmitButton pending="…" className={`${btn} border-lacquer bg-lacquer text-paper hover:opacity-90 disabled:opacity-60`}>
                      ✓ Approve
                    </SubmitButton>
                  </form>
                  <form action={reject} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={e.id} />
                    <label htmlFor={`note-${e.id}`} className="sr-only">Reason for rejection</label>
                    <input
                      id={`note-${e.id}`}
                      name="note"
                      placeholder="Reason (optional)"
                      className="rounded-sm border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-lacquer placeholder:text-inkFaint"
                    />
                    <SubmitButton pending="…" className={`${btn} border-rule text-inkSoft hover:border-ink hover:text-ink disabled:opacity-60`}>
                      ✕ Reject
                    </SubmitButton>
                  </form>
                  <Link
                    href={`/editor/edit/${e.id}`}
                    className="meta text-lacquer hover:underline"
                  >
                    Edit
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

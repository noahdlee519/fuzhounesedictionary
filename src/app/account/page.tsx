import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInButton from "@/components/SignInButton";
import Avatar from "@/components/Avatar";
import AvatarUpload from "@/components/AvatarUpload";
import SavedNotice from "@/components/SavedNotice";
import SubmitButton from "@/components/SubmitButton";
import RecordingByRow, { type RecordingByRowProps } from "@/components/RecordingByRow";
import { saveProfile } from "./actions";
import { ORIGIN_AREAS, ORIGIN_GROUPS, formatOrigin } from "@/lib/origins";
import type { Metadata } from "next";
import { STATUS_STYLE } from "@/lib/status";
import { firstSense, one, sortSenses } from "@/lib/entries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

const labelCls = "block font-mono text-xs uppercase tracking-[0.1em] text-inkFaint";
const inputCls =
  "mt-1 w-full border border-rule bg-surface px-3 py-2 outline-none focus:border-lacquer placeholder:text-inkFaint";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { saved?: string; problem?: string; show?: string };
}) {
  const { user } = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">My account</h1>
        <p className="text-inkSoft">Sign in to see the words you&apos;ve contributed.</p>
        <div className="flex justify-center"><SignInButton next="/account" /></div>
      </div>
    );
  }

  const supabase = createClient();

  // Profile, words and recordings are independent; fetched together.
  const [{ data: profile }, { data, error: entriesError }, { data: recData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, origin_area, origin_locality, origin_precision, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("entries")
      .select("id, headword, hanzi, romanization, status, review_notes, created_at, senses(id, definition_en, part_of_speech, sort)")
      .eq("contributor_id", user.id)
      .order("created_at", { ascending: false }),
    // Everything else this person has contributed, not just their first word.
    supabase
      .from("recordings")
      .select("id, kind, audio_url, status, note, created_at, entry:entries(id, headword, hanzi, romanization, status, senses(definition_en, sort))")
      .eq("contributor_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const entries = data ?? [];
  const recordings: RecordingByRowProps[] = (recData ?? []).map((r: any) => ({
    ...r,
    entry: one(r.entry),
  }));

  // Every meaning on every word this person added, newest word first, in the
  // order the meanings appear on the entry page.
  const meanings = entries.flatMap((e: any) =>
    sortSenses<any>(e.senses).map((sense: any) => ({ ...sense, entry: e }))
  );

  // Which list the tiles are showing. The tiles are links, so this survives a
  // refresh and needs no JavaScript.
  const show = (["words", "meanings", "recordings"] as const).find((k) => k === searchParams.show) ?? "words";

  const since = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long" })
    : null;

  const precision = profile?.origin_precision ?? "hidden";
  const publicLine = formatOrigin(profile?.origin_area, profile?.origin_locality);

  return (
    <div className="space-y-10">
      <div className="space-y-4 border-b border-rule pb-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.display_name}
            size={64}
            className="ring-1 ring-rule"
          />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
              {profile?.display_name || "My account"}
            </h1>
            <p className="truncate text-sm text-inkFaint">{user.email}</p>
            <p className="text-sm text-inkFaint">
              {since && <span>Member since {since}</span>}
              {since && <span aria-hidden> · </span>}
              <Link href={`/contributor/${user.id}`} className="transition-colors hover:text-lacquer">
                View profile →
              </Link>
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <form action="/auth/signout" method="post">
              <button className="font-mono text-xs uppercase tracking-[0.1em] text-inkFaint transition-colors hover:text-lacquer">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <AvatarUpload userId={user.id} hasAvatar={!!profile?.avatar_url} />
      </div>

      {/* ---- contributions: three tiles that double as tabs ---------------- */}
      <section className="space-y-4">
        <nav aria-label="Your contributions" className="grid grid-cols-3 gap-3">
          {[
            { key: "words", n: entries.length, label: entries.length === 1 ? "word added" : "words added" },
            { key: "meanings", n: meanings.length, label: meanings.length === 1 ? "meaning" : "meanings" },
            { key: "recordings", n: recordings.length, label: recordings.length === 1 ? "recording" : "recordings" },
          ].map((t) => {
            const active = show === t.key;
            return (
              <Link
                key={t.key}
                href={`/account?show=${t.key}`}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={
                  "block border bg-surface p-4 text-center transition-colors " +
                  (active
                    ? "border-lacquer"
                    : "border-rule hover:border-lacquer")
                }
              >
                <div className="font-display text-3xl font-bold tabular-nums text-lacquer">{t.n}</div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-inkFaint">
                  {t.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {show === "words" && (
          entriesError ? (
            <p className="border-l-2 border-lacquer bg-surface p-4 text-sm text-inkSoft">
              Your words could not be loaded just now. Please check back shortly.
            </p>
          ) : entries.length === 0 ? (
            <div className="border border-rule bg-surface p-8 text-center">
              <p className="text-inkSoft">You haven&apos;t added any words yet.</p>
              <Link href="/submit" className="mt-2 inline-block font-medium text-lacquer hover:underline">Add your first word →</Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {entries.map((e: any) => {
                const first = firstSense<any>(e.senses);
                const body = (
                  <div className="flex items-baseline gap-3">
                    {e.hanzi && <span className="font-display text-xl font-bold">{e.hanzi}</span>}
                    <span className="romanization font-display font-semibold text-lacquer">{e.romanization || e.headword}</span>
                    <span className={`ml-auto font-mono text-[11px] uppercase tracking-wide ring-1 px-2 py-0.5 ${STATUS_STYLE[e.status]}`}>
                      {e.status}
                    </span>
                  </div>
                );
                return (
                  <div key={e.id} className="border border-rule bg-surface p-4">
                    {e.status === "approved" ? <Link href={`/entry/${e.id}`}>{body}</Link> : body}
                    {first && <p className="mt-1 text-sm text-inkSoft">{first.definition_en}</p>}
                    {e.status === "rejected" && e.review_notes && (
                      <p className="mt-2 text-sm text-inkFaint">Editor note: {e.review_notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {show === "meanings" && (
          meanings.length === 0 ? (
            <div className="border border-rule bg-surface p-8 text-center">
              <p className="text-inkSoft">No meanings yet.</p>
              <Link href="/submit" className="mt-2 inline-block font-medium text-lacquer hover:underline">Add a word →</Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {meanings.map((m: any) => {
                const e = m.entry;
                const body = (
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    {e.hanzi && <span className="font-display text-xl font-bold">{e.hanzi}</span>}
                    <span className="romanization font-display font-semibold text-lacquer">{e.romanization || e.headword}</span>
                    {m.part_of_speech && (
                      <span className="font-mono text-[11px] uppercase tracking-wide text-inkFaint">{m.part_of_speech}</span>
                    )}
                    <span className={`ml-auto font-mono text-[11px] uppercase tracking-wide ring-1 px-2 py-0.5 ${STATUS_STYLE[e.status]}`}>
                      {e.status}
                    </span>
                  </div>
                );
                return (
                  <div key={m.id} className="border border-rule bg-surface p-4">
                    {e.status === "approved" ? <Link href={`/entry/${e.id}`}>{body}</Link> : body}
                    <p className="mt-1 text-sm text-inkSoft">{m.definition_en}</p>
                  </div>
                );
              })}
            </div>
          )
        )}

        {show === "recordings" && (
          recordings.length === 0 ? (
            <div className="border border-rule bg-surface p-8 text-center">
              <p className="text-inkSoft">You haven&apos;t recorded anything yet.</p>
              <Link href="/improve" className="mt-2 inline-block font-medium text-lacquer hover:underline">
                Record a word &rarr;
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {recordings.map((r) => <RecordingByRow key={r.id} recording={r} showStatus />)}
            </div>
          )
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4 border-t border-rule pt-8">
        <div>
          <h2 className="font-display text-lg font-bold uppercase tracking-tight">Your Fuzhounese</h2>
          <p className="mt-1 max-w-2xl text-sm text-inkSoft">
            Fuzhounese changes from county to county and village to village, so knowing where a word
            comes from is part of the record. Tell us where yours is from and it will be offered as
            the default when you add a word. This is optional, and nothing appears publicly unless you
            choose it below.
          </p>
        </div>

        <form action={saveProfile} className="space-y-4 border border-rule bg-surface p-5">
          <label className="block">
            <span className={labelCls}>Display name</span>
            <input
              name="display_name"
              defaultValue={profile?.display_name ?? ""}
              placeholder="How you want to be credited"
              className={inputCls}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>County or district</span>
              <select name="origin_area" defaultValue={profile?.origin_area ?? ""} className={inputCls}>
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
              <span className={labelCls}>Town, village or neighbourhood</span>
              <input
                name="origin_locality"
                defaultValue={profile?.origin_locality ?? ""}
                placeholder="e.g. Jinfeng, or 金峰镇"
                className={inputCls}
              />
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className={labelCls}>What may we show publicly?</legend>
            {[
              ["hidden", "Nothing", "Your origin is not shown, and the village is not stored."],
              ["area", "County or district only", "e.g. “Changle 長樂”. The village is not stored."],
              ["locality", "County and village", "e.g. “Jinfeng, Changle 長樂”."],
            ].map(([value, title, note]) => (
              <label key={value} className="flex items-start gap-3">
                <input
                  type="radio"
                  name="origin_precision"
                  value={value}
                  defaultChecked={precision === value}
                  className="mt-1.5 accent-lacquer"
                />
                <span className="text-sm">
                  <span className="font-medium">{title}</span>
                  <span className="block text-inkFaint">{note}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {publicLine && (
            <p className="text-sm text-inkSoft">
              Currently shown on your profile: <span className="font-medium text-ink">{publicLine}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <SubmitButton
              pending="Saving…"
              className="border border-lacquer bg-lacquer px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-paper transition-colors hover:bg-transparent hover:text-lacquer disabled:opacity-60"
            >
              Save
            </SubmitButton>
            {searchParams.saved && <SavedNotice />}
            {searchParams.problem && (
              <span role="alert" className="text-sm text-lacquer">
                Your changes could not be saved just now. Please try again.
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

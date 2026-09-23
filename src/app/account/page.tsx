import { newApprovals, editorWelcome } from "@/lib/approvals";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInButton from "@/components/SignInButton";
import Avatar from "@/components/Avatar";
import AvatarUpload from "@/components/AvatarUpload";
import OriginPlaceFields from "@/components/OriginPlaceFields";
import SavedNotice from "@/components/SavedNotice";
import SubmitButton from "@/components/SubmitButton";
import SafeToggle from "@/components/SafeToggle";
import RecordingByRow, { type RecordingByRowProps } from "@/components/RecordingByRow";
import Pager from "@/components/Pager";
import { saveProfile, deleteAccount, dismissApprovals, dismissEditorWelcome } from "./actions";
import { formatOrigin } from "@/lib/origins";
import type { Metadata } from "next";
import { STATUS_STYLE } from "@/lib/status";
import { firstSense, one, sortSenses } from "@/lib/entries";
import { getSafe } from "@/lib/safe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

const labelCls = "field-label";
const inputCls = "field-input";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { saved?: string; problem?: string; show?: string; page?: string; withdrawn?: string };
}) {
  const { user } = await getSessionUser();
  const safe = getSafe();

  if (!user) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">My account</h1>
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
      .select("id, kind, audio_url, status, note, created_at, reviewed_at, entry:entries(id, headword, hanzi, romanization, status, senses(definition_en, sort))")
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

  // The recordings tab is paged in memory: the rows are already here for the
  // tile count, and a person's own list is bounded by the recording caps.
  const REC_PAGE = 20;
  const recPages = Math.max(1, Math.ceil(recordings.length / REC_PAGE));
  const recPage = Math.min(recPages, Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1));
  const recRows = recordings.slice((recPage - 1) * REC_PAGE, recPage * REC_PAGE);
  const recBack = `/account?show=recordings${recPage > 1 ? `&page=${recPage}` : ""}`;

  const since = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long" })
    : null;

  const precision = profile?.origin_precision ?? "hidden";
  const publicLine = formatOrigin(profile?.origin_area, profile?.origin_locality);

  // Anything of theirs an editor has approved since they last looked.
  const [news, welcome] = await Promise.all([newApprovals(user.id), editorWelcome(user.id)]);
  // Where the banner's link goes: the list with the most news in it.
  const newsShow = news.words ? "words" : news.recordings ? "recordings" : "words";

  return (
    <div className="space-y-10">
      {/* Made an editor: this one comes first. */}
      {welcome && (
        <div role="status" className="flex items-start gap-4 rounded-sm bg-lacquer px-5 py-4 text-paper">
          <p className="min-w-0 flex-1 text-[15px] leading-snug">
            <span className="font-semibold">Congratulations, you are now an editor.</span>{" "}
            Entries you write are published automatically, and you can review contributions{" "}
            <Link href="/contribute" className="underline underline-offset-2 hover:opacity-80">
              here
            </Link>
            .
          </p>
          <form action={dismissEditorWelcome}>
            <button
              type="submit"
              aria-label="Dismiss"
              className="-m-1 inline-flex h-8 w-8 items-center justify-center rounded-sm text-lg leading-none transition-colors hover:bg-white/15"
            >
              ×
            </button>
          </form>
        </div>
      )}

      {news.total > 0 && (
        <div role="status" className="flex items-start gap-4 rounded-sm bg-lacquer px-5 py-4 text-paper">
          <p className="min-w-0 flex-1 text-[15px] leading-snug">
            <span className="font-semibold">
              {news.total === 1 ? "1 of your edits was accepted" : `${news.total} of your edits were accepted`}
            </span>
            {" — thank you. "}
            <Link href={`/account?show=${newsShow}#contributions`} className="whitespace-nowrap underline underline-offset-2 hover:opacity-80">
              See your contributions
            </Link>
          </p>
          <form action={dismissApprovals}>
            <button
              type="submit"
              aria-label="Dismiss"
              className="-m-1 inline-flex h-8 w-8 items-center justify-center rounded-sm text-lg leading-none transition-colors hover:bg-white/15"
            >
              ×
            </button>
          </form>
        </div>
      )}

      <div className="border-b border-rule pb-5">
        <div className="flex flex-wrap items-start gap-4">
          {/* The picture with "Edit" under it, which opens it large with
              Change and a trash can (AvatarUpload). */}
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <Avatar
              src={profile?.avatar_url}
              name={profile?.display_name}
              size={64}
              className="ring-1 ring-rule"
            />
            <AvatarUpload userId={user.id} avatarUrl={profile?.avatar_url ?? null} name={profile?.display_name ?? null} />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {profile?.display_name || "My account"}
            </h1>
            <p className="truncate text-sm text-inkFaint">{user.email}</p>
            {since && <p className="text-sm text-inkFaint">Member since {since}</p>}
            <p className="text-sm">
              <Link href={`/contributor/${user.id}`} className="text-lacquer underline-offset-2 hover:underline">
                View profile
              </Link>
            </p>
          </div>
          {/* Sign out and the content filter, in the same small caps. On a
              phone they drop below the name together, on one line; from sm up
              they stack at the right, level with the name. */}
          <div className="flex w-full items-center gap-5 sm:ml-auto sm:w-auto sm:flex-col sm:items-end sm:gap-2.5 sm:pt-[10px]">
            <form action="/auth/signout" method="post">
              <button className="meta text-inkFaint transition-colors hover:text-lacquer">Sign out</button>
            </form>
            {/* Kept beside sign-out rather than down in the profile form: it
                is a setting for reading the dictionary, not something saved
                about you, and it takes effect the moment it is clicked. */}
            <SafeToggle on={safe} />
          </div>
        </div>
      </div>

      {/* ---- contributions: three tiles that double as tabs ---------------- */}
      <section id="contributions" className="scroll-mt-20 space-y-4">
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
                <div className="mt-1 meta text-inkFaint">
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
            <div className="border border-rule bg-surface p-8">
              <p className="text-inkSoft">You haven&apos;t added any words yet.</p>
              <Link href="/add" className="mt-2 inline-block font-medium text-lacquer hover:underline">Add your first word</Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {entries.map((e: any) => {
                const first = firstSense<any>(e.senses);
                const body = (
                  <div className="flex items-baseline gap-3">
                    {e.hanzi && <span className="font-display text-xl font-bold">{e.hanzi}</span>}
                    <span className="romanization font-display font-semibold text-lacquer">{e.romanization || e.headword}</span>
                    <span className={`ml-auto meta ring-1 px-2 py-0.5 ${STATUS_STYLE[e.status]}`}>
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
            <div className="border border-rule bg-surface p-8">
              <p className="text-inkSoft">No meanings yet.</p>
              <Link href="/add" className="mt-2 inline-block font-medium text-lacquer hover:underline">Add a word</Link>
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
                      <span className="meta text-inkFaint">{m.part_of_speech}</span>
                    )}
                    <span className={`ml-auto meta ring-1 px-2 py-0.5 ${STATUS_STYLE[e.status]}`}>
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

        {show === "recordings" && (searchParams.saved || searchParams.problem || searchParams.withdrawn) && (
          <p className="flex items-center gap-3 border-l-2 border-lacquer bg-surface px-4 py-2 text-sm text-inkSoft">
            {searchParams.withdrawn ? (
              <SavedNotice message="Recording deleted" />
            ) : searchParams.saved ? (
              <SavedNotice message="Note saved" />
            ) : searchParams.problem === "withdraw" ? (
              <span role="alert">That recording could not be deleted. Please try again.</span>
            ) : (
              <span role="alert">The note could not be saved. Please try again.</span>
            )}
          </p>
        )}

        {show === "recordings" && (
          recordings.length === 0 ? (
            <div className="border border-rule bg-surface p-8">
              <p className="text-inkSoft">You haven&apos;t recorded anything yet.</p>
              <Link href="/improve" className="mt-2 inline-block font-medium text-lacquer hover:underline">
                Record a word &rarr;
              </Link>
            </div>
          ) : (
            <div id="recordings" className="scroll-mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {recRows.map((r) => (
                  <RecordingByRow key={r.id} recording={r} showStatus editableNote back={recBack} />
                ))}
              </div>
              <Pager
                page={recPage}
                totalPages={recPages}
                basePath="/account"
                params={{ show: "recordings" }}
                anchor="recordings"
              />
            </div>
          )
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4 border-t border-rule pt-8">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">Your Fuzhounese</h2>
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

          <OriginPlaceFields
            area={profile?.origin_area ?? ""}
            locality={profile?.origin_locality ?? ""}
            labelCls={labelCls}
            inputCls={inputCls}
          />

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
              className="btn btn-primary btn-sm"
            >
              Save
            </SubmitButton>
            {searchParams.saved && show !== "recordings" && <SavedNotice />}
            {searchParams.problem && searchParams.problem !== "confirm" && show !== "recordings" && (
              <span role="alert" className="text-sm text-lacquer">
                Your changes could not be saved just now. Please try again.
              </span>
            )}
          </div>
        </form>
      </section>

      {/* ---- delete account ------------------------------------------------ */}
      <section id="delete" className="scroll-mt-3 space-y-3 border-t border-rule pt-8">
        <h2 className="font-display text-lg font-bold tracking-tight">Delete your account</h2>
        <p className="max-w-2xl text-sm text-inkSoft">
          This removes your profile, your email, your picture, and any words still waiting for
          review or rejected. Words and meanings already published stay in the dictionary under its
          licence, credited to &ldquo;a contributor&rdquo; instead of your name. Your recordings
          stay too unless you tick the box. This cannot be undone.
        </p>
        {searchParams.problem === "confirm" && (
          <p role="alert" className="text-sm text-lacquer">
            Type the word &ldquo;delete&rdquo; in the box to confirm.
          </p>
        )}
        <details className="group">
          <summary className="btn btn-ghost btn-sm inline-flex cursor-pointer list-none group-open:border-lacquer group-open:text-lacquer [&::-webkit-details-marker]:hidden [&::marker]:content-['']">
            Delete my account…
          </summary>
          <form action={deleteAccount} className="mt-3 max-w-md space-y-3 rounded-sm border border-lacquer bg-surface p-4">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="recordings" className="mt-1 accent-lacquer" />
              <span>
                Also delete my recordings
                <span className="block text-inkFaint">Every take, published or not, and the audio files.</span>
              </span>
            </label>
            <label className="block text-sm">
              <span className={labelCls}>Type &ldquo;delete&rdquo; to confirm</span>
              <input
                name="confirm"
                required
                autoComplete="off"
                placeholder="delete"
                className={inputCls}
              />
            </label>
            <SubmitButton
              pending="Deleting…"
              className="btn btn-primary btn-sm"
            >
              Delete my account for good
            </SubmitButton>
          </form>
        </details>
      </section>
    </div>
  );
}

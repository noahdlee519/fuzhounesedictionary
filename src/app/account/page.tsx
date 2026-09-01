import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignInButton from "@/components/SignInButton";
import Avatar from "@/components/Avatar";
import AvatarUpload from "@/components/AvatarUpload";
import SavedNotice from "@/components/SavedNotice";
import { saveProfile } from "./actions";
import { ORIGIN_AREAS, ORIGIN_GROUPS, formatOrigin } from "@/lib/origins";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

const STATUS_STYLE: Record<string, string> = {
  pending: "text-amber-700 ring-amber-600/40 dark:text-amber-300",
  approved: "text-lacquer ring-lacquer",
  rejected: "text-inkFaint ring-rule",
};

const labelCls = "block font-mono text-xs uppercase tracking-[0.1em] text-inkFaint";
const inputCls =
  "mt-1 w-full border border-rule bg-surface px-3 py-2 outline-none focus:border-lacquer placeholder:text-inkFaint";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { saved?: string };
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, origin_area, origin_locality, origin_precision")
    .eq("id", user.id)
    .maybeSingle();

  const { data } = await supabase
    .from("entries")
    .select("id, headword, hanzi, romanization, status, review_notes, created_at, senses(definition_en, sort)")
    .eq("contributor_id", user.id)
    .order("created_at", { ascending: false });

  const entries = data ?? [];
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
            <Link
              href={`/contributor/${user.id}`}
              className="text-sm text-inkFaint transition-colors hover:text-lacquer"
            >
              View profile →
            </Link>
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

      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
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
            <button className="border border-lacquer bg-lacquer px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-paper transition-colors hover:bg-transparent hover:text-lacquer">
              Save
            </button>
            {searchParams.saved && <SavedNotice />}
          </div>
        </form>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3">
        <h2 className="border-t border-rule pt-5 font-display text-lg font-bold uppercase tracking-tight">
          My submissions
        </h2>

        {entries.length === 0 ? (
          <div className="border border-rule bg-surface p-8 text-center">
            <p className="text-inkSoft">You haven&apos;t added any words yet.</p>
            <Link href="/submit" className="mt-2 inline-block font-medium text-lacquer hover:underline">Add your first word →</Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {entries.map((e: any) => {
              const first = [...(e.senses ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))[0];
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
        )}
      </section>
    </div>
  );
}

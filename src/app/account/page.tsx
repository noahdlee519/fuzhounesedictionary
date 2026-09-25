import { newApprovals, editorWelcome, editorInvite } from "@/lib/approvals";
import EditorInviteBanner from "@/components/EditorInviteBanner";
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
import { saveProfile, deleteAccount, dismissApprovals, dismissEditorWelcome, dismissEditorInvite } from "./actions";
import { formatOrigin } from "@/lib/origins";
import type { Metadata } from "next";
import { STATUS_STYLE, statusLabel } from "@/lib/status";
import { firstSense, one, sortSenses } from "@/lib/entries";
import { getSafe } from "@/lib/safe";
import { getLang } from "@/lib/lang";
import { pick, type Pick } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const L = pick(getLang());
  return {
    title: L("My account", "我的帳號"),
    robots: { index: false, follow: false },
  };
}

const labelCls = "field-label";
const inputCls = "field-input";

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
const posLabel = (L: Pick, p: string) => L(p, POS_ZH[p] ?? p);

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { saved?: string; problem?: string; show?: string; page?: string; withdrawn?: string };
}) {
  const { user } = await getSessionUser();
  const safe = getSafe();
  const lang = getLang();
  const L = pick(lang);

  if (!user) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{L("My account", "我的帳號")}</h1>
        <p className="text-inkSoft">{L("Sign in to see the words you've contributed.", "登入即可查看你貢獻的詞。")}</p>
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
    ? new Date(profile.created_at).toLocaleDateString(lang === "zh" ? "zh-TW" : "en-GB", { year: "numeric", month: "long" })
    : null;

  const precision = profile?.origin_precision ?? "hidden";
  const publicLine = formatOrigin(profile?.origin_area, profile?.origin_locality);

  // Anything of theirs an editor has approved since they last looked.
  const [news, welcome, invite] = await Promise.all([newApprovals(user.id), editorWelcome(user.id), editorInvite(user.id)]);
  // Where the banner's link goes: the list with the most news in it.
  const newsShow = news.words ? "words" : news.recordings ? "recordings" : "words";

  return (
    <div className="space-y-10">
      {/* Made an editor: this one comes first. */}
      {welcome && (
        <div role="status" className="flex items-start gap-4 rounded-sm bg-lacquer px-5 py-4 text-paper">
          <p className="min-w-0 flex-1 text-[15px] leading-snug">
            <span className="font-semibold">{L("Congratulations, you are now an editor.", "恭喜，你現在是編輯了。")}</span>{L(" ", "")}
            {L("Entries you write are published automatically, and you can review contributions ", "你寫的詞條會自動刊出，也可以在")}
            <Link href="/contribute" className="underline underline-offset-2 hover:opacity-80">
              {L("here", "這裡")}
            </Link>
            {L(".", "審核大家的貢獻。")}
          </p>
          <form action={dismissEditorWelcome}>
            <button
              type="submit"
              aria-label={L("Dismiss", "關閉")}
              className="-m-1 inline-flex h-8 w-8 items-center justify-center rounded-sm text-lg leading-none transition-colors hover:bg-white/15"
            >
              ×
            </button>
          </form>
        </div>
      )}

      {/* 25 recordings or 10 words: would they like to be an editor? */}
      {invite && <EditorInviteBanner recordings={invite.recordings} words={invite.words} dismiss={dismissEditorInvite} />}

      {news.total > 0 && (
        <div role="status" className="flex items-start gap-4 rounded-sm bg-lacquer px-5 py-4 text-paper">
          <p className="min-w-0 flex-1 text-[15px] leading-snug">
            <span className="font-semibold">
              {news.total === 1
                ? L("1 of your edits was accepted", "你有 1 項修改已獲核准")
                : L("{n} of your edits were accepted", "你有 {n} 項修改已獲核准", { n: news.total })}
            </span>
            {L(" — thank you. ", "——謝謝你！")}
            <Link href={`/account?show=${newsShow}#contributions`} className="whitespace-nowrap underline underline-offset-2 hover:opacity-80">
              {L("See your contributions", "查看你的貢獻")}
            </Link>
          </p>
          <form action={dismissApprovals}>
            <button
              type="submit"
              aria-label={L("Dismiss", "關閉")}
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
              {profile?.display_name || L("My account", "我的帳號")}
            </h1>
            <p className="truncate text-sm text-inkFaint">{user.email}</p>
            {since && <p className="text-sm text-inkFaint">{L("Member since {since}", "{since}加入", { since })}</p>}
            <p className="text-sm">
              <Link href={`/contributor/${user.id}`} className="text-lacquer underline-offset-2 hover:underline">
                {L("View profile", "查看個人頁面")}
              </Link>
            </p>
          </div>
          {/* Sign out and the content filter, in the same small caps. On a
              phone they drop below the name together, on one line; from sm up
              they stack at the right, level with the name. */}
          <div className="flex w-full items-center gap-5 sm:ml-auto sm:w-auto sm:flex-col sm:items-end sm:gap-2.5 sm:pt-[10px]">
            <form action="/auth/signout" method="post">
              <button className="meta text-inkFaint transition-colors hover:text-lacquer">{L("Sign out", "登出")}</button>
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
        <nav aria-label={L("Your contributions", "你的貢獻")} className="grid grid-cols-3 gap-3">
          {[
            { key: "words", n: entries.length, label: entries.length === 1 ? L("word added", "個新增的詞") : L("words added", "個新增的詞") },
            { key: "meanings", n: meanings.length, label: meanings.length === 1 ? L("meaning", "個意思") : L("meanings", "個意思") },
            { key: "recordings", n: recordings.length, label: recordings.length === 1 ? L("recording", "段錄音") : L("recordings", "段錄音") },
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
            <p className="rounded-sm border-l-2 border-lacquer bg-surface p-4 text-sm text-inkSoft">
              {L("Your words could not be loaded just now. Please check back shortly.", "目前無法載入你的詞，請稍後再試。")}
            </p>
          ) : entries.length === 0 ? (
            <div className="rounded-sm border border-rule bg-surface p-8">
              <p className="text-inkSoft">{L("You haven't added any words yet.", "你還沒有新增任何詞。")}</p>
              <Link href="/add" className="mt-2 inline-block font-medium text-lacquer hover:underline">{L("Add your first word", "新增你的第一個詞")}</Link>
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
                      {statusLabel(e.status, lang)}
                    </span>
                  </div>
                );
                return (
                  <div key={e.id} className="rounded-sm border border-rule bg-surface p-4">
                    {e.status === "approved" ? <Link href={`/entry/${e.id}`}>{body}</Link> : body}
                    {first && <p className="mt-1 text-sm text-inkSoft">{first.definition_en}</p>}
                    {e.status === "rejected" && e.review_notes && (
                      <p className="mt-2 text-sm text-inkFaint">{L("Editor note: ", "編輯附註：")}{e.review_notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {show === "meanings" && (
          meanings.length === 0 ? (
            <div className="rounded-sm border border-rule bg-surface p-8">
              <p className="text-inkSoft">{L("No meanings yet.", "還沒有任何意思。")}</p>
              <Link href="/add" className="mt-2 inline-block font-medium text-lacquer hover:underline">{L("Add a word", "新增詞條")}</Link>
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
                      <span className="meta text-inkFaint">{posLabel(L, m.part_of_speech)}</span>
                    )}
                    <span className={`ml-auto meta ring-1 px-2 py-0.5 ${STATUS_STYLE[e.status]}`}>
                      {statusLabel(e.status, lang)}
                    </span>
                  </div>
                );
                return (
                  <div key={m.id} className="rounded-sm border border-rule bg-surface p-4">
                    {e.status === "approved" ? <Link href={`/entry/${e.id}`}>{body}</Link> : body}
                    <p className="mt-1 text-sm text-inkSoft">{m.definition_en}</p>
                  </div>
                );
              })}
            </div>
          )
        )}

        {show === "recordings" && (searchParams.saved || searchParams.problem || searchParams.withdrawn) && (
          <p className="rounded-sm flex items-center gap-3 border-l-2 border-lacquer bg-surface px-4 py-2 text-sm text-inkSoft">
            {searchParams.withdrawn ? (
              <SavedNotice message={L("Recording deleted", "錄音已刪除")} />
            ) : searchParams.saved ? (
              <SavedNotice message={L("Note saved", "附註已儲存")} />
            ) : searchParams.problem === "withdraw" ? (
              <span role="alert">{L("That recording could not be deleted. Please try again.", "無法刪除那段錄音，請再試一次。")}</span>
            ) : (
              <span role="alert">{L("The note could not be saved. Please try again.", "無法儲存附註，請再試一次。")}</span>
            )}
          </p>
        )}

        {show === "recordings" && (
          recordings.length === 0 ? (
            <div className="rounded-sm border border-rule bg-surface p-8">
              <p className="text-inkSoft">{L("You haven't recorded anything yet.", "你還沒有任何錄音。")}</p>
              <Link href="/improve" className="mt-2 inline-block font-medium text-lacquer hover:underline">
                {L("Record a word →", "錄一個詞 →")}
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
          <h2 className="font-display text-lg font-bold tracking-tight">{L("Your Fuzhounese", "你的福州話")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-inkSoft">
            {L(
              "Fuzhounese changes from county to county and village to village, so knowing where a word comes from is part of the record. Tell us where yours is from and it will be offered as the default when you add a word. This is optional, and nothing appears publicly unless you choose it below.",
              "福州話每個縣、每個村講法都不一樣，所以一個詞來自哪裡，也是記錄的一部分。告訴我們你的福州話來自哪裡，新增詞條時就會預先填好。這一項可以不填；除非你在下面選擇公開，否則什麼都不會公開顯示。"
            )}
          </p>
        </div>

        <form action={saveProfile} className="rounded-sm space-y-4 border border-rule bg-surface p-5">
          <label className="block">
            <span className={labelCls}>{L("Display name", "顯示名稱")}</span>
            <input
              name="display_name"
              defaultValue={profile?.display_name ?? ""}
              placeholder={L("How you want to be credited", "你希望以什麼名字署名")}
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
            <legend className={labelCls}>{L("What may we show publicly?", "可以公開顯示哪些資訊？")}</legend>
            {[
              ["hidden", L("Nothing", "不顯示"), L("Your origin is not shown, and the village is not stored.", "不顯示你的來源，也不儲存鄉鎮／村。")],
              ["area", L("County or district only", "只顯示縣或區"), L("e.g. “Changle 長樂”. The village is not stored.", "例如「Changle 長樂」。不儲存鄉鎮／村。")],
              ["locality", L("County and village", "顯示縣／區和鄉鎮／村"), L("e.g. “Jinfeng, Changle 長樂”.", "例如「Jinfeng, Changle 長樂」。")],
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
              {L("Currently shown on your profile: ", "目前在你的個人頁面上顯示：")}<span className="font-medium text-ink">{publicLine}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <SubmitButton
              pending={L("Saving…", "儲存中…")}
              className="btn btn-primary btn-sm"
            >
              {L("Save", "儲存")}
            </SubmitButton>
            {searchParams.saved && show !== "recordings" && <SavedNotice message={L("Changes saved", "已儲存變更")} />}
            {searchParams.problem && searchParams.problem !== "confirm" && show !== "recordings" && (
              <span role="alert" className="text-sm text-lacquer">
                {L("Your changes could not be saved just now. Please try again.", "目前無法儲存你的變更，請再試一次。")}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* ---- delete account ------------------------------------------------ */}
      <section id="delete" className="scroll-mt-3 space-y-3 border-t border-rule pt-8">
        <h2 className="font-display text-lg font-bold tracking-tight">{L("Delete your account", "刪除帳號")}</h2>
        <p className="max-w-2xl text-sm text-inkSoft">
          {L(
            "This removes your profile, your email, your picture, and any words still waiting for review or rejected. Words and meanings already published stay in the dictionary under its licence, credited to “a contributor” instead of your name. Your recordings stay too unless you tick the box. This cannot be undone.",
            "這會刪除你的個人資料、電子郵件、頭像，以及所有仍在待審或已退回的詞。已刊出的詞和意思會依辭典的授權條款繼續保留，署名改為「一位貢獻者」，不再顯示你的名字。除非你勾選下面的方框，否則你的錄音也會保留。刪除後無法復原。"
          )}
        </p>
        {searchParams.problem === "confirm" && (
          <p role="alert" className="text-sm text-lacquer">
            {L("Type the word “delete” in the box to confirm.", "請在方框中輸入「delete」以確認。")}
          </p>
        )}
        <details className="group">
          <summary className="btn btn-ghost btn-sm inline-flex cursor-pointer list-none group-open:border-lacquer group-open:text-lacquer [&::-webkit-details-marker]:hidden [&::marker]:content-['']">
            {L("Delete my account…", "刪除我的帳號…")}
          </summary>
          <form action={deleteAccount} className="mt-3 max-w-md space-y-3 rounded-sm border border-lacquer bg-surface p-4">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="recordings" className="mt-1 accent-lacquer" />
              <span>
                {L("Also delete my recordings", "同時刪除我的錄音")}
                <span className="block text-inkFaint">{L("Every take, published or not, and the audio files.", "每一段錄音（無論是否已刊出）及其音檔。")}</span>
              </span>
            </label>
            <label className="block text-sm">
              <span className={labelCls}>{L("Type “delete” to confirm", "輸入「delete」以確認")}</span>
              <input
                name="confirm"
                required
                autoComplete="off"
                placeholder="delete"
                className={inputCls}
              />
            </label>
            <SubmitButton
              pending={L("Deleting…", "刪除中…")}
              className="btn btn-primary btn-sm"
            >
              {L("Delete my account for good", "永久刪除我的帳號")}
            </SubmitButton>
          </form>
        </details>
      </section>
    </div>
  );
}

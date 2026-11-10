import Link from "next/link";
import SignInButton from "./SignInButton";
import SubmitButton from "./SubmitButton";
import LocalTime from "./LocalTime";
import { addComment, deleteComment } from "@/app/entry/actions";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

/* Comments on a word page (supabase/comments.sql): what people think of the
   word or of one of its recordings — "my grandmother says it with a falling
   tone", "this is how they say it in Fuqing too". Shown oldest first, each
   saying which recording it is about, if any. Live when posted; editors read
   them afterwards from the Review page.

   No JavaScript: the form is a plain form to a server action, and choosing a
   recording to comment on is a link (?on=<recording id>) from that
   recording's row. The text is shown as text, never as HTML or links. */

export interface CommentRow {
  id: string;
  body: string;
  created_at: string;
  recording_id: string | null;
  author: { id: string; display_name: string | null } | null;
}

export default function Comments({
  entryId,
  comments,
  viewerId,
  isEditor,
  recordingLabel,
  on,
  status,
}: {
  entryId: string;
  comments: CommentRow[];
  viewerId: string | null;
  isEditor: boolean;
  /** "the recording by Mei", by recording id — for the line over a comment. */
  recordingLabel: (recordingId: string) => string | null;
  /** The recording the form is set to comment on, from ?on=. */
  on: string | null;
  /** From the address after posting: "sent", "empty", or an error message. */
  status?: string;
}) {
  const L = pick(getLang());
  const here = `/entry/${entryId}`;
  const onLabel = on ? recordingLabel(on) : null;
  const target = onLabel ? on : null;
  const error = status && status !== "sent" ? (status === "empty" ? L("Write something first.", "請先寫點內容。") : status) : null;

  return (
    <section id="comments" className="scroll-mt-20 space-y-4">
      <h2 className="meta text-inkFaint">
        {comments.length
          ? L("Comments ({n})", "留言（{n}）", { n: comments.length })
          : L("Comments", "留言")}
      </h2>

      {comments.length > 0 && (
        <ul className="space-y-3">
          {comments.map((c) => {
            const about = c.recording_id ? recordingLabel(c.recording_id) : null;
            const mine = Boolean(viewerId && c.author?.id === viewerId);
            return (
              <li key={c.id} id={`comment-${c.id}`} className="rounded-sm border border-rule p-4">
                <p className="meta flex flex-wrap items-baseline gap-x-2 text-inkFaint">
                  {c.author ? (
                    <Link href={`/contributor/${c.author.id}`} className="font-semibold text-inkSoft hover:text-lacquer">
                      {c.author.display_name || L("a contributor", "一位貢獻者")}
                    </Link>
                  ) : (
                    <span>{L("a contributor", "一位貢獻者")}</span>
                  )}
                  <LocalTime iso={c.created_at} time />
                  {about && <span>· {L("on {r}", "關於{r}", { r: about })}</span>}
                </p>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink [overflow-wrap:anywhere]">{c.body}</p>
                {(mine || isEditor) && (
                  <form action={deleteComment} className="mt-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="back" value={`${here}#comments`} />
                    <SubmitButton pending="…" className="meta text-inkFaint hover:text-lacquer">
                      {mine ? L("Delete my comment", "刪除我的留言") : L("Delete", "刪除")}
                    </SubmitButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {viewerId ? (
        // Keyed on the count, so the box empties once a comment has posted.
        <form key={comments.length} action={addComment} className="space-y-2">
          <input type="hidden" name="entry_id" value={entryId} />
          {target && <input type="hidden" name="recording_id" value={target} />}
          <label htmlFor="comment-body" className="block text-sm text-inkSoft">
            {onLabel ? (
              <>
                {L("Comment on {r}", "留言給{r}", { r: onLabel })}{" "}
                <Link href={`${here}#comments`} className="text-lacquer hover:underline">
                  {L("(or on the word)", "（或留言給這個詞）")}
                </Link>
              </>
            ) : comments.length ? (
              L("Add a comment", "新增留言")
            ) : (
              L("Share what you think of this word or its recordings", "分享你對這個詞或它的錄音的看法")
            )}
          </label>
          <textarea
            id="comment-body"
            name="body"
            required
            maxLength={1000}
            rows={3}
            className="rounded-sm w-full border border-rule bg-paper px-3 py-2 text-[15px] outline-none focus:border-lacquer"
          />
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton pending={L("Posting…", "送出中…")} className="btn btn-primary btn-sm">
              {L("Post comment", "送出留言")}
            </SubmitButton>
            {status === "sent" && <span role="status" className="text-sm text-inkSoft">{L("Posted.", "已送出。")}</span>}
            {error && <span role="alert" className="text-sm text-lacquer">{error.slice(0, 200)}</span>}
          </div>
        </form>
      ) : (
        <SignInButton
          next={`${here}#comments`}
          label={L("Sign in to comment", "登入後留言")}
          className="text-sm text-lacquer hover:underline [&>svg]:hidden"
        />
      )}
    </section>
  );
}

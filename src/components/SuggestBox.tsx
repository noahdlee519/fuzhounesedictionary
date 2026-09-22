import { suggest } from "@/app/improve/actions";
import SubmitButton from "./SubmitButton";
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

/* A gap chip that opens a form in place.

   Built on <details>/<summary> rather than a click handler, so it works with no
   JavaScript at all and the chip is a real button to a keyboard and a screen
   reader. Same pattern as the sections on /learn. */

export interface SenseOption {
  id: string;
  definition_en: string | null;
}

const chipCls =
  "inline-block cursor-pointer list-none border px-2 py-0.5 meta " +
  "transition-colors [&::-webkit-details-marker]:hidden [&::marker]:content-['']";

const fieldCls =
  "mt-1 w-full border border-rule bg-paper px-3 py-2 text-sm outline-none " +
  "focus:border-lacquer placeholder:text-inkFaint";

const labelCls = "block meta text-inkFaint";

export default function SuggestBox({
  kind,
  entryId,
  senses = [],
  pending = false,
  page,
  origin,
  need,
}: {
  kind: "ipa" | "example";
  entryId: string;
  senses?: SenseOption[];
  pending?: boolean;
  /** Current list position, echoed back so the redirect lands on the same page. */
  page?: number;
  origin?: string;
  need?: string;
}) {
  const isIpa = kind === "ipa";
  const L = pick(getLang());

  if (pending) {
    return (
      <span className="inline-block border border-rule px-2 py-0.5 meta text-inkFaint">
        {isIpa ? L("your IPA · awaiting review", "你的 IPA · 審核中") : L("your example · awaiting review", "你的例句 · 審核中")}
      </span>
    );
  }

  return (
    <details className="group inline-block align-baseline">
      <summary
        className={`${chipCls} border-rule text-inkFaint hover:border-lacquer hover:text-lacquer group-open:border-lacquer group-open:text-lacquer`}
      >
        {isIpa ? L("+ add IPA", "+ 補上 IPA") : L("+ add example", "+ 補上例句")}
      </summary>

      <form
        action={suggest}
        className="mt-2 max-w-md space-y-3 border border-rule bg-paper p-4 font-sans normal-case tracking-normal"
      >
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="entry_id" value={entryId} />
        {page && page > 1 && <input type="hidden" name="page" value={page} />}
        {origin && <input type="hidden" name="origin" value={origin} />}
        {need && <input type="hidden" name="need" value={need} />}

        {isIpa ? (
          <label className="block">
            <span className={labelCls}>{L("Pronunciation in IPA", "IPA 發音")}</span>
            <input
              name="value"
              required
              maxLength={500}
              placeholder="/sɛiʔ˥/"
              className={`${fieldCls}`}
            />
            <span className="mt-1 block text-xs text-inkFaint">
              {L("Write what you hear, in your own variety. An editor checks it before it appears.", "照你聽到的、用你自己的口音寫下來。經編輯審核後才會刊出。")}
            </span>
          </label>
        ) : (
          <>
            {senses.length > 1 ? (
              <label className="block">
                <span className={labelCls}>{L("Which meaning", "哪一個意思")}</span>
                <select name="sense_id" required className={fieldCls} defaultValue={senses[0]?.id}>
                  {senses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.definition_en ?? L("this meaning", "這個意思")}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <input type="hidden" name="sense_id" value={senses[0]?.id ?? ""} />
            )}

            <label className="block">
              <span className={labelCls}>{L("A sentence using the word", "用這個詞造一個句子")}</span>
              <input
                name="value"
                required
                maxLength={500}
                placeholder="Nguāi ô sĕk buōng cṳ̆."
                className={fieldCls}
              />
            </label>

            <label className="block">
              <span className={labelCls}>{L("What it means in English", "英文意思")}</span>
              <input
                name="value_gloss"
                maxLength={500}
                placeholder="I have ten books."
                className={fieldCls}
              />
            </label>

            <p className="text-xs text-inkFaint">
              {L("Write a sentence you would actually say. An editor checks it before it appears.", "寫一句你平常真的會講的話。經編輯審核後才會刊出。")}
            </p>
          </>
        )}

        <SubmitButton
          pending={L("Sending…", "送出中…")}
          className="border border-lacquer bg-lacquer px-3 py-1.5 meta text-paper transition-[color,background-color,border-color,transform] active:scale-[.97] hover:bg-transparent hover:text-lacquer disabled:opacity-60"
        >
          {L("Send for review", "送交審核")}
        </SubmitButton>
      </form>
    </details>
  );
}

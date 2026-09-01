import { suggest } from "@/app/improve/actions";
import SubmitButton from "./SubmitButton";

/* A gap chip that opens a form in place.

   Built on <details>/<summary> rather than a click handler, so it works with no
   JavaScript at all and the chip is a real button to a keyboard and a screen
   reader. Same pattern as the sections on /learn. */

export interface SenseOption {
  id: string;
  definition_en: string | null;
}

const chipCls =
  "inline-block cursor-pointer list-none border px-2 py-0.5 font-mono text-[11px] uppercase " +
  "tracking-wide transition-colors [&::-webkit-details-marker]:hidden [&::marker]:content-['']";

const fieldCls =
  "mt-1 w-full border border-rule bg-paper px-3 py-2 text-sm outline-none " +
  "focus:border-lacquer placeholder:text-inkFaint";

const labelCls = "block font-mono text-[11px] uppercase tracking-[0.1em] text-inkFaint";

export default function SuggestBox({
  kind,
  entryId,
  senses = [],
  pending = false,
  page,
  origin,
}: {
  kind: "ipa" | "example";
  entryId: string;
  senses?: SenseOption[];
  pending?: boolean;
  /** Current list position, echoed back so the redirect lands on the same page. */
  page?: number;
  origin?: string;
}) {
  const isIpa = kind === "ipa";

  if (pending) {
    return (
      <span className="inline-block border border-rule px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-inkFaint">
        your {isIpa ? "IPA" : "example"} · awaiting review
      </span>
    );
  }

  return (
    <details className="group inline-block align-baseline">
      <summary
        className={`${chipCls} border-rule text-inkFaint hover:border-lacquer hover:text-lacquer group-open:border-lacquer group-open:text-lacquer`}
      >
        + add {isIpa ? "IPA" : "example"}
      </summary>

      <form
        action={suggest}
        className="mt-2 max-w-md space-y-3 border border-rule bg-paper p-4 font-sans normal-case tracking-normal"
      >
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="entry_id" value={entryId} />
        {page && page > 1 && <input type="hidden" name="page" value={page} />}
        {origin && <input type="hidden" name="origin" value={origin} />}

        {isIpa ? (
          <label className="block">
            <span className={labelCls}>Pronunciation in IPA</span>
            <input
              name="value"
              required
              maxLength={500}
              placeholder="/sɛiʔ˥/"
              className={`${fieldCls} font-mono`}
            />
            <span className="mt-1 block text-xs text-inkFaint">
              Write what you hear, in your own variety. An editor checks it before it appears.
            </span>
          </label>
        ) : (
          <>
            {senses.length > 1 ? (
              <label className="block">
                <span className={labelCls}>Which meaning</span>
                <select name="sense_id" required className={fieldCls} defaultValue={senses[0]?.id}>
                  {senses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.definition_en ?? "this meaning"}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <input type="hidden" name="sense_id" value={senses[0]?.id ?? ""} />
            )}

            <label className="block">
              <span className={labelCls}>A sentence using the word</span>
              <input
                name="value"
                required
                maxLength={500}
                placeholder="Nguāi ô sĕk buōng cṳ̆."
                className={fieldCls}
              />
            </label>

            <label className="block">
              <span className={labelCls}>What it means in English</span>
              <input
                name="value_gloss"
                maxLength={500}
                placeholder="I have ten books."
                className={fieldCls}
              />
            </label>

            <p className="text-xs text-inkFaint">
              Write a sentence you would actually say. An editor checks it before it appears.
            </p>
          </>
        )}

        <SubmitButton
          pending="Sending…"
          className="border border-lacquer bg-lacquer px-3 py-1.5 font-mono text-xs uppercase tracking-[0.1em] text-paper transition-colors hover:bg-transparent hover:text-lacquer disabled:opacity-60"
        >
          Send for review
        </SubmitButton>
      </form>
    </details>
  );
}

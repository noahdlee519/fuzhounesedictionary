/* A small "i" in running text with an explanation under it, on hover or
   keyboard focus: the site's one tooltip (globals.css, .has-info /
   .info-tip). The panel is inside the trigger, so it opens right under the
   "i". The trigger is focusable and names the tip with aria-describedby, so
   a screen reader gets the explanation without the hover. */
import { getLang } from "@/lib/lang";
import { pick } from "@/lib/i18n";

export default function InfoTip({ id, text, label: given }: { id: string; text: string; label?: string }) {
  const label = given ?? pick(getLang())("More about this", "關於這一點");
  return (
    <span tabIndex={0} role="note" aria-label={label} aria-describedby={id} className="has-info info-inline outline-none">
      <span className="info-dot" aria-hidden="true">
        i
      </span>
      <span id={id} role="tooltip" className="info-tip">
        {text}
      </span>
    </span>
  );
}

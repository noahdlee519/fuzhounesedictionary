/* A small "i" in running text with an explanation under it, on hover or
   keyboard focus: the site's one tooltip (globals.css, .has-info /
   .info-tip). The panel is inside the trigger, so it opens right under the
   "i". The trigger is focusable and names the tip with aria-describedby, so
   a screen reader gets the explanation without the hover. */
export default function InfoTip({ id, text, label = "More about this" }: { id: string; text: string; label?: string }) {
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

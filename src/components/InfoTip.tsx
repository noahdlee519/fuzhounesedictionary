/* A small "i" in running text with an explanation on hover or keyboard
   focus. No JavaScript: the same CSS as the filter-chip tooltips
   (globals.css, .info-dot / .info-tip). The panel is anchored to the
   nearest positioned ancestor — give the paragraph `relative` — and hangs
   just below it at the left, so it stays inside the text column at every
   width. The dot is focusable and names the tip with aria-describedby, so a
   screen reader gets the explanation without the hover. */
export default function InfoTip({ id, text, label = "More about this" }: { id: string; text: string; label?: string }) {
  return (
    <>
      <span tabIndex={0} role="note" aria-label={label} aria-describedby={id} className="has-info inline-block outline-none">
        <span className="info-dot" aria-hidden="true">
          i
        </span>
      </span>
      <span id={id} role="tooltip" className="info-tip info-tip-left">
        {text}
      </span>
    </>
  );
}

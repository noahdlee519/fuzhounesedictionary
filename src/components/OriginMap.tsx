import { originArea } from "@/lib/origins";
import { ORIGIN_MAPS } from "./origin-maps";

/* Where a recording's speaker is from, as a thumbnail.

   Every mainland map is the same frame — the Fuzhou and Ningde prefectures,
   the Eastern Min area — so it is the position of the red mark that carries
   the meaning, the way it does on the About page. Elsewhere in Fujian draws
   the province, and an overseas contributor gets the world map. Built by
   scripts/make-origin-maps.py; the colours are the page's own, so the map
   follows the theme toggle.

   Hovering names the place, in the site's own tooltip panel rather than the
   browser's: a title attribute waits a second, cannot be styled, and would
   show a second tip on top of this one. */
export default function OriginMap({
  code,
  className = "",
}: {
  code: string | null | undefined;
  className?: string;
}) {
  if (!code) return null;
  const svg = ORIGIN_MAPS[code];
  const area = originArea(code);
  if (!svg || !area) return null;

  const label = `${area.label} ${area.hanzi}`;
  return (
    <span className={`has-map block h-9 w-9 shrink-0 ${className}`}>
      <span
        role="img"
        aria-label={label}
        className="block h-full w-full [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <span role="tooltip" className="info-tip">
        {label}
      </span>
    </span>
  );
}

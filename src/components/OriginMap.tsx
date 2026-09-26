import { originArea } from "@/lib/origins";
import { ORIGIN_MAPS } from "./origin-maps";

/* Where a recording's speaker is from, as a thumbnail.

   Every mainland map is the same frame — the Fuzhou and Ningde prefectures,
   the Eastern Min area — so it is the position of the red mark that carries
   the meaning, the way it does on the About page. Elsewhere in Fujian draws
   the province, and an overseas contributor gets the world map. Built by
   scripts/make-origin-maps.py; the colours are the page's own, so the map
   follows the theme toggle.

   It stands exactly as tall as the vote buttons beside it (MAP_HEIGHT, the
   same 26px VoteButtons sets; Noah, 26 Sep 2026), and each map's viewBox is
   cropped to what is drawn, so the land reaches the top and bottom. The
   width follows the map's own shape: narrow for the Fuzhou–Ningde frame,
   wide for the world.

   Hovering names the place, in the site's own tooltip panel rather than the
   browser's: a title attribute waits a second, cannot be styled, and would
   show a second tip on top of this one. */
/** The vote buttons' height (VoteButtons: h-[26px]). */
export const MAP_HEIGHT = 26;

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
  const vb = svg.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)"/);
  const width = vb ? Math.round((MAP_HEIGHT * Number(vb[1])) / Number(vb[2])) : MAP_HEIGHT;
  return (
    <span className={`has-map block shrink-0 ${className}`} style={{ height: MAP_HEIGHT, width }}>
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

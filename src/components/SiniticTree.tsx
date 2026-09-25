/* The Chinese language family as a cladogram, beside the About page's
   story on landscape screens. One row per node, indented by depth, joined
   by rounded elbows. The ten groups are those of the Language Atlas of
   China; the Min branch is the coastal/inland split of Pan Maoding et al.
   (1963) as set out in Norman, Chinese (1988, p. 233), with Eastern Min's
   three subgroups, Houguan (which includes Fuzhou), Funing and Manjiang.
   The path from the root to
   Fuzhounese is drawn in lacquer. The other groups are tinted by where they
   are spoken — north, central, south — which is geography, not a claim
   about how the groups are related. Server-rendered SVG; the colours are
   the theme's variables, so it follows light and dark mode. */

type Zone = "north" | "central" | "south" | "min";
type Node = { zh?: string; en: string; zone?: Zone; path?: boolean; star?: boolean; children?: Node[] };

const TREE: Node = {
  zh: "漢語族",
  en: "Sinitic",
  path: true,
  children: [
    { zh: "官話", en: "Mandarin", zone: "north" },
    { zh: "晉語", en: "Jin", zone: "north" },
    { zh: "吳語", en: "Wu", zone: "central" },
    { zh: "徽語", en: "Hui", zone: "central" },
    { zh: "贛語", en: "Gan", zone: "central" },
    { zh: "湘語", en: "Xiang", zone: "central" },
    { zh: "客家話", en: "Hakka", zone: "south" },
    { zh: "粵語", en: "Yue", zone: "south" },
    { zh: "平話", en: "Pinghua", zone: "south" },
    {
      zh: "閩語",
      en: "Min",
      zone: "min",
      path: true,
      children: [
        {
          en: "Coastal Min",
          zone: "min",
          path: true,
          children: [
            { zh: "閩南", en: "Southern Min", zone: "min" },
            { zh: "雷州", en: "Leizhou", zone: "min" },
            { zh: "瓊文", en: "Hainanese", zone: "min" },
            { zh: "莆仙", en: "Puxian", zone: "min" },
            {
              zh: "閩東",
              en: "Eastern Min",
              zone: "min",
              path: true,
              children: [
                { zh: "福寧片", en: "Funing", zone: "min" },
                { zh: "蠻講", en: "Manjiang", zone: "min" },
                {
                  zh: "侯官片",
                  en: "Houguan",
                  zone: "min",
                  path: true,
                  children: [{ zh: "福州話", en: "Fuzhounese", zone: "min", path: true, star: true }],
                },
              ],
            },
          ],
        },
        {
          en: "Inland Min",
          zone: "min",
          children: [
            { zh: "閩北", en: "Northern Min", zone: "min" },
            { zh: "閩中", en: "Central Min", zone: "min" },
            { zh: "邵將", en: "Shao-Jiang", zone: "min" },
          ],
        },
      ],
    },
  ],
};

const COLOR: Record<Zone, string> = {
  north: "var(--ink-faint)",
  central: "var(--amber)",
  south: "var(--green)",
  min: "var(--lacquer)",
};

const ROW = 22;
const INDENT = 17;
const X0 = 7;
const Y0 = 12;

type Placed = { node: Node; depth: number; row: number; parent: number | null };

function flatten(n: Node, depth = 0, parent: number | null = null, out: Placed[] = []): Placed[] {
  const me = out.length;
  out.push({ node: n, depth, row: me, parent });
  for (const c of n.children ?? []) flatten(c, depth + 1, me, out);
  return out;
}

export default function SiniticTree({
  caption,
  legend,
  sources,
  sourcesLabel = "Sources",
  ariaLabel = "The Chinese language family: ten groups, with Min divided into coastal and inland Min; Fuzhounese is in the Houguan subgroup of Eastern Min, a coastal Min language.",
}: {
  caption: string;
  legend: { north: string; central: string; south: string; min: string };
  /** The works the caption names, as links. */
  sources: { label: string; href: string }[];
  /** The "i" button's name for screen readers. */
  sourcesLabel?: string;
  /** What the tree says, for screen readers. */
  ariaLabel?: string;
}) {
  const rows = flatten(TREE);
  const W = 300;
  const H = Y0 + (rows.length - 1) * ROW + 12;
  const x = (d: number) => X0 + d * INDENT;
  const y = (r: number) => Y0 + r * ROW;

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={ariaLabel}
        className="block h-auto w-full overflow-visible"
      >
        {/* Connectors first, so the dots sit on top of them. */}
        {rows.map((p) => {
          if (p.parent === null) return null;
          const par = rows[p.parent];
          const px = x(par.depth);
          const cx = x(p.depth);
          const cy = y(p.row);
          const r = 6;
          const on = p.node.path;
          return (
            <path
              key={`l${p.row}`}
              d={`M${px} ${y(par.row) + 4} V${cy - r} Q${px} ${cy} ${px + r} ${cy} H${cx - 4}`}
              fill="none"
              style={{
                stroke: on ? "var(--lacquer)" : "var(--rule-strong)",
                strokeWidth: on ? 1.6 : 1,
              }}
            />
          );
        })}
        {/* The lacquer path is drawn again over the grey, so where a grey
            elbow shares its trunk the red is not painted over. */}
        {rows.map((p) => {
          if (p.parent === null || !p.node.path) return null;
          const par = rows[p.parent];
          const px = x(par.depth);
          const cy = y(p.row);
          return (
            <path
              key={`p${p.row}`}
              d={`M${px} ${y(par.row) + 4} V${cy - 6} Q${px} ${cy} ${px + 6} ${cy} H${x(p.depth) - 4}`}
              fill="none"
              style={{ stroke: "var(--lacquer)", strokeWidth: 1.6 }}
            />
          );
        })}
        {rows.map((p) => {
          const n = p.node;
          const cx = x(p.depth);
          const cy = y(p.row);
          const c = n.zone ? COLOR[n.zone] : "var(--ink)";
          const inner = !!n.children && n.zone === "min" && !n.path; // Inland Min
          return (
            <g key={`n${p.row}`}>
              {n.star ? (
                <>
                  <circle cx={cx} cy={cy} r={7} style={{ fill: "var(--lacquer-soft)" }} />
                  <circle cx={cx} cy={cy} r={3.8} style={{ fill: "var(--lacquer)" }} />
                </>
              ) : n.children ? (
                <circle cx={cx} cy={cy} r={3.2} style={{ fill: "var(--paper)", stroke: n.path ? "var(--lacquer)" : inner ? c : "var(--ink)", strokeWidth: 1.4 }} />
              ) : (
                <circle cx={cx} cy={cy} r={3} style={{ fill: c, opacity: n.zone === "min" ? 0.55 : 0.9 }} />
              )}
              {/* One weight and one colour pair for every label (Chinese in
                  ink-soft, English fainter); only Fuzhounese stands out, bold
                  and red. The red line already marks the way to it. */}
              <text x={cx + 10} y={cy} dominantBaseline="central" style={{ fontSize: 12 }}>
                {n.zh && (
                  <tspan
                    className="font-han"
                    style={{
                      fontSize: n.star ? 14 : 12.5,
                      fontWeight: n.star ? 700 : 400,
                      fill: n.star ? "var(--lacquer)" : "var(--ink-soft)",
                    }}
                  >
                    {n.zh}
                  </tspan>
                )}
                <tspan
                  dx={n.zh ? 6 : 0}
                  style={{
                    fontSize: n.star ? 12.5 : 11.5,
                    fontWeight: n.star ? 700 : 400,
                    fill: n.star ? "var(--lacquer)" : n.zh ? "var(--ink-faint)" : "var(--ink-soft)",
                  }}
                >
                  {n.en}
                </tspan>
              </text>
            </g>
          );
        })}
      </svg>
      {/* The legend is the caption. The sources sit behind the small "i" at
          its end, in the site's one tooltip (globals.css .has-info), which
          stays open while the pointer moves onto its links. */}
      <figcaption className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-inkFaint">
        {(["north", "central", "south", "min"] as Zone[]).map((z) => (
          <span key={z} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: COLOR[z] }} />
            {legend[z]}
          </span>
        ))}
        <span className="has-info inline-flex">
          <button type="button" aria-label={sourcesLabel} aria-describedby="tree-sources" className="info-dot !ml-0">
            i
          </button>
          <span id="tree-sources" role="tooltip" className="info-tip">
            {caption}
            <span className="mt-2 block space-y-1">
              {sources.map((src) => (
                <a
                  key={src.href}
                  href={src.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-lacquer underline-offset-2 hover:underline"
                >
                  {src.label} ↗
                </a>
              ))}
            </span>
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

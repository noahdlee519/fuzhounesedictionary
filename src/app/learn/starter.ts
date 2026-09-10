import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Key } from "@/lib/i18n";

/* "Start here": fifty-odd everyday words on the Learn page, grouped the way
   a phrasebook groups them. Nothing here is written by hand except the list
   of characters: each word is looked up in the dictionary at render time, so
   the romanization, the gloss and the recording are whatever the entry has,
   and a word that is not in the dictionary (or not yet approved) is simply
   left out. The list was checked against the live dictionary on 10 Sep 2026;
   every character below had an approved entry then.

   Where the same characters head two entries (八 is both "eight" and "to
   know"), `pos` says which one is meant. */

interface Pick {
  hanzi: string;
  /** Part of speech of the first sense, when the characters are ambiguous. */
  pos?: string;
}

export interface StarterGroup {
  key: string;
  label: Key;
  words: Pick[];
}

export const STARTER: StarterGroup[] = [
  {
    key: "greetings",
    label: "learn.g.greetings",
    words: [{ hanzi: "食飯未" }, { hanzi: "汝好" }, { hanzi: "謝謝" }, { hanzi: "莫細膩" }, { hanzi: "對不住" }, { hanzi: "再見" }],
  },
  {
    key: "people",
    label: "learn.g.people",
    words: [{ hanzi: "我" }, { hanzi: "汝" }, { hanzi: "伊" }, { hanzi: "儂" }, { hanzi: "依媽" }, { hanzi: "依爸" }],
  },
  {
    key: "table",
    label: "learn.g.table",
    words: [{ hanzi: "食" }, { hanzi: "飯" }, { hanzi: "茶" }, { hanzi: "水" }, { hanzi: "魚" }, { hanzi: "鼎邊糊" }],
  },
  {
    key: "counting",
    label: "learn.g.counting",
    words: [
      { hanzi: "一" }, { hanzi: "二" }, { hanzi: "三" }, { hanzi: "四" }, { hanzi: "五" },
      { hanzi: "六" }, { hanzi: "七" }, { hanzi: "八", pos: "numeral" }, { hanzi: "九" }, { hanzi: "十" },
    ],
  },
  {
    key: "time",
    label: "learn.g.time",
    words: [{ hanzi: "今旦" }, { hanzi: "明旦" }, { hanzi: "今暝" }, { hanzi: "下晝" }, { hanzi: "中晝" }, { hanzi: "年" }],
  },
  {
    key: "places",
    label: "learn.g.places",
    words: [{ hanzi: "厝" }, { hanzi: "福州" }, { hanzi: "學堂" }, { hanzi: "店" }, { hanzi: "車" }, { hanzi: "錢" }],
  },
  {
    key: "doing",
    label: "learn.g.doing",
    words: [{ hanzi: "去" }, { hanzi: "來" }, { hanzi: "看" }, { hanzi: "講" }, { hanzi: "買" }, { hanzi: "睏" }],
  },
  {
    key: "describing",
    label: "learn.g.describing",
    words: [{ hanzi: "好" }, { hanzi: "大" }, { hanzi: "細" }, { hanzi: "新" }, { hanzi: "熱" }, { hanzi: "冷" }],
  },
  {
    key: "small",
    label: "learn.g.small",
    words: [{ hanzi: "是" }, { hanzi: "有" }, { hanzi: "無" }, { hanzi: "愛" }, { hanzi: "知" }, { hanzi: "什乇" }],
  },
];

export interface StarterWord {
  id: string;
  hanzi: string;
  romanization: string;
  gloss: string;
  /** The same meaning in Chinese, when the entry has one. */
  glossZh: string | null;
  audio: string | null;
}

export interface StarterSection {
  key: string;
  label: Key;
  words: StarterWord[];
}

function anon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** The starter words as they stand in the dictionary right now: only the
 *  groups that found at least two words, each word with its first meaning
 *  and its earliest approved recording. Public data, cached a minute. */
export const starterWords = unstable_cache(
  async (): Promise<StarterSection[]> => {
    const db = anon();
    if (!db) return [];
    const wanted = STARTER.flatMap((g) => g.words.map((w) => w.hanzi));
    const { data, error } = await db
      .from("entries")
      .select("id, hanzi, romanization, headword, audio_url, created_at, senses(definition_en, gloss_zh, part_of_speech, sort)")
      .eq("status", "approved")
      .in("hanzi", wanted);
    if (error || !data) return [];

    // Every approved entry for each set of characters, oldest first.
    const byHanzi = new Map<string, any[]>();
    for (const e of data as any[]) {
      const list = byHanzi.get(e.hanzi) ?? [];
      list.push(e);
      byHanzi.set(e.hanzi, list);
    }
    const senses = (e: any) => ([...(e.senses ?? [])] as any[]).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const firstSense = (e: any) => senses(e)[0] ?? null;
    /* The line under a word: its plainest meaning. A sense that opens with a
       usage label — "(literal) you OK" — gives way to one that does not
       ("hello"); a label that survives is dropped, so 依爸 reads "daddy"
       rather than "(face-to-face) daddy". Then the first meaning only:
       "to eat", not "to eat; to drink; to smoke". */
    const plainSense = (e: any) => {
      const all = senses(e);
      return all.find((x) => !/^\(/.test(x.definition_en ?? "")) ?? all[0] ?? null;
    };
    const plainGloss = (e: any) =>
      (plainSense(e)?.definition_en ?? "").replace(/^\([^)]*\)\s*/, "").split(";")[0].trim();
    const plainGlossZh = (e: any) => {
      const zh = (plainSense(e)?.gloss_zh ?? "").split(/[;；]/)[0].trim();
      return zh || null;
    };

    const chosen: { group: StarterGroup; entry: any }[] = [];
    for (const group of STARTER) {
      for (const pick of group.words) {
        const list = (byHanzi.get(pick.hanzi) ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at));
        if (!list.length) continue;
        const entry = pick.pos ? list.find((e) => firstSense(e)?.part_of_speech === pick.pos) ?? list[0] : list[0];
        chosen.push({ group, entry });
      }
    }

    // One recording per word, the earliest approved one, for the play button.
    const audio = new Map<string, string>();
    const ids = chosen.map((c) => c.entry.id);
    if (ids.length) {
      const { data: recs } = await db
        .from("recordings")
        .select("entry_id, audio_url, created_at")
        .eq("status", "approved")
        .in("entry_id", ids)
        .order("created_at", { ascending: true });
      for (const r of (recs ?? []) as any[]) if (!audio.has(r.entry_id)) audio.set(r.entry_id, r.audio_url);
    }

    const sections: StarterSection[] = STARTER.map((g) => ({
      key: g.key,
      label: g.label,
      words: chosen
        .filter((c) => c.group === g)
        .map(({ entry }) => ({
          id: entry.id,
          hanzi: entry.hanzi,
          romanization: entry.romanization || entry.headword,
          gloss: plainGloss(entry),
          glossZh: plainGlossZh(entry),
          audio: audio.get(entry.id) ?? entry.audio_url ?? null,
        })),
    }));
    return sections.filter((s) => s.words.length >= 2);
  },
  ["starter-words"],
  { revalidate: 60 }
);

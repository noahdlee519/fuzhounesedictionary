"use client";

import { useEffect, useState } from "react";
import { ORIGIN_AREAS, ORIGIN_GROUPS } from "@/lib/origins";
import type { Speaker } from "@/lib/audio-upload";
import { useL } from "./LangProvider";

/* "Who is speaking?" beside a take: Me, or someone else — a name as it
   should be shown and where their Fuzhounese is from. For the grandchild
   with the account and the grandmother with the language.

   The last "someone else" is remembered in this browser, so recording ten
   words with the same person means filling this in once. Nothing leaves the
   browser until a take is saved. */

const KEY = "fz:speaker";

/* Chinese for the place list's group headings, and for the few choices
   whose English label is a description rather than a place name — the same
   wording as the account page (OriginPlaceFields). */
const GROUP_ZH: Record<string, string> = {
  "Fuzhou city": "福州市區",
  "Fuzhou prefecture": "福州其他縣市",
  "Beyond Fuzhou": "福州以外",
};
const AREA_ZH: Record<string, string> = {
  fuzhou_unsure: "福州市區（不確定哪一區）",
  matsu: "馬祖（連江）",
  ningde: "寧德一帶（福寧）",
  fujian_other: "福建其他地方",
  overseas: "海外社群",
};

export function loadSpeaker(): Speaker | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v && typeof v.name === "string" && v.name.trim() ? { name: v.name, area: String(v.area ?? ""), locality: String(v.locality ?? "") } : null;
  } catch {
    return null;
  }
}

function storeSpeaker(s: Speaker | null) {
  try {
    if (s && s.name.trim()) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: they fill it in again next time */
  }
}

export default function SpeakerFields({
  value,
  onChange,
  disabled,
  idBase,
}: {
  /** null: the account holder is speaking. */
  value: Speaker | null;
  onChange: (s: Speaker | null) => void;
  disabled?: boolean;
  idBase: string;
}) {
  const L = useL();
  const other = value !== null;
  // The last someone-else, so switching back from "Me" restores it.
  const [last, setLast] = useState<Speaker>({ name: "", area: "", locality: "" });
  useEffect(() => {
    const s = loadSpeaker();
    if (s) setLast(s);
  }, []);

  const set = (s: Speaker | null) => {
    if (s) {
      setLast(s);
      storeSpeaker(s);
    }
    onChange(s);
  };

  return (
    <fieldset className="max-w-md space-y-2" disabled={disabled}>
      <legend className="meta text-inkFaint">{L("Who is speaking?", "誰在講？")}</legend>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={!other}
          onClick={() => onChange(null)}
          className={"chip" + (!other ? " chip-on" : "")}
        >
          {L("Me", "我")}
        </button>
        <button
          type="button"
          aria-pressed={other}
          onClick={() => set(last.name ? last : { name: "", area: "", locality: "" })}
          className={"chip" + (other ? " chip-on" : "")}
        >
          {L("Someone else", "其他人")}
        </button>
      </div>
      {other && (
        <div className="space-y-2 border-l-2 border-rule pl-3">
          <label className="block" htmlFor={`${idBase}-name`}>
            <span className="meta text-inkFaint">{L("Their name, as it should be shown", "對方的名字（公開顯示的寫法）")}</span>
            <input
              id={`${idBase}-name`}
              value={value.name}
              onChange={(e) => set({ ...value, name: e.target.value })}
              maxLength={60}
              placeholder={L("e.g. my grandmother, Ah Ma, Mei", "例如：我外婆、阿嬤、阿梅")}
              className="rounded-sm mt-1 w-full border border-rule bg-paper px-3 py-1.5 text-sm text-ink outline-none focus:border-lacquer focus-visible:outline-none placeholder:text-inkFaint"
            />
          </label>
          <label className="block" htmlFor={`${idBase}-area`}>
            <span className="meta text-inkFaint">{L("Where their Fuzhounese is from", "對方的福州話來自哪裡")}</span>
            <select
              id={`${idBase}-area`}
              value={value.area}
              onChange={(e) => set({ ...value, area: e.target.value })}
              className="rounded-sm mt-1 w-full border border-rule bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-lacquer focus-visible:outline-none"
            >
              <option value="">{L("Not sure", "不確定")}</option>
              {ORIGIN_GROUPS.map((g) => (
                <optgroup key={g} label={L(g, GROUP_ZH[g] ?? g)}>
                  {ORIGIN_AREAS.filter((a) => a.group === g).map((a) => (
                    <option key={a.code} value={a.code}>
                      {AREA_ZH[a.code] ? L(`${a.label} ${a.hanzi}`, AREA_ZH[a.code]) : `${a.label} ${a.hanzi}`}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <p className="text-xs text-inkFaint">
            {L(
              "Shown publicly with the recording. Please only record someone who is happy for it to be on the site.",
              "會和錄音一起公開顯示。請只錄願意讓錄音放上網站的人。"
            )}
          </p>
        </div>
      )}
    </fieldset>
  );
}

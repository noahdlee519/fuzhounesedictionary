"use client";

import { useEffect, useState } from "react";
import { ORIGIN_AREAS, ORIGIN_GROUPS } from "@/lib/origins";
import type { Speaker } from "@/lib/audio-upload";

/* "Who is speaking?" beside a take: Me, or someone else — a name as it
   should be shown and where their Fuzhounese is from. For the grandchild
   with the account and the grandmother with the language.

   The last "someone else" is remembered in this browser, so recording ten
   words with the same person means filling this in once. Nothing leaves the
   browser until a take is saved. */

const KEY = "fz:speaker";

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
      <legend className="meta text-inkFaint">Who is speaking?</legend>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={!other}
          onClick={() => onChange(null)}
          className={"chip" + (!other ? " chip-on" : "")}
        >
          Me
        </button>
        <button
          type="button"
          aria-pressed={other}
          onClick={() => set(last.name ? last : { name: "", area: "", locality: "" })}
          className={"chip" + (other ? " chip-on" : "")}
        >
          Someone else
        </button>
      </div>
      {other && (
        <div className="space-y-2 border-l-2 border-rule pl-3">
          <label className="block" htmlFor={`${idBase}-name`}>
            <span className="meta text-inkFaint">Their name, as it should be shown</span>
            <input
              id={`${idBase}-name`}
              value={value.name}
              onChange={(e) => set({ ...value, name: e.target.value })}
              maxLength={60}
              placeholder="e.g. my grandmother, Ah Ma, Mei"
              className="mt-1 w-full border border-rule bg-paper px-3 py-1.5 text-sm text-ink outline-none focus:border-lacquer focus-visible:outline-none placeholder:text-inkFaint"
            />
          </label>
          <label className="block" htmlFor={`${idBase}-area`}>
            <span className="meta text-inkFaint">Where their Fuzhounese is from</span>
            <select
              id={`${idBase}-area`}
              value={value.area}
              onChange={(e) => set({ ...value, area: e.target.value })}
              className="mt-1 w-full border border-rule bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-lacquer focus-visible:outline-none"
            >
              <option value="">Not sure</option>
              {ORIGIN_GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {ORIGIN_AREAS.filter((a) => a.group === g).map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.label} {a.hanzi}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <p className="text-xs text-inkFaint">
            Shown publicly with the recording. Please only record someone who is happy for it to be
            on the site.
          </p>
        </div>
      )}
    </fieldset>
  );
}

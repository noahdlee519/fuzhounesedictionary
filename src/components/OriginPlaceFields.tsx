"use client";

import { useState } from "react";
import { ORIGIN_AREAS, ORIGIN_GROUPS } from "@/lib/origins";
import { useL } from "./LangProvider";

/* Chinese for the list's group headings, and for the few choices whose
   English label is a description rather than a place name. Place names keep
   their "Changle 長樂" form in both languages. */
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

/* The two "where your Fuzhounese is from" fields, on the account page and in
   the prompt that asks for them (OriginGate). The second one's label follows
   the first: a town or village for somewhere in Fuzhou, but a city, region or
   country for someone in an overseas community.

   The county or district is required (Noah, 26 Sep 2026): every recording
   and word says where its Fuzhounese is from. The village stays optional. */
export default function OriginPlaceFields({
  area,
  locality,
  labelCls,
  inputCls,
}: {
  area: string;
  locality: string;
  labelCls: string;
  inputCls: string;
}) {
  const L = useL();
  const [chosen, setChosen] = useState(area);
  const overseas = chosen === "overseas";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className={labelCls}>{L("County or district", "縣／區")}</span>
        <select name="origin_area" required value={chosen} onChange={(e) => setChosen(e.target.value)} className={inputCls}>
          <option value="" disabled>
            {L("Choose…", "請選擇…")}
          </option>
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

      <label className="block">
        <span className={labelCls}>
          {overseas ? L("City, region or country", "城市、地區或國家") : L("Town, village or neighbourhood", "鄉鎮、村或社區")}
          <span className="font-normal tracking-normal text-inkFaint [font-variant-caps:normal]"> {L("(optional)", "（選填）")}</span>
        </span>
        <input
          name="origin_locality"
          defaultValue={locality}
          placeholder={overseas ? L("e.g. New York, or Sibu, Malaysia", "例如：紐約，或馬來西亞詩巫") : L("e.g. Jinfeng, or 金峰镇", "例如：金峰鎮，或 Jinfeng")}
          className={inputCls}
        />
      </label>
    </div>
  );
}

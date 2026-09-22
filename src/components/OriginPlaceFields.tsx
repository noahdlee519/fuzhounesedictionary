"use client";

import { useState } from "react";
import { ORIGIN_AREAS, ORIGIN_GROUPS } from "@/lib/origins";

/* The account page's two "where your Fuzhounese is from" fields. The second
   one's label follows the first: a town or village for somewhere in Fuzhou,
   but a city, region or country for someone in an overseas community. */
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
  const [chosen, setChosen] = useState(area);
  const overseas = chosen === "overseas";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className={labelCls}>County or district</span>
        <select name="origin_area" value={chosen} onChange={(e) => setChosen(e.target.value)} className={inputCls}>
          <option value="">Not specified</option>
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

      <label className="block">
        <span className={labelCls}>{overseas ? "City, region or country" : "Town, village or neighbourhood"}</span>
        <input
          name="origin_locality"
          defaultValue={locality}
          placeholder={overseas ? "e.g. New York, or Sibu, Malaysia" : "e.g. Jinfeng, or 金峰镇"}
          className={inputCls}
        />
      </label>
    </div>
  );
}

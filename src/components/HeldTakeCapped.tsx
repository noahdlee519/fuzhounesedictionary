"use client";

import { useEffect, useState } from "react";
import { heldTake, releaseTake } from "@/lib/held-take";
import { useL } from "./LangProvider";

/* Someone already at the per-word limit records again while signed out,
   chooses the take and signs in. Back on the word, the page shows the limit
   note instead of a recorder, so nothing picked up the held take: it sat in
   the browser, unsaved, with no word about it (audit, 26 Sep 2026). This
   says so and lets it go. */
export default function HeldTakeCapped({ entryId }: { entryId: string }) {
  const L = useL();
  const [dropped, setDropped] = useState(false);
  useEffect(() => {
    let live = true;
    (async () => {
      const held = await heldTake(entryId);
      if (!held || !live) return;
      await releaseTake(entryId);
      if (live) setDropped(true);
    })();
    return () => {
      live = false;
    };
  }, [entryId]);
  if (!dropped) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-lacquer">
      {L(
        "The recording you made before signing in was not saved, because you already have two of this word. Remove one of yours above to record it again.",
        "你登入前錄的那段錄音沒有儲存，因為這個詞你已經有兩段錄音了。移除上面其中一段你的錄音，就可以再錄一次。"
      )}
    </p>
  );
}

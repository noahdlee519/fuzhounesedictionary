"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ORIGIN_AREA_CODES, ORIGIN_PRECISIONS } from "@/lib/origins";

export async function saveProfile(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // An expired session used to make Save do nothing, silently.
  if (!user) redirect("/account");

  const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 80);
  const areaRaw = String(formData.get("origin_area") ?? "").trim();
  const area = ORIGIN_AREA_CODES.includes(areaRaw) ? areaRaw : "";
  const locality = String(formData.get("origin_locality") ?? "").trim().slice(0, 120);

  const precisionRaw = String(formData.get("origin_precision") ?? "hidden");
  const precision = (ORIGIN_PRECISIONS as readonly string[]).includes(precisionRaw)
    ? precisionRaw
    : "hidden";

  // The database trigger scrubs whatever the chosen precision does not publish.
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      origin_area: area || null,
      origin_locality: locality || null,
      origin_precision: precision,
    })
    .eq("id", user.id);
  // A failed write used to come back as "Changes saved". Say so instead.
  if (error) redirect("/account?problem=1");

  revalidatePath("/account");
  revalidatePath(`/contributor/${user.id}`);
  // Comes back as ?saved=1, which is what puts the confirmation on screen.
  redirect("/account?saved=1");
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-auth";
import { setPassCollected } from "@/lib/pass-registrations-db";
import { normalizePassNumber } from "@/lib/pass-number";

/**
 * Records a pass as handed over at the counter, or undoes it.
 *
 * Server Actions accept direct POSTs and skip the proxy's admin gate, so the
 * session is re-checked here, the same way order-actions.ts does.
 */
export async function setCollected(formData: FormData) {
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) {
    redirect("/admin/login");
  }

  const passNumber = normalizePassNumber(String(formData.get("passNumber") ?? ""));
  const collected = formData.get("collected") === "1";

  let failed = false;
  try {
    await setPassCollected(passNumber, collected);
  } catch (error) {
    console.error(`[admin] Failed to update collection for pass ${passNumber}:`, error);
    failed = true;
  }

  // redirect() works by throwing, so it stays outside the try above.
  if (failed) {
    redirect(`/admin/passes/${passNumber}?error=save`);
  }

  revalidatePath("/admin/passes");
  revalidatePath(`/admin/passes/${passNumber}`);
  redirect(`/admin/passes/${passNumber}?${collected ? "collected" : "undone"}=1`);
}

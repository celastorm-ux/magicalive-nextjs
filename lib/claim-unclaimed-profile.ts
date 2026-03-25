import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Copy unclaimed magician row to a new Clerk user id, reassign FKs, delete placeholder.
 * Uses service-role Supabase client.
 */
export async function claimUnclaimedProfile(
  db: SupabaseClient,
  unclaimedId: string,
  clerkUserId: string,
  emailFallback: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!unclaimedId.trim() || !clerkUserId.trim()) {
    return { ok: false, error: "Missing profile or user id" };
  }

  const { data: existingUserProfile, error: exErr } = await db
    .from("profiles")
    .select("id, account_type")
    .eq("id", clerkUserId)
    .maybeSingle();
  if (exErr) return { ok: false, error: exErr.message };
  if (existingUserProfile) {
    return {
      ok: false,
      error:
        (existingUserProfile as { account_type?: string }).account_type === "magician"
          ? "You already have a magician profile."
          : "This account already has a profile. Sign in with a different account or contact support.",
    };
  }

  const { data: oldRow, error: fetchErr } = await db
    .from("profiles")
    .select("*")
    .eq("id", unclaimedId)
    .eq("account_type", "magician")
    .maybeSingle();
  if (fetchErr || !oldRow) {
    return { ok: false, error: fetchErr?.message || "Profile not found" };
  }
  const old = oldRow as Record<string, unknown>;
  if (!Boolean(old.is_unclaimed)) {
    return { ok: false, error: "This profile is not claimable" };
  }

  const { id: _drop, created_at: _c, updated_at: _u, ...rest } = old;
  const newRow: Record<string, unknown> = {
    ...rest,
    id: clerkUserId,
    is_unclaimed: false,
    unclaimed_name: null,
    email: emailFallback?.trim() || (typeof old.email === "string" ? old.email : "") || null,
  };

  const { error: insErr } = await db.from("profiles").insert(newRow);
  if (insErr) {
    return { ok: false, error: insErr.message };
  }

  await db.from("shows").update({ magician_id: clerkUserId }).eq("magician_id", unclaimedId);
  await db.from("shows").update({ profile_id: clerkUserId }).eq("profile_id", unclaimedId);
  await db.from("reviews").update({ magician_id: clerkUserId }).eq("magician_id", unclaimedId);
  await db.from("articles").update({ author_id: clerkUserId }).eq("author_id", unclaimedId);
  await db.from("follows").update({ following_id: clerkUserId }).eq("following_id", unclaimedId);
  await db.from("follows").update({ follower_id: clerkUserId }).eq("follower_id", unclaimedId);
  await db.from("booking_requests").update({ magician_id: clerkUserId }).eq("magician_id", unclaimedId);
  await db.from("notifications").update({ recipient_id: clerkUserId }).eq("recipient_id", unclaimedId);
  await db.from("notifications").update({ sender_id: clerkUserId }).eq("sender_id", unclaimedId);

  const { error: delErr } = await db.from("profiles").delete().eq("id", unclaimedId);
  if (delErr) {
    return { ok: false, error: delErr.message };
  }

  return { ok: true };
}

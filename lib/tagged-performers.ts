import type { SupabaseClient } from "@supabase/supabase-js";

/** Shape stored in shows.tagged_performers (jsonb). */
export type TaggedPerformerStored = {
  profile_id: string | null;
  name: string;
  status: "registered" | "invited";
  email?: string | null;
  unclaimed_profile_id?: string | null;
  avatar_url?: string | null;
};

/** Client list item (includes stable React key). */
export type TaggedPerformerLocal =
  | {
      clientKey: string;
      kind: "registered";
      profile_id: string;
      name: string;
      avatar_url: string | null;
      location: string | null;
    }
  | {
      clientKey: string;
      kind: "invited";
      name: string;
      email: string;
      unclaimed_profile_id?: string;
    };

export function parseTaggedPerformers(raw: unknown): TaggedPerformerStored[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map(normalizeOneStored).filter(Boolean) as TaggedPerformerStored[];
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p) ? p.map(normalizeOneStored).filter(Boolean) as TaggedPerformerStored[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeOneStored(x: unknown): TaggedPerformerStored | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const profileId =
    typeof o.profile_id === "string" && o.profile_id.trim() ? o.profile_id.trim() : null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const status = o.status === "invited" ? "invited" : "registered";
  const email = typeof o.email === "string" ? o.email.trim() : null;
  const unclaimed_profile_id =
    typeof o.unclaimed_profile_id === "string" && o.unclaimed_profile_id.trim()
      ? o.unclaimed_profile_id.trim()
      : null;
  const avatar_url = typeof o.avatar_url === "string" ? o.avatar_url : null;
  if (!name) return null;
  if (status === "invited") {
    if (!email) return null;
    return {
      profile_id: null,
      name,
      status: "invited",
      email,
      unclaimed_profile_id: unclaimed_profile_id || undefined,
    };
  }
  if (!profileId) return null;
  return {
    profile_id: profileId,
    name,
    status: "registered",
    avatar_url: avatar_url || undefined,
  };
}

export function localFromStored(rows: TaggedPerformerStored[]): TaggedPerformerLocal[] {
  return rows.map((r) => {
    if (r.status === "invited" && r.email) {
      return {
        clientKey: `inv-${r.email}-${r.unclaimed_profile_id ?? "pending"}`,
        kind: "invited" as const,
        name: r.name,
        email: r.email,
        unclaimed_profile_id: r.unclaimed_profile_id ?? undefined,
      };
    }
    return {
      clientKey: `reg-${r.profile_id}`,
      kind: "registered" as const,
      profile_id: r.profile_id!,
      name: r.name,
      avatar_url: r.avatar_url ?? null,
      location: null,
    };
  });
}

export function storedFromLocal(rows: TaggedPerformerLocal[]): TaggedPerformerStored[] {
  return rows.map((r) => {
    if (r.kind === "invited") {
      return {
        profile_id: null,
        name: r.name.trim(),
        email: r.email.trim().toLowerCase(),
        status: "invited",
        unclaimed_profile_id: r.unclaimed_profile_id,
      };
    }
    return {
      profile_id: r.profile_id,
      name: r.name.trim(),
      status: "registered",
      avatar_url: r.avatar_url ?? undefined,
    };
  });
}

export function taggedPerformersSummaryNames(
  raw: unknown,
): Array<{ name: string; profileId: string | null }> {
  return parseTaggedPerformers(raw).map((t) => ({
    name: t.name,
    profileId: t.profile_id,
  }));
}

/** After a user claims an unclaimed magician row, promote tagged entries on all shows. */
export async function replaceUnclaimedInTaggedPerformers(
  db: SupabaseClient,
  unclaimedId: string,
  newProfileId: string,
): Promise<void> {
  const { data: rows, error } = await db.from("shows").select("id, tagged_performers");
  if (error || !rows?.length) return;

  for (const row of rows as Array<{ id: string; tagged_performers: unknown }>) {
    if (!JSON.stringify(row.tagged_performers ?? []).includes(unclaimedId)) continue;
    const tp = parseTaggedPerformers(row.tagged_performers);
    if (!tp.length) continue;
    let changed = false;
    const next = tp.map((e) => {
      if (e.unclaimed_profile_id === unclaimedId) {
        changed = true;
        return {
          profile_id: newProfileId,
          name: e.name,
          status: "registered" as const,
          avatar_url: null,
        };
      }
      return e;
    });
    if (changed) {
      await db.from("shows").update({ tagged_performers: next }).eq("id", row.id);
    }
  }
}

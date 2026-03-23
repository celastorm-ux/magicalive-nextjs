import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Body fields allowed on profiles (id always comes from Clerk). */
const PROFILE_KEYS = [
  "account_type",
  "display_name",
  "email",
  "handle",
  "location",
  "age",
  "short_bio",
  "full_bio",
  "specialty_tags",
  "available_for",
  "credentials",
  "instagram",
  "tiktok",
  "youtube",
  "website",
  "showreel_url",
] as const;

type ProfileBody = Partial<
  Record<(typeof PROFILE_KEYS)[number], unknown>
>;

function pickProfilePayload(body: ProfileBody): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const key of PROFILE_KEYS) {
    if (key in body && body[key] !== undefined) {
      row[key] = body[key];
    }
  }
  return row;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, error: "Body must be a JSON object" },
      { status: 400 },
    );
  }

  const payload = pickProfilePayload(body as ProfileBody);
  const row = { id: userId, ...payload };

  const { data, error } = await supabase
    .from("profiles")
    .insert(row)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, profile: data });
}

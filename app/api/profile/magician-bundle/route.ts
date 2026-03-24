import { NextResponse } from "next/server";
import { getMagicianProfileBundle } from "@/lib/server/detail-pages";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json(
      { profile: null, shows: [], pastShows: [], reviews: [], articles: [] },
      { status: 200 },
    );
  }
  const bundle = await getMagicianProfileBundle(id);
  if (!bundle) {
    return NextResponse.json(
      { profile: null, shows: [], pastShows: [], reviews: [], articles: [] },
      { status: 200 },
    );
  }
  return NextResponse.json(bundle);
}

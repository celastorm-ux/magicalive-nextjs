import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await clerkClient();
    const { data } = await client.sessions.getSessionList({ userId });
    const sessions = data ?? [];
    for (const session of sessions) {
      await client.sessions.revokeSession(session.id);
    }
    return NextResponse.json({ ok: true, revoked: sessions.length });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not revoke sessions." }, { status: 500 });
  }
}

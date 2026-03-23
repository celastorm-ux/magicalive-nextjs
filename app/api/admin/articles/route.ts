import { NextResponse } from "next/server";
import { getClerkPrimaryEmail } from "@/lib/clerk-email";
import { requireAdmin } from "@/lib/admin-server";
import { createNotification } from "@/lib/notifications";
import {
  emailArticlePublishedAuthor,
  emailArticleRejectedAuthor,
  sendWithResend,
  siteBaseUrl,
} from "@/lib/magicalive-resend";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const { data, error } = await ctx.db
    .from("articles")
    .select(
      "id, title, excerpt, body, category, status, author_id, author_name, published_at, created_at, view_count, like_count, rejection_reason",
    )
    .order("id", { ascending: false });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  type Row = {
    id: string;
    created_at?: string | null;
    published_at?: string | null;
  };
  const articles = [...((data ?? []) as Row[])].sort((a, b) => {
    const ta = new Date(a.created_at || a.published_at || 0).getTime();
    const tb = new Date(b.created_at || b.published_at || 0).getTime();
    return tb - ta;
  });
  return NextResponse.json({ ok: true, articles });
}

export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const rec = body as Record<string, unknown>;
  const action = rec.action === "publish" || rec.action === "reject" ? rec.action : null;
  const articleId = typeof rec.articleId === "string" ? rec.articleId.trim() : "";
  if (!action || !articleId) {
    return NextResponse.json({ ok: false, error: "action and articleId required" }, { status: 400 });
  }

  const { data: row, error: fetchErr } = await ctx.db
    .from("articles")
    .select("id, title, author_id, status")
    .eq("id", articleId)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ ok: false, error: "Article not found" }, { status: 404 });
  }

  const title = (row as { title?: string | null }).title?.trim() || "Your article";
  const authorId = String((row as { author_id?: string | null }).author_id ?? "");

  if (action === "publish") {
    const publishedAt = new Date().toISOString();
    const { error: upErr } = await ctx.db
      .from("articles")
      .update({
        status: "published",
        published_at: publishedAt,
        rejection_reason: null,
      })
      .eq("id", articleId);
    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    const articleUrl = `${siteBaseUrl()}/articles/${encodeURIComponent(articleId)}`;
    const authorEmail = authorId ? await getClerkPrimaryEmail(authorId) : null;
    if (authorEmail) {
      const built = emailArticlePublishedAuthor({ article_title: title, article_url: articleUrl });
      await sendWithResend({ to: authorEmail, ...built });
    }
    if (authorId) {
      await createNotification(
        {
          recipientId: authorId,
          type: "new_article_published",
          message: "Your article has been published",
          link: `/articles/${encodeURIComponent(articleId)}`,
        },
        ctx.db,
      );
    }
    return NextResponse.json({ ok: true });
  }

  const reason = typeof rec.reason === "string" ? rec.reason.trim() : "";
  if (!reason) {
    return NextResponse.json({ ok: false, error: "reason required for reject" }, { status: 400 });
  }

  const { error: upErr } = await ctx.db
    .from("articles")
    .update({
      status: "rejected",
      rejection_reason: reason,
      published_at: null,
    })
    .eq("id", articleId);

  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }

  const authorEmail = authorId ? await getClerkPrimaryEmail(authorId) : null;
  if (authorEmail) {
    const built = emailArticleRejectedAuthor({ article_title: title, reason });
    await sendWithResend({ to: authorEmail, ...built });
  }
  if (authorId) {
    await createNotification(
      {
        recipientId: authorId,
        type: "article_rejected",
        message: "Your article submission needs revision",
        link: "/dashboard?tab=articles",
      },
      ctx.db,
    );
  }

  return NextResponse.json({ ok: true });
}

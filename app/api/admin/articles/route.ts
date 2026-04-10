import { NextResponse } from "next/server";
import { getClerkPrimaryEmail } from "@/lib/clerk-email";
import { requireAdmin } from "@/lib/admin-server";
import { createNotification } from "@/lib/notifications";
import {
  emailArticlePublishedAuthor,
  emailArticleRejectedAuthor,
  emailNewArticlePublished,
  sendWithResend,
  siteBaseUrl,
} from "@/lib/pinnaclemagic-resend";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const { data, error } = await ctx.db
    .from("articles")
    .select(
      "id, title, excerpt, body, category, status, author_id, author_name, published_at, created_at, view_count, like_count, rejection_reason, cover_image_url",
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
  const actionRaw = rec.action;
  const action =
    actionRaw === "publish" || actionRaw === "reject" || actionRaw === "unpublish" || actionRaw === "delete"
      ? actionRaw
      : null;
  const articleId = typeof rec.articleId === "string" ? rec.articleId.trim() : "";
  if (!action || !articleId) {
    return NextResponse.json({ ok: false, error: "action and articleId required" }, { status: 400 });
  }

  if (action === "delete") {
    const { error: delErr } = await ctx.db.from("articles").delete().eq("id", articleId);
    if (delErr) {
      return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "unpublish") {
    const { data: exists, error: fetchErr } = await ctx.db.from("articles").select("id").eq("id", articleId).maybeSingle();
    if (fetchErr || !exists) {
      return NextResponse.json({ ok: false, error: "Article not found" }, { status: 404 });
    }
    const { error: upErr } = await ctx.db
      .from("articles")
      .update({ status: "pending", published_at: null })
      .eq("id", articleId);
    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { data: row, error: fetchErr } = await ctx.db
    .from("articles")
    .select("id, title, excerpt, category, author_id, author_name, status")
    .eq("id", articleId)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ ok: false, error: "Article not found" }, { status: 404 });
  }

  const articleRow = row as {
    title?: string | null;
    excerpt?: string | null;
    category?: string | null;
    author_id?: string | null;
    author_name?: string | null;
  };
  const title = articleRow.title?.trim() || "Your article";
  const authorId = String(articleRow.author_id ?? "");
  const authorName = articleRow.author_name?.trim() || "PinnacleMagic writer";
  const excerpt = articleRow.excerpt?.trim() || null;
  const category = articleRow.category?.trim() || null;

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

    // Notify the author
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

    // Fan-out to subscribers (fire-and-forget so publish returns immediately)
    void (async () => {
      try {
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) return;

        const { data: subscribers } = await ctx.db
          .from("profiles")
          .select("id, email")
          .neq("email_new_articles", false)
          .not("email", "is", null)
          .neq("id", authorId || "");

        if (!subscribers?.length) return;

        const built = emailNewArticlePublished({
          article_title: title,
          article_url: articleUrl,
          author_name: authorName,
          excerpt,
          category,
        });

        const resend = new Resend(resendKey);
        const validEmails = subscribers
          .map((s) => (s.email as string | null)?.trim())
          .filter((e): e is string => typeof e === "string" && e.includes("@"));

        // Resend batch: up to 100 per call
        for (let i = 0; i < validEmails.length; i += 100) {
          const chunk = validEmails.slice(i, i + 100);
          await resend.batch.send(
            chunk.map((to) => ({ from: built.from, to, subject: built.subject, html: built.html })),
          );
        }
      } catch (err) {
        console.error("Article subscriber fan-out error:", err);
      }
    })();

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

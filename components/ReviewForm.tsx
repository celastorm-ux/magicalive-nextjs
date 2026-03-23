"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";
import { CLASSES } from "@/lib/constants";
import { createNotification } from "@/lib/notifications";
import { createClerkSupabaseClient, supabase } from "@/lib/supabase";

export type CreatedReview = {
  id: string;
  reviewer_name: string | null;
  reviewer_display_name: string | null;
  rating: number | null;
  body: string | null;
  show_attended: string | null;
  created_at: string | null;
};

type ReviewFormProps = {
  magicianId: string;
  isOwnProfile: boolean;
  onSubmitted: (review: CreatedReview) => void;
};

export function ReviewForm({ magicianId, isOwnProfile, onSubmitted }: ReviewFormProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [rating, setRating] = useState(0);
  const [showAttended, setShowAttended] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isOwnProfile) return null;

  if (!user?.id) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-sm text-zinc-400">
          <Link href="/sign-in" className="text-[var(--ml-gold)] hover:underline">
            Sign in to leave a review
          </Link>
        </p>
      </div>
    );
  }

  const submit = async () => {
    setError(null);
    const text = body.trim();
    if (!text) {
      setError("Please add your review.");
      return;
    }
    if (rating < 1 || rating > 5) {
      setError("Please select a rating.");
      return;
    }
    setSubmitting(true);
    const { data: reviewerProfile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    const reviewerName =
      reviewerProfile?.display_name?.trim() ||
      user.fullName?.trim() ||
      user.firstName?.trim() ||
      user.username?.trim() ||
      "Anonymous";
    const payload = {
      magician_id: magicianId,
      reviewer_id: user.id,
      reviewer_name: reviewerName,
      reviewer_display_name: reviewerName,
      rating,
      body: text,
      show_attended: showAttended.trim() || null,
    };
    const { data, error: insertError } = await supabase
      .from("reviews")
      .insert(payload)
      .select("id, reviewer_name, reviewer_display_name, rating, body, show_attended, created_at")
      .single();
    if (insertError || !data) {
      setError(insertError?.message || "Could not submit review.");
      setSubmitting(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("review_count")
      .eq("id", magicianId)
      .maybeSingle();
    await supabase
      .from("profiles")
      .update({ review_count: Number(profile?.review_count ?? 0) + 1 })
      .eq("id", magicianId);

    const db = await createClerkSupabaseClient(getToken);
    void createNotification(
      {
        recipientId: magicianId,
        senderId: user.id,
        senderName: reviewerName,
        senderAvatar: reviewerProfile?.avatar_url?.trim() || undefined,
        type: "new_review",
        message: `${reviewerName} left you a ${rating} star review`,
        link: `/profile/magician?id=${encodeURIComponent(magicianId)}#reviews`,
      },
      db,
    );

    void fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "new_review",
        data: {
          magician_id: magicianId,
          reviewer_id: user.id,
          reviewer_name: reviewerName,
          rating,
          body: text,
          show_attended: showAttended.trim() || null,
        },
      }),
    });

    onSubmitted(data as CreatedReview);
    setRating(0);
    setShowAttended("");
    setBody("");
    setSubmitting(false);
  };

  return (
    <div className="min-w-full w-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7">
      <h3 className="ml-font-heading text-lg font-semibold text-zinc-100">Leave a review</h3>
      <div className="mt-4 flex w-full items-center gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const val = i + 1;
          return (
            <button
              key={val}
              type="button"
              onClick={() => setRating(val)}
              className={`inline-flex h-9 w-9 items-center justify-center text-[30px] leading-none transition ${
                val <= rating ? "text-[var(--ml-gold)]" : "text-zinc-600 hover:text-zinc-400"
              }`}
              aria-label={`Rate ${val} stars`}
            >
              ★
            </button>
          );
        })}
      </div>
      <input
        value={showAttended}
        onChange={(e) => setShowAttended(e.target.value)}
        placeholder="Show attended (optional)"
        className={`${CLASSES.input} mt-4 w-full`}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Write your review"
        className={`${CLASSES.textarea} mt-3 min-h-[120px] w-full`}
      />
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={submitting}
        className={`${CLASSES.btnPrimary} mt-4 w-full justify-center`}
      >
        {submitting ? "Submitting..." : "Submit review"}
      </button>
    </div>
  );
}

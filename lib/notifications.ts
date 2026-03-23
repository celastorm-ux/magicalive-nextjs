import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export async function createNotification(
  {
    recipientId,
    senderId,
    senderName,
    senderAvatar,
    type,
    message,
    link,
  }: {
    recipientId: string;
    senderId?: string;
    senderName?: string;
    senderAvatar?: string;
    type: string;
    message: string;
    link: string;
  },
  db: SupabaseClient = supabase,
) {
  const { error } = await db.from("notifications").insert({
    recipient_id: recipientId,
    sender_id: senderId ?? null,
    sender_name: senderName ?? null,
    sender_avatar: senderAvatar ?? null,
    type,
    message,
    link,
    is_read: false,
  });
  return { error };
}

import { clerkClient } from "@clerk/nextjs/server";

export async function getClerkPrimaryEmail(userId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const primaryId = user.primaryEmailAddressId;
    const primary = user.emailAddresses.find(
      (e: { id: string; emailAddress: string }) => e.id === primaryId,
    );
    return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    return null;
  }
}

export async function getClerkDisplayName(userId: string): Promise<string> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.username ||
      user.primaryEmailAddress?.emailAddress;
    return name || "Magicalive member";
  } catch {
    return "Magicalive member";
  }
}

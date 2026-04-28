"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { reunion, invite, household } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateToken, hashToken, getInviteUrl } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { InviteEmail } from "@/emails/InviteEmail";
import { revalidatePath } from "next/cache";

export async function sendInvites(reunionId: string, emails: string[]) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Not authenticated");
  }

  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(
      and(eq(reunion.id, reunionId), eq(reunion.organizerId, session.user.id))
    );

  if (!reunionRow) {
    throw new Error("Reunion not found or you are not the organizer");
  }

  let sent = 0;
  const failed: string[] = [];
  const organizerName =
    session.user.name?.trim() ||
    session.user.email?.trim() ||
    "The KinCircle organizer";

  for (const email of emails) {
    try {
      const token = generateToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(invite).values({
        reunionId,
        tokenHash,
        email,
        status: "pending",
        expiresAt,
      });

      const inviteUrl = getInviteUrl(token);

      await sendEmail({
        to: email,
        subject: `You're invited to ${reunionRow.name}!`,
        react: InviteEmail({
          reunionName: reunionRow.name,
          organizerName,
          inviteUrl,
        }),
      });

      sent++;
    } catch (error) {
      console.error(`Failed to send invite to ${email}:`, error);
      failed.push(email);
    }
  }

  revalidatePath(`/reunions/${reunionId}`);

  return { sent, failed };
}

export async function revokeInvite(inviteId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Not authenticated");
  }

  const [inviteRow] = await db
    .select()
    .from(invite)
    .where(eq(invite.id, inviteId));

  if (!inviteRow) {
    throw new Error("Invite not found");
  }

  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(
      and(
        eq(reunion.id, inviteRow.reunionId),
        eq(reunion.organizerId, session.user.id)
      )
    );

  if (!reunionRow) {
    throw new Error("Not authorized to revoke this invite");
  }

  await db
    .update(invite)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(eq(invite.id, inviteId));

  if (inviteRow.householdId) {
    await db
      .update(household)
      .set({ invitationStatus: "revoked", updatedAt: new Date() })
      .where(eq(household.id, inviteRow.householdId));
  }

  revalidatePath(`/reunions/${inviteRow.reunionId}`);
}

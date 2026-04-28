import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { reunion, invite } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateToken, hashToken, getInviteUrl } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { InviteEmail } from "@/emails/InviteEmail";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(
      and(eq(reunion.id, id), eq(reunion.organizerId, session.user.id))
    );

  if (!reunionRow) {
    return NextResponse.json(
      { error: "Reunion not found or not authorized" },
      { status: 404 }
    );
  }

  const invites = await db
    .select()
    .from(invite)
    .where(eq(invite.reunionId, id))
    .orderBy(desc(invite.createdAt));

  return NextResponse.json(invites);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(
      and(eq(reunion.id, id), eq(reunion.organizerId, session.user.id))
    );

  if (!reunionRow) {
    return NextResponse.json(
      { error: "Reunion not found or not authorized" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const { emails } = body;

  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json(
      { error: "emails must be a non-empty array of strings" },
      { status: 400 }
    );
  }

  for (const email of emails) {
    if (typeof email !== "string" || email.trim().length === 0) {
      return NextResponse.json(
        { error: "Each email must be a non-empty string" },
        { status: 400 }
      );
    }
  }

  let sent = 0;
  const failed: string[] = [];

  for (const email of emails) {
    try {
      const token = generateToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(invite).values({
        reunionId: id,
        tokenHash,
        email: email.trim(),
        status: "pending",
        expiresAt,
      });

      const inviteUrl = getInviteUrl(token);

      await sendEmail({
        to: email.trim(),
        subject: `You're invited to ${reunionRow.name}!`,
        react: InviteEmail({
          reunionName: reunionRow.name,
          organizerName: session.user.name ?? "Your family",
          inviteUrl,
        }),
      });

      sent++;
    } catch (error) {
      console.error(`Failed to send invite to ${email}:`, error);
      failed.push(email);
    }
  }

  return NextResponse.json({ sent, failed });
}

import { dateOption, invite, reunion, user } from "@/db/schema";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { asc, eq } from "drizzle-orm";

export type InvitePreview =
  | {
      status: "valid";
      reunionName: string;
      description: string | null;
      hostName: string | null;
      heroImageUrl: string | null;
      dateLabel: string;
    }
  | {
      status: "unavailable";
      reason:
        | "not_found"
        | "expired"
        | "revoked"
        | "accepted"
        | "missing_reunion";
    };

function formatDateLong(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(startDate: string, endDate: string): string {
  if (startDate === endDate) {
    return formatDateLong(startDate);
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const startMonth = start.toLocaleDateString("en-US", { month: "long" });
  const endMonth = end.toLocaleDateString("en-US", { month: "long" });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();

  if (startMonth !== endMonth) {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }

  return `${startMonth} ${startDay} - ${endDay}, ${year}`;
}

function buildDateLabel({
  lockedDate,
  options,
}: {
  lockedDate: string | null;
  options: { startDate: string; endDate: string }[];
}): string {
  if (lockedDate) {
    return formatDateLong(lockedDate);
  }

  if (options.length === 1) {
    return formatDateRange(options[0].startDate, options[0].endDate);
  }

  if (options.length > 1) {
    return `Help choose from ${options.length} date options`;
  }

  return "Date TBD";
}

export async function getInvitePreview(token: string): Promise<InvitePreview> {
  const tokenHash = hashToken(token);

  const [inviteRow] = await db
    .select()
    .from(invite)
    .where(eq(invite.tokenHash, tokenHash));

  if (!inviteRow) {
    return { status: "unavailable", reason: "not_found" };
  }

  if (inviteRow.status !== "pending") {
    return { status: "unavailable", reason: inviteRow.status };
  }

  if (inviteRow.expiresAt && new Date(inviteRow.expiresAt) < new Date()) {
    return { status: "unavailable", reason: "expired" };
  }

  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, inviteRow.reunionId));

  if (!reunionRow) {
    return { status: "unavailable", reason: "missing_reunion" };
  }

  const [organizer] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, reunionRow.organizerId));

  const options = await db
    .select({
      startDate: dateOption.startDate,
      endDate: dateOption.endDate,
    })
    .from(dateOption)
    .where(eq(dateOption.reunionId, inviteRow.reunionId))
    .orderBy(asc(dateOption.startDate));

  return {
    status: "valid",
    reunionName: reunionRow.name,
    description: reunionRow.description,
    hostName: organizer?.name ?? null,
    heroImageUrl: reunionRow.heroImageUrl,
    dateLabel: buildDateLabel({
      lockedDate: reunionRow.lockedDate,
      options,
    }),
  };
}

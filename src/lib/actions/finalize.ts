"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion, household, dateOption, reunionUpdate } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { DateLockedEmail } from "@/emails/DateLockedEmail";
import { FinalPlanEmail } from "@/emails/FinalPlanEmail";
import { ReunionUpdateEmail } from "@/emails/ReunionUpdateEmail";

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function lockDate(reunionId: string, dateOptionId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const [existing] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, reunionId));
  if (!existing) throw new Error("Not found");
  if (existing.organizerId !== session.user.id) throw new Error("Forbidden");
  if (existing.status !== "planning")
    throw new Error("Reunion must be in planning status to lock a date");

  const [selectedDate] = await db
    .select()
    .from(dateOption)
    .where(
      and(eq(dateOption.id, dateOptionId), eq(dateOption.reunionId, reunionId))
    );
  if (!selectedDate) throw new Error("Date option not found for this reunion");

  const [updated] = await db
    .update(reunion)
    .set({
      status: "date_locked",
      lockedDate: selectedDate.startDate,
      lockedDateOptionId: selectedDate.id,
      updatedAt: new Date(),
    })
    .where(eq(reunion.id, reunionId))
    .returning();

  // Send emails to all claimed households
  const claimedHouseholds = await db
    .select()
    .from(household)
    .where(
      and(
        eq(household.reunionId, reunionId),
        isNotNull(household.claimedAt),
        isNotNull(household.primaryContactEmail)
      )
    );

  const reunionUrl = `${process.env.BETTER_AUTH_URL}/reunion/${reunionId}`;

  for (const hh of claimedHouseholds) {
    try {
      if (!hh.primaryContactEmail) {
        continue;
      }

      await sendEmail({
        to: hh.primaryContactEmail,
        subject: `Date confirmed for ${existing.name}`,
        react: DateLockedEmail({
          reunionName: existing.name,
          startDate: formatDate(selectedDate.startDate),
          endDate: formatDate(selectedDate.endDate),
          reunionUrl,
        }),
      });
    } catch (err) {
      console.error(
        `Failed to send DateLockedEmail to ${hh.primaryContactEmail}:`,
        err
      );
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/reunion/${reunionId}`);

  return updated;
}

export async function finalizeReunion(
  reunionId: string,
  locationName: string,
  locationLat: number | null = null,
  locationLng: number | null = null
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const [existing] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, reunionId));
  if (!existing) throw new Error("Not found");
  if (existing.organizerId !== session.user.id) throw new Error("Forbidden");
  if (existing.status !== "date_locked")
    throw new Error("Reunion must have a locked date before finalizing");

  const normalizedLocationName = locationName.trim();
  if (!normalizedLocationName) {
    throw new Error("Location name is required");
  }
  if ((locationLat === null) !== (locationLng === null)) {
    throw new Error("Location coordinates must be provided together");
  }

  const [updated] = await db
    .update(reunion)
    .set({
      status: "finalized",
      lockedLocationName: normalizedLocationName,
      lockedLocationLat: locationLat,
      lockedLocationLng: locationLng,
      updatedAt: new Date(),
    })
    .where(eq(reunion.id, reunionId))
    .returning();

  // Prefer the explicit locked option; fall back to legacy lockedDate records.
  let startDateStr = existing.lockedDate ?? "";
  let endDateStr = existing.lockedDate ?? "";
  if (existing.lockedDateOptionId) {
    const [lockedDateOption] = await db
      .select()
      .from(dateOption)
      .where(
        and(
          eq(dateOption.id, existing.lockedDateOptionId),
          eq(dateOption.reunionId, reunionId)
        )
      );
    if (lockedDateOption) {
      startDateStr = lockedDateOption.startDate;
      endDateStr = lockedDateOption.endDate;
    }
  } else if (existing.lockedDate) {
    const [matchingDateOption] = await db
      .select()
      .from(dateOption)
      .where(
        and(
          eq(dateOption.reunionId, reunionId),
          eq(dateOption.startDate, existing.lockedDate)
        )
      );
    if (matchingDateOption) {
      startDateStr = matchingDateOption.startDate;
      endDateStr = matchingDateOption.endDate;
    }
  }

  const claimedHouseholds = await db
    .select()
    .from(household)
    .where(
      and(
        eq(household.reunionId, reunionId),
        isNotNull(household.claimedAt),
        isNotNull(household.primaryContactEmail)
      )
    );

  const planUrl = `${process.env.BETTER_AUTH_URL}/reunion/${reunionId}/plan`;

  for (const hh of claimedHouseholds) {
    try {
      if (!hh.primaryContactEmail) {
        continue;
      }

      await sendEmail({
        to: hh.primaryContactEmail,
        subject: `Plans finalized for ${existing.name}!`,
        react: FinalPlanEmail({
          reunionName: existing.name,
          startDate: formatDate(startDateStr),
          endDate: formatDate(endDateStr),
          locationName: normalizedLocationName,
          planUrl,
          organizerName: session.user.name ?? "Your family",
        }),
      });
    } catch (err) {
      console.error(
        `Failed to send FinalPlanEmail to ${hh.primaryContactEmail}:`,
        err
      );
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/reunion/${reunionId}`);

  return updated;
}

export async function postUpdate(
  reunionId: string,
  title: string,
  message: string
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const [existing] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, reunionId));
  if (!existing) throw new Error("Not found");
  if (existing.organizerId !== session.user.id) throw new Error("Forbidden");

  const [created] = await db
    .insert(reunionUpdate)
    .values({
      reunionId,
      title,
      message,
      createdBy: session.user.id,
    })
    .returning();

  revalidatePath(`/reunion/${reunionId}`);

  return created;
}

export async function sendUpdateNotification(
  reunionId: string,
  updateId: string
): Promise<{ sent: number; total: number }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const [reunionRow] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, reunionId));
  if (!reunionRow) throw new Error("Not found");
  if (reunionRow.organizerId !== session.user.id) throw new Error("Forbidden");

  const [updateRow] = await db
    .select()
    .from(reunionUpdate)
    .where(
      and(
        eq(reunionUpdate.id, updateId),
        eq(reunionUpdate.reunionId, reunionId)
      )
    );
  if (!updateRow) throw new Error("Update not found");

  const householdsWithEmail = await db
    .select()
    .from(household)
    .where(
      and(
        eq(household.reunionId, reunionId),
        isNotNull(household.primaryContactEmail)
      )
    );

  const recipients = householdsWithEmail.filter(
    (hh) => typeof hh.primaryContactEmail === "string" && hh.primaryContactEmail.trim().length > 0
  );
  const appUrl =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  let sent = 0;

  for (const hh of recipients) {
    try {
      if (!hh.primaryContactEmail) {
        continue;
      }

      await sendEmail({
        to: hh.primaryContactEmail,
        subject: `Update from ${reunionRow.name}: ${updateRow.title}`,
        react: ReunionUpdateEmail({
          reunionName: reunionRow.name,
          updateTitle: updateRow.title,
          updateMessage: updateRow.message,
          appUrl,
          reunionId,
        }),
      });
      sent++;
    } catch (error) {
      console.error(
        `Failed to send ReunionUpdateEmail to ${hh.primaryContactEmail}:`,
        error
      );
    }
  }

  return { sent, total: recipients.length };
}

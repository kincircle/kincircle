"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function createReunion(data: {
  name: string;
  description?: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }

  const [newReunion] = await db
    .insert(reunion)
    .values({
      name: data.name,
      description: data.description ?? null,
      organizerId: session.user.id,
    })
    .returning();

  revalidatePath("/dashboard");
  return newReunion;
}

export async function updateReunion(
  id: string,
  data: { name?: string; description?: string }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }

  const [existing] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, id));

  if (!existing) {
    throw new Error("Not found");
  }

  if (existing.organizerId !== session.user.id) {
    throw new Error("Forbidden");
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;

  const [updated] = await db
    .update(reunion)
    .set(updateData)
    .where(eq(reunion.id, id))
    .returning();

  revalidatePath("/dashboard");
  revalidatePath(`/reunion/${id}`);
  return updated;
}

export async function deleteReunion(id: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }

  const [existing] = await db
    .select()
    .from(reunion)
    .where(eq(reunion.id, id));

  if (!existing) {
    throw new Error("Not found");
  }

  if (existing.organizerId !== session.user.id) {
    throw new Error("Forbidden");
  }

  await db.delete(reunion).where(eq(reunion.id, id));

  revalidatePath("/dashboard");
}

"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reunion } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { deleteAsset } from "@/lib/cloudinary";
import { getCloudinaryCloudName } from "@/lib/env";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isCloudinaryUrl(url: string, publicId: string) {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const cloudName = getCloudinaryCloudName();
  const pathParts = parsed.pathname.split("/").filter(Boolean);

  return (
    parsed.protocol === "https:" &&
    parsed.hostname === "res.cloudinary.com" &&
    pathParts[0] === cloudName &&
    pathParts[1] === "image" &&
    pathParts[2] === "upload" &&
    decodeURIComponent(parsed.pathname).includes(`/${publicId}.`)
  );
}

function isHeroPublicId(reunionId: string, publicId: string) {
  return publicId.startsWith(`kincircle/${reunionId}/hero/`);
}

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

export async function setReunionHero(data: {
  reunionId: string;
  publicId: string;
  url: string;
}): Promise<{ error: string } | { success: true }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: "Unauthorized" };
  }

  const reunionId = data.reunionId.trim();
  const publicId = data.publicId.trim();
  const url = data.url.trim();

  if (!uuidPattern.test(reunionId)) {
    return { error: "Invalid reunion id" };
  }

  if (!isHeroPublicId(reunionId, publicId)) {
    return { error: "Invalid hero image" };
  }

  if (!isCloudinaryUrl(url, publicId)) {
    return { error: "Invalid image URL" };
  }

  const [existing] = await db
    .select({
      organizerId: reunion.organizerId,
      heroImagePublicId: reunion.heroImagePublicId,
    })
    .from(reunion)
    .where(eq(reunion.id, reunionId));

  if (!existing) {
    return { error: "Not found" };
  }

  if (existing.organizerId !== session.user.id) {
    return { error: "Forbidden" };
  }

  await db
    .update(reunion)
    .set({
      heroImageUrl: url,
      heroImagePublicId: publicId,
      updatedAt: new Date(),
    })
    .where(eq(reunion.id, reunionId));

  if (
    existing.heroImagePublicId &&
    existing.heroImagePublicId !== publicId
  ) {
    try {
      await deleteAsset(existing.heroImagePublicId);
    } catch (error) {
      console.error("Failed to delete previous reunion hero image:", error);
    }
  }

  revalidatePath(`/reunion/${reunionId}`);
  revalidatePath(`/reunion/${reunionId}/plan`);
  return { success: true };
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

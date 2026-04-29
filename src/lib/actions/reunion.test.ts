import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const select = vi.fn();
const update = vi.fn();
const updateSet = vi.fn();
const deleteAsset = vi.fn();
const revalidatePath = vi.fn();
const dbRows: unknown[][] = [];

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession,
    },
  },
}));

vi.mock("@/lib/cloudinary", () => ({
  deleteAsset,
}));

vi.mock("@/lib/env", () => ({
  getCloudinaryCloudName: () => "demo",
}));

vi.mock("@/lib/db", () => ({
  db: {
    select,
    update,
  },
}));

function queueDbRows(rows: unknown[]) {
  dbRows.push(rows);
}

describe("setReunionHero", () => {
  const reunionId = "00000000-0000-4000-8000-000000000000";
  const publicId = `kincircle/${reunionId}/hero/new-photo`;
  const url = `https://res.cloudinary.com/demo/image/upload/v123/${publicId}.jpg`;

  beforeEach(() => {
    vi.resetModules();
    getSession.mockReset();
    select.mockReset();
    update.mockReset();
    updateSet.mockReset();
    deleteAsset.mockReset();
    revalidatePath.mockReset();
    dbRows.length = 0;

    select.mockImplementation(() => ({
      from: () => ({
        where: async () => dbRows.shift() ?? [],
      }),
    }));

    updateSet.mockReturnValue({
      where: vi.fn(async () => []),
    });
    update.mockReturnValue({
      set: updateSet,
    });
  });

  it("stores a new organizer hero image and deletes the previous asset", async () => {
    getSession.mockResolvedValue({ user: { id: "organizer-1" } });
    queueDbRows([
      {
        organizerId: "organizer-1",
        heroImagePublicId: `kincircle/${reunionId}/hero/old-photo`,
      },
    ]);
    const { setReunionHero } = await import("./reunion");

    await expect(
      setReunionHero({
        reunionId,
        publicId,
        url,
      })
    ).resolves.toEqual({ success: true });

    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        heroImagePublicId: publicId,
        heroImageUrl: url,
      })
    );
    expect(deleteAsset).toHaveBeenCalledWith(
      `kincircle/${reunionId}/hero/old-photo`
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/reunion/${reunionId}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/reunion/${reunionId}/plan`);
  });

  it("rejects non-organizer updates", async () => {
    getSession.mockResolvedValue({ user: { id: "member-1" } });
    queueDbRows([{ organizerId: "organizer-1", heroImagePublicId: null }]);
    const { setReunionHero } = await import("./reunion");

    await expect(
      setReunionHero({
        reunionId,
        publicId,
        url,
      })
    ).resolves.toEqual({ error: "Forbidden" });

    expect(update).not.toHaveBeenCalled();
    expect(deleteAsset).not.toHaveBeenCalled();
  });

  it("rejects hero assets outside the reunion hero folder", async () => {
    getSession.mockResolvedValue({ user: { id: "organizer-1" } });
    const { setReunionHero } = await import("./reunion");

    await expect(
      setReunionHero({
        reunionId,
        publicId: `kincircle/${reunionId}/photos/new-photo`,
        url,
      })
    ).resolves.toEqual({ error: "Invalid hero image" });

    expect(select).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});

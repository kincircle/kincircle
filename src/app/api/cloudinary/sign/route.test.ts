import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const signUploadParams = vi.fn();
const select = vi.fn();
const dbRows: unknown[][] = [];

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession,
    },
  },
}));

vi.mock("@/lib/cloudinary", () => ({
  signUploadParams,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select,
  },
}));

function queueDbRows(rows: unknown[]) {
  dbRows.push(rows);
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/cloudinary/sign", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
  });
}

async function responseJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("POST /api/cloudinary/sign", () => {
  beforeEach(() => {
    vi.resetModules();
    getSession.mockReset();
    signUploadParams.mockReset();
    select.mockReset();
    dbRows.length = 0;

    select.mockImplementation(() => ({
      from: () => ({
        where: async () => dbRows.shift() ?? [],
      }),
    }));

    signUploadParams.mockImplementation(({ folder }: { folder: string }) => ({
      folder,
      signature: "signed",
      timestamp: 123,
      apiKey: "key",
      cloudName: "cloud",
    }));
  });

  it("rejects unauthenticated upload signing", async () => {
    getSession.mockResolvedValue(null);
    const { POST } = await import("./route");

    const response = await POST(
      jsonRequest({
        folder: "kincircle/00000000-0000-4000-8000-000000000000/photos",
      })
    );

    expect(response.status).toBe(401);
    await expect(responseJson(response)).resolves.toEqual({
      error: "unauthorized",
    });
    expect(select).not.toHaveBeenCalled();
  });

  it("rejects folders outside the reunion upload namespace", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    const { POST } = await import("./route");

    const response = await POST(
      jsonRequest({
        folder: "kincircle/users/user-1/profile",
      })
    );

    expect(response.status).toBe(400);
    expect(signUploadParams).not.toHaveBeenCalled();
  });

  it("keeps date option image uploads organizer-only", async () => {
    getSession.mockResolvedValue({ user: { id: "member-1" } });
    queueDbRows([{ organizerId: "organizer-1" }]);
    const { POST } = await import("./route");

    const response = await POST(
      jsonRequest({
        folder: "kincircle/00000000-0000-4000-8000-000000000000/date-options",
      })
    );

    expect(response.status).toBe(403);
    expect(signUploadParams).not.toHaveBeenCalled();
    expect(select).toHaveBeenCalledOnce();
  });

  it("allows a claimed household member to sign reunion photo uploads", async () => {
    getSession.mockResolvedValue({ user: { id: "member-1" } });
    queueDbRows([{ organizerId: "organizer-1" }]);
    queueDbRows([{ id: "household-1" }]);
    const { POST } = await import("./route");

    const response = await POST(
      jsonRequest({
        folder: "kincircle/00000000-0000-4000-8000-000000000000/photos",
      })
    );

    expect(response.status).toBe(200);
    await expect(responseJson(response)).resolves.toMatchObject({
      folder: "kincircle/00000000-0000-4000-8000-000000000000/photos",
      signature: "signed",
    });
    expect(select).toHaveBeenCalledTimes(2);
  });

  it("hides reunion existence from unclaimed users", async () => {
    getSession.mockResolvedValue({ user: { id: "member-1" } });
    queueDbRows([{ organizerId: "organizer-1" }]);
    queueDbRows([]);
    const { POST } = await import("./route");

    const response = await POST(
      jsonRequest({
        folder: "kincircle/00000000-0000-4000-8000-000000000000/photos",
      })
    );

    expect(response.status).toBe(404);
    expect(signUploadParams).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/actions/finalize", () => ({
  postUpdate: vi.fn(() =>
    Promise.resolve({
      id: "update-2",
      reunionId: "reunion-1",
      title: "Parking update",
      message: "Use the south lot.",
      createdBy: "organizer-1",
      createdAt: new Date("2026-03-14T12:00:00Z"),
    })
  ),
  sendUpdateNotification: vi.fn(() =>
    Promise.resolve({ sent: 2, total: 2 })
  ),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import { UpdatesSection } from "./UpdatesSection";
import {
  postUpdate,
  sendUpdateNotification,
} from "@/lib/actions/finalize";
import { toast } from "sonner";

describe("UpdatesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/updates")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "update-1",
                reunionId: "reunion-1",
                title: "Welcome",
                message: "See you soon.",
                createdBy: "organizer-1",
                authorName: "Blair Zimmerman",
                createdAt: "2026-03-13T10:00:00Z",
              },
            ]),
        });
      }

      if (url.includes("/households")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: "household-1", primaryContactEmail: "a@example.com" },
              { id: "household-2", primaryContactEmail: "b@example.com" },
            ]),
        });
      }

      return Promise.resolve({ ok: false });
    });
  });

  it("renders existing updates", async () => {
    render(
      <UpdatesSection
        reunionId="reunion-1"
        isOrganizer={false}
        currentUserId="member-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("See you soon.")).toBeInTheDocument();
    });

    expect(screen.getByText("Blair Zimmerman")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Post update/i })
    ).not.toBeInTheDocument();
  });

  it("labels the current user's own update as You", async () => {
    render(
      <UpdatesSection
        reunionId="reunion-1"
        isOrganizer
        currentUserId="organizer-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("You")).toBeInTheDocument();
    });
  });

  it("shows the email confirmation prompt after posting an update", async () => {
    const user = userEvent.setup();
    render(<UpdatesSection reunionId="reunion-1" isOrganizer />);

    await waitFor(() => {
      expect(
        screen.getByRole("textbox", { name: /Announcement/i })
      ).toBeInTheDocument();
    });

    await user.type(
      screen.getByRole("textbox", { name: /Announcement/i }),
      "Use the south lot."
    );
    await user.click(screen.getByRole("button", { name: /Post update/i }));

    await waitFor(() => {
      expect(postUpdate).toHaveBeenCalledWith(
        "reunion-1",
        "Use the south lot.",
        "Use the south lot."
      );
      expect(
        screen.getByText(/Send email notification to 2 households/i)
      ).toBeInTheDocument();
    });
  });

  it("sends update notification emails after confirmation", async () => {
    const user = userEvent.setup();
    render(<UpdatesSection reunionId="reunion-1" isOrganizer />);

    await waitFor(() => {
      expect(
        screen.getByRole("textbox", { name: /Announcement/i })
      ).toBeInTheDocument();
    });

    await user.type(
      screen.getByRole("textbox", { name: /Announcement/i }),
      "Use the south lot."
    );
    await user.click(screen.getByRole("button", { name: /Post update/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Send Email/i })
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Send Email/i }));

    await waitFor(() => {
      expect(sendUpdateNotification).toHaveBeenCalledWith(
        "reunion-1",
        "update-2"
      );
      expect(toast.success).toHaveBeenCalledWith("Sent to 2 of 2 households");
    });
  });

  it("allows skipping the notification prompt", async () => {
    const user = userEvent.setup();
    render(<UpdatesSection reunionId="reunion-1" isOrganizer />);

    await waitFor(() => {
      expect(
        screen.getByRole("textbox", { name: /Announcement/i })
      ).toBeInTheDocument();
    });

    await user.type(
      screen.getByRole("textbox", { name: /Announcement/i }),
      "Use the south lot."
    );
    await user.click(screen.getByRole("button", { name: /Post update/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Send email notification to 2 households/i)
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Skip/i }));

    await waitFor(() => {
      expect(
        screen.queryByText(/Send email notification to 2 households/i)
      ).not.toBeInTheDocument();
    });
  });
});

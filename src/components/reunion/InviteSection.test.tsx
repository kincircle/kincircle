import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock server actions
vi.mock("@/lib/actions/invite", () => ({
  sendInvites: vi.fn(() => Promise.resolve({ sent: 2, failed: [] })),
  revokeInvite: vi.fn(() => Promise.resolve()),
}));

// Mock fetch - must be defined before imports
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import { InviteSection } from "./InviteSection";
import { sendInvites, revokeInvite } from "@/lib/actions/invite";
import { toast } from "sonner";
import type { Invite } from "@/types";

describe("InviteSection", () => {
  const mockInvites: Invite[] = [
    {
      id: "invite-1",
      reunionId: "r-1",
      email: "aunt.jane@email.com",
      status: "pending",
      token: "token-1",
      createdAt: "2025-01-10T00:00:00Z",
      updatedAt: "2025-01-10T00:00:00Z",
    },
    {
      id: "invite-2",
      reunionId: "r-1",
      email: "uncle.bob@email.com",
      status: "accepted",
      token: "token-2",
      createdAt: "2025-01-11T00:00:00Z",
      updatedAt: "2025-01-11T00:00:00Z",
      acceptedAt: "2025-01-12T00:00:00Z",
      acceptedByUserId: "user-2",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/invites")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInvites),
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  it("renders invite form for organizer", async () => {
    render(<InviteSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email Addresses/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /send invites/i })).toBeInTheDocument();
    });
  });

  it("shows existing invites list", async () => {
    render(<InviteSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByText("aunt.jane@email.com")).toBeInTheDocument();
      expect(screen.getByText("uncle.bob@email.com")).toBeInTheDocument();
    });
  });

  it("can send new invite (email input + submit)", async () => {
    const user = userEvent.setup();
    render(<InviteSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email Addresses/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email Addresses/i);
    await user.type(emailInput, "cousin.sally@email.com, nephew.tim@email.com");

    const sendButton = screen.getByRole("button", { name: /send invites/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(sendInvites).toHaveBeenCalledWith("r-1", [
        "cousin.sally@email.com",
        "nephew.tim@email.com",
      ]);
    });
  });

  it("shows invite status (pending/accepted)", async () => {
    render(<InviteSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByText("pending")).toBeInTheDocument();
      expect(screen.getByText("accepted")).toBeInTheDocument();
    });
  });

  it("can revoke pending invite", async () => {
    const user = userEvent.setup();
    render(<InviteSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByText("aunt.jane@email.com")).toBeInTheDocument();
    });

    // Find the revoke button (X icon) for the pending invite
    const revokeButtons = screen.getAllByRole("button");
    const revokeButton = revokeButtons.find((btn) =>
      btn.className.includes("h-7 w-7")
    );

    expect(revokeButton).toBeInTheDocument();
    await user.click(revokeButton!);

    await waitFor(() => {
      expect(revokeInvite).toHaveBeenCalledWith("invite-1");
      expect(toast.success).toHaveBeenCalledWith("Invite revoked");
    });
  });

  it("shows success toast after sending invites", async () => {
    const user = userEvent.setup();
    render(<InviteSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email Addresses/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email Addresses/i);
    await user.type(emailInput, "test@email.com");

    const sendButton = screen.getByRole("button", { name: /send invites/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("2 invites sent");
    });
  });

  it("handles multiple email formats (comma, newline)", async () => {
    const user = userEvent.setup();
    render(<InviteSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email Addresses/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email Addresses/i);
    await user.type(
      emailInput,
      "email1@test.com,email2@test.com\nemail3@test.com"
    );

    const sendButton = screen.getByRole("button", { name: /send invites/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(sendInvites).toHaveBeenCalledWith("r-1", [
        "email1@test.com",
        "email2@test.com",
        "email3@test.com",
      ]);
    });
  });

  it("disables send button when email input is empty", async () => {
    render(<InviteSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email Addresses/i)).toBeInTheDocument();
    });

    const sendButton = screen.getByRole("button", { name: /send invites/i });
    expect(sendButton).toBeDisabled();
  });

  it("shows error for failed invites", async () => {
    vi.mocked(sendInvites).mockResolvedValueOnce({
      sent: 1,
      failed: ["invalid@email"],
    });

    const user = userEvent.setup();
    render(<InviteSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email Addresses/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email Addresses/i);
    await user.type(emailInput, "valid@email.com, invalid@email");

    const sendButton = screen.getByRole("button", { name: /send invites/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to send to: invalid@email");
    });
  });

  it("clears email input after successful send", async () => {
    const user = userEvent.setup();
    render(<InviteSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email Addresses/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email Addresses/i) as HTMLTextAreaElement;
    await user.type(emailInput, "test@email.com");

    const sendButton = screen.getByRole("button", { name: /send invites/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(emailInput.value).toBe("");
    });
  });

  it("shows empty state when no invites", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/invites")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(<InviteSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByText(/No invitations sent yet/i)).toBeInTheDocument();
    });
  });

  it("shows loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<InviteSection reunionId="r-1" />);

    expect(screen.getByText(/Loading invites.../i)).toBeInTheDocument();
  });

  it("does not show revoke button for accepted invites", async () => {
    render(<InviteSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByText("uncle.bob@email.com")).toBeInTheDocument();
    });

    // Find the accepted invite row
    const acceptedRow = screen.getByText("uncle.bob@email.com").closest("div");

    // It should not have a revoke button (X icon button)
    const revokeButtons = acceptedRow?.querySelectorAll('button');
    expect(revokeButtons?.length).toBe(0);
  });

  it("shows created date for invites", async () => {
    render(<InviteSection reunionId="r-1" />);

    await waitFor(() => {
      // Dates are formatted as 1/10/2025 and 1/11/2025
      const dates = screen.getAllByText(/1\/1[01]\/2025/);
      expect(dates.length).toBeGreaterThan(0);
    });
  });

  it("handles fetch error gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<InviteSection reunionId="r-1" />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load invites");
    });
  });

  it("handles revoke error gracefully", async () => {
    vi.mocked(revokeInvite).mockRejectedValueOnce(new Error("Network error"));

    const user = userEvent.setup();
    render(<InviteSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByText("aunt.jane@email.com")).toBeInTheDocument();
    });

    const revokeButtons = screen.getAllByRole("button");
    const revokeButton = revokeButtons.find((btn) =>
      btn.className.includes("h-7 w-7")
    );

    await user.click(revokeButton!);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to revoke invite");
    });
  });
});

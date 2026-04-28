import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock server actions
vi.mock("@/lib/actions/date", () => ({
  addDateOption: vi.fn(() => Promise.resolve()),
  deleteDateOption: vi.fn(() => Promise.resolve()),
  sendVotingReminders: vi.fn(() => Promise.resolve({ sent: 5 })),
}));

// Mock fetch - must be defined before imports
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import { DateOptionsSection } from "./DateOptionsSection";
import { addDateOption, deleteDateOption, sendVotingReminders } from "@/lib/actions/date";
import { toast } from "sonner";

describe("DateOptionsSection", () => {
  const mockDateOptions = [
    {
      id: "date-1",
      reunionId: "r-1",
      startDate: "2025-07-04",
      endDate: "2025-07-06",
      description: "July 4th weekend",
      createdAt: "2025-01-01T00:00:00Z",
    },
    {
      id: "date-2",
      reunionId: "r-1",
      startDate: "2025-08-15",
      endDate: "2025-08-17",
      description: null,
      createdAt: "2025-01-02T00:00:00Z",
    },
  ];

  const mockVotesResponse = {
    dateOptions: [
      {
        id: "date-1",
        startDate: "2025-07-04",
        endDate: "2025-07-06",
        description: "July 4th weekend",
        votes: { prefer: 3, works: 2, cannot: 1, total: 6 },
      },
      {
        id: "date-2",
        startDate: "2025-08-15",
        endDate: "2025-08-17",
        description: null,
        votes: { prefer: 1, works: 1, cannot: 3, total: 5 },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/dates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDateOptions),
        });
      }
      if (url.includes("/votes")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockVotesResponse),
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  it("renders existing date options", async () => {
    render(<DateOptionsSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Jul 4 - 6, 2025/)).toBeInTheDocument();
      expect(screen.getByText(/Aug 15 - 17, 2025/)).toBeInTheDocument();
    });
  });

  it("organizer can add new date option (start, end, description)", async () => {
    const user = userEvent.setup();
    render(<DateOptionsSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/start date/i);
    const endInput = screen.getByLabelText(/end date/i);
    const descInput = screen.getByLabelText(/description/i);

    await user.type(startInput, "2025-09-01");
    await user.type(endInput, "2025-09-03");
    await user.type(descInput, "Labor Day weekend");

    const addButton = screen.getByRole("button", { name: /add date option/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(addDateOption).toHaveBeenCalledWith("r-1", {
        startDate: "2025-09-01",
        endDate: "2025-09-03",
        description: "Labor Day weekend",
      });
    });
  });

  it("validates end >= start", async () => {
    const user = userEvent.setup();
    render(<DateOptionsSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/start date/i);
    const endInput = screen.getByLabelText(/end date/i);

    await user.type(startInput, "2025-09-10");
    await user.type(endInput, "2025-09-05");

    const addButton = screen.getByRole("button", { name: /add date option/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("End date must be on or after start date");
    });

    expect(addDateOption).not.toHaveBeenCalled();
  });

  it("shows vote tallies", async () => {
    render(<DateOptionsSection reunionId="r-1" />);

    await waitFor(() => {
      // Check for vote tally text (prefer/works/cannot labels)
      expect(screen.getAllByText(/prefer/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/works/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/can't/).length).toBeGreaterThan(0);
    });
  });

  it("can delete date option (organizer only)", async () => {
    const user = userEvent.setup();
    render(<DateOptionsSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Jul 4 - 6, 2025/)).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button");
    const trashButton = deleteButtons.find((btn) =>
      btn.querySelector('svg')?.classList.contains('lucide-trash-2')
    );

    expect(trashButton).toBeInTheDocument();
    await user.click(trashButton!);

    await waitFor(() => {
      expect(deleteDateOption).toHaveBeenCalledWith("date-1");
    });
  });

  it("shows leading badge for winning option", async () => {
    render(<DateOptionsSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByText("Leading")).toBeInTheDocument();
    });

    // The first option should have the leading badge (3 prefer + 2 works = 8 vs 1 prefer + 1 works = 3)
    const leadingBadge = screen.getByText("Leading");
    const dateOption = leadingBadge.closest("div");
    expect(dateOption).toHaveTextContent("Jul 4 - 6, 2025");
  });

  it("can send voting reminders", async () => {
    const user = userEvent.setup();
    render(<DateOptionsSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /send reminders/i })).toBeInTheDocument();
    });

    const remindersButton = screen.getByRole("button", { name: /send reminders/i });
    await user.click(remindersButton);

    await waitFor(() => {
      expect(sendVotingReminders).toHaveBeenCalledWith("r-1");
      expect(toast.success).toHaveBeenCalledWith("Voting reminders sent to 5 households");
    });
  });

  it("clears form after adding date option", async () => {
    const user = userEvent.setup();
    render(<DateOptionsSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/start date/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/end date/i) as HTMLInputElement;
    const descInput = screen.getByLabelText(/description/i) as HTMLInputElement;

    await user.type(startInput, "2025-09-01");
    await user.type(endInput, "2025-09-03");
    await user.type(descInput, "Labor Day weekend");

    const addButton = screen.getByRole("button", { name: /add date option/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(startInput.value).toBe("");
      expect(endInput.value).toBe("");
      expect(descInput.value).toBe("");
    });
  });

  it("shows empty state when no date options", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/dates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes("/votes")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ dateOptions: [] }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(<DateOptionsSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByText(/No date options added yet/i)).toBeInTheDocument();
    });
  });

  it("hides add form when at 4 date limit", async () => {
    const fourOptions = [
      { id: "d1", startDate: "2025-07-01", endDate: "2025-07-03", description: null, createdAt: "2025-01-01T00:00:00Z" },
      { id: "d2", startDate: "2025-08-01", endDate: "2025-08-03", description: null, createdAt: "2025-01-02T00:00:00Z" },
      { id: "d3", startDate: "2025-09-01", endDate: "2025-09-03", description: null, createdAt: "2025-01-03T00:00:00Z" },
      { id: "d4", startDate: "2025-10-01", endDate: "2025-10-03", description: null, createdAt: "2025-01-04T00:00:00Z" },
    ];

    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/dates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(fourOptions),
        });
      }
      if (url.includes("/votes")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ dateOptions: [] }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(<DateOptionsSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Maximum of 4 date options reached/i)).toBeInTheDocument();
    });

    expect(screen.queryByLabelText(/start date/i)).not.toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<DateOptionsSection reunionId="r-1" />);

    expect(screen.getByText(/Loading date options.../i)).toBeInTheDocument();
  });

  it("handles add error gracefully", async () => {
    vi.mocked(addDateOption).mockRejectedValueOnce(new Error("Database error"));

    const user = userEvent.setup();
    render(<DateOptionsSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/start date/i);
    const endInput = screen.getByLabelText(/end date/i);

    await user.type(startInput, "2025-09-01");
    await user.type(endInput, "2025-09-03");

    const addButton = screen.getByRole("button", { name: /add date option/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Database error");
    });
  });

  it("handles delete error gracefully", async () => {
    vi.mocked(deleteDateOption).mockRejectedValueOnce(new Error("Permission denied"));

    const user = userEvent.setup();
    render(<DateOptionsSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Jul 4 - 6, 2025/)).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button");
    const trashButton = deleteButtons.find((btn) =>
      btn.querySelector('svg')?.classList.contains('lucide-trash-2')
    );

    await user.click(trashButton!);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Permission denied");
    });
  });

  it("validates both dates are provided before adding", async () => {
    const user = userEvent.setup();
    render(<DateOptionsSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    });

    const addButton = screen.getByRole("button", { name: /add date option/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Please select both start and end dates");
    });

    expect(addDateOption).not.toHaveBeenCalled();
  });

  it("handles description as optional (omits if empty)", async () => {
    const user = userEvent.setup();
    render(<DateOptionsSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/start date/i);
    const endInput = screen.getByLabelText(/end date/i);

    await user.type(startInput, "2025-09-01");
    await user.type(endInput, "2025-09-03");

    const addButton = screen.getByRole("button", { name: /add date option/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(addDateOption).toHaveBeenCalledWith("r-1", {
        startDate: "2025-09-01",
        endDate: "2025-09-03",
        description: undefined,
      });
    });
  });

  it("shows vote bar visualization when votes exist", async () => {
    const { container } = render(<DateOptionsSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Jul 4 - 6, 2025/)).toBeInTheDocument();
    });

    const voteBars = container.querySelectorAll('[class*="h-2"]');
    expect(voteBars.length).toBeGreaterThan(0);
  });

  it("does not show send reminders button when no date options", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/dates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes("/votes")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ dateOptions: [] }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(<DateOptionsSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByText(/No date options added yet/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /send reminders/i })).not.toBeInTheDocument();
  });
});

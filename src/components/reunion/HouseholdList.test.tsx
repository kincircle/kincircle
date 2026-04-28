import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/actions/household", () => ({
  deleteHousehold: vi.fn(() => Promise.resolve()),
  sendHouseholdInvite: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("./HouseholdDialog", () => ({
  HouseholdDialog: ({
    open,
    household,
  }: {
    open: boolean;
    household?: { primaryContactName?: string } | null;
  }) =>
    open ? (
      <div data-testid="household-dialog">
        {household ? `edit:${household.primaryContactName}` : "create"}
      </div>
    ) : null,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import { HouseholdList } from "./HouseholdList";
import { deleteHousehold, sendHouseholdInvite } from "@/lib/actions/household";
import { toast } from "sonner";

describe("HouseholdList", () => {
  const households = [
    {
      id: "household-1",
      reunionId: "reunion-1",
      claimedByUserId: null,
      primaryContactName: "Jordan Smith",
      primaryContactEmail: "jordan@example.com",
      phone: "555-111-2222",
      invitationStatus: "pending",
      rsvpStatus: "pending",
      claimedAt: null,
      partySize: 2,
      city: "Atlanta",
      state: "GA",
      zipCode: "30303",
      lat: null,
      lng: null,
      dietaryNeeds: null,
      arrivalNotes: null,
      departureNotes: null,
      createdBy: "organizer-1",
      lastEditedBy: null,
      createdAt: "2026-03-14T12:00:00Z",
      updatedAt: "2026-03-14T12:00:00Z",
      members: [],
    },
    {
      id: "household-2",
      reunionId: "reunion-1",
      claimedByUserId: "user-2",
      primaryContactName: "No Email Family",
      primaryContactEmail: null,
      phone: null,
      invitationStatus: "accepted",
      rsvpStatus: "yes",
      claimedAt: "2026-03-12T09:00:00Z",
      partySize: 3,
      city: null,
      state: null,
      zipCode: null,
      lat: null,
      lng: null,
      dietaryNeeds: null,
      arrivalNotes: null,
      departureNotes: null,
      createdBy: null,
      lastEditedBy: null,
      createdAt: "2026-03-10T12:00:00Z",
      updatedAt: "2026-03-12T09:00:00Z",
      members: [
        {
          id: "member-1",
          householdId: "household-2",
          name: "Riley",
          ageGroup: "child",
          age: 9,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(households),
    });
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("renders fetched households and the add action", async () => {
    render(<HouseholdList reunionId="reunion-1" />);

    await waitFor(() => {
      expect(screen.getByText("Jordan Smith")).toBeInTheDocument();
      expect(screen.getByText("No Email Family")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /Add Household/i })
    ).toBeInTheDocument();
  });

  it("opens create mode when add household is clicked", async () => {
    const user = userEvent.setup();
    render(<HouseholdList reunionId="reunion-1" />);

    await waitFor(() => {
      expect(screen.getByText("Jordan Smith")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Add Household/i }));

    expect(screen.getByTestId("household-dialog")).toHaveTextContent("create");
  });

  it("opens edit mode for a household", async () => {
    const user = userEvent.setup();
    render(<HouseholdList reunionId="reunion-1" />);

    await waitFor(() => {
      expect(screen.getByText("Jordan Smith")).toBeInTheDocument();
    });

    const jordanCard = screen.getByText("Jordan Smith").closest("div");
    const editButton = within(
      jordanCard?.parentElement?.parentElement as HTMLElement
    ).getByRole("button", { name: /Edit/i });

    await user.click(editButton);

    expect(screen.getByTestId("household-dialog")).toHaveTextContent(
      "edit:Jordan Smith"
    );
  });

  it("disables send invite when a household has no email", async () => {
    render(<HouseholdList reunionId="reunion-1" />);

    await waitFor(() => {
      expect(screen.getByText("No Email Family")).toBeInTheDocument();
    });

    const inviteButtons = screen.getAllByRole("button", {
      name: /Send Invite/i,
    });

    expect(inviteButtons[0]).not.toBeDisabled();
    expect(inviteButtons[1]).toBeDisabled();
  });

  it("sends an invite from the household row", async () => {
    const user = userEvent.setup();
    render(<HouseholdList reunionId="reunion-1" />);

    await waitFor(() => {
      expect(screen.getByText("Jordan Smith")).toBeInTheDocument();
    });

    await user.click(
      screen.getAllByRole("button", { name: /Send Invite/i })[0]
    );

    await waitFor(() => {
      expect(sendHouseholdInvite).toHaveBeenCalledWith("household-1");
      expect(toast.success).toHaveBeenCalledWith("Invite sent");
    });
  });

  it("deletes a household after confirmation", async () => {
    const user = userEvent.setup();
    render(<HouseholdList reunionId="reunion-1" />);

    await waitFor(() => {
      expect(screen.getByText("Jordan Smith")).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole("button", { name: /Delete/i })[0]);

    await waitFor(() => {
      expect(deleteHousehold).toHaveBeenCalledWith("household-1");
      expect(toast.success).toHaveBeenCalledWith("Household deleted");
    });
  });
});

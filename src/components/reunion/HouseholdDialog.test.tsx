import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/actions/household", () => ({
  createHousehold: vi.fn(() => Promise.resolve({ id: "household-1" })),
  updateHousehold: vi.fn(() => Promise.resolve({ id: "household-1" })),
}));

import { HouseholdDialog, type HouseholdWithMembers } from "./HouseholdDialog";
import { createHousehold, updateHousehold } from "@/lib/actions/household";
import { toast } from "sonner";

describe("HouseholdDialog", () => {
  const existingHousehold: HouseholdWithMembers = {
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
    createdAt: new Date("2026-03-14T12:00:00Z"),
    updatedAt: new Date("2026-03-14T12:00:00Z"),
    members: [
      {
        id: "member-1",
        householdId: "household-1",
        name: "Ava Smith",
        ageGroup: "child",
        age: 8,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a household when only a name is provided", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSaved = vi.fn(() => Promise.resolve());

    render(
      <HouseholdDialog
        reunionId="reunion-1"
        open
        onOpenChange={onOpenChange}
        onSaved={onSaved}
      />
    );

    await user.type(
      screen.getByLabelText(/Primary Contact Name/i),
      "  Taylor Johnson  "
    );
    await user.click(
      screen.getByRole("button", { name: /Create Household/i })
    );

    await waitFor(() => {
      expect(createHousehold).toHaveBeenCalledWith("reunion-1", {
        primaryContactName: "Taylor Johnson",
        primaryContactEmail: undefined,
        phone: undefined,
        city: undefined,
        state: undefined,
        zipCode: undefined,
        members: [],
      });
    });

    expect(toast.success).toHaveBeenCalledWith("Household created");
    expect(onSaved).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("includes added members when creating a household", async () => {
    const user = userEvent.setup();

    render(
      <HouseholdDialog
        reunionId="reunion-1"
        open
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    await user.type(
      screen.getByLabelText(/Primary Contact Name/i),
      "Morgan Lee"
    );
    await user.click(screen.getByRole("button", { name: /Add Member/i }));
    await user.type(screen.getByLabelText(/^Name$/i), "Chris Lee");
    await user.type(screen.getByLabelText(/^Age$/i), "12");

    await user.click(
      screen.getByRole("button", { name: /Create Household/i })
    );

    await waitFor(() => {
      expect(createHousehold).toHaveBeenCalledWith(
        "reunion-1",
        expect.objectContaining({
          primaryContactName: "Morgan Lee",
          members: [
            expect.objectContaining({
              name: "Chris Lee",
              ageGroup: "adult",
              age: 12,
            }),
          ],
        })
      );
    });
  });

  it("prepopulates edit mode and calls updateHousehold", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <HouseholdDialog
        reunionId="reunion-1"
        household={existingHousehold}
        open
        onOpenChange={onOpenChange}
        onSaved={vi.fn()}
      />
    );

    const phoneInput = screen.getByLabelText(/Phone/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, "555-999-0000");

    await user.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(updateHousehold).toHaveBeenCalledWith(
        "household-1",
        expect.objectContaining({
          primaryContactName: "Jordan Smith",
          primaryContactEmail: "jordan@example.com",
          phone: "555-999-0000",
          members: [
            expect.objectContaining({
              id: "member-1",
              name: "Ava Smith",
              ageGroup: "child",
              age: 8,
            }),
          ],
        })
      );
    });

    expect(toast.success).toHaveBeenCalledWith("Household updated");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

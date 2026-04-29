import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import { LocationSection } from "./LocationSection";
import { toast } from "sonner";

describe("LocationSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          centerLat: 39.0997,
          centerLng: -94.5786,
          centerName: "Kansas City, MO",
          lockedLocationName: null,
          lockedLocationLat: null,
          lockedLocationLng: null,
          households: [
            {
              householdId: "hh-1",
              primaryContactName: "Aunt Phyllis",
              distanceMiles: 120,
              estimatedDriveHours: 2.4,
            },
            {
              householdId: "hh-2",
              primaryContactName: "The Zimmermans",
              distanceMiles: 60,
              estimatedDriveHours: 1.2,
            },
          ],
        }),
    });
  });

  it("renders the centered suggestion card and household drive rows", async () => {
    render(<LocationSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByText("Kansas City, MO")).toBeInTheDocument();
    });

    expect(screen.getByText("Suggested / centered")).toBeInTheDocument();
    expect(
      screen.getByText(/avg 1 hr 48 min drive for 2 households/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Aunt Phyllis")).toBeInTheDocument();
    expect(screen.getByText("120 mi")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view map/i })).toHaveAttribute(
      "href",
      "https://www.google.com/maps?q=39.0997,-94.5786"
    );
  });

  it("renders a chosen spot when the reunion has a locked location", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          centerLat: 39.0997,
          centerLng: -94.5786,
          centerName: "Kansas City, MO",
          lockedLocationName: "Lake Anna State Park",
          lockedLocationLat: 38.114,
          lockedLocationLng: -77.809,
          households: [],
        }),
    });

    render(<LocationSection reunionId="r-1" />);

    await waitFor(() => {
      expect(screen.getByText("Lake Anna State Park")).toBeInTheDocument();
    });

    expect(screen.getByText("Chosen spot")).toBeInTheDocument();
  });

  it("shows an empty state when no household coordinates are available", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          centerLat: null,
          centerLng: null,
          centerName: null,
          lockedLocationName: null,
          lockedLocationLat: null,
          lockedLocationLng: null,
          households: [],
        }),
    });

    render(<LocationSection reunionId="r-1" />);

    await waitFor(() => {
      expect(
        screen.getByText(/No location has been chosen yet/i)
      ).toBeInTheDocument();
    });
  });

  it("lets organizers save the centered suggestion", async () => {
    const user = userEvent.setup();
    render(<LocationSection reunionId="r-1" isOrganizer />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /use suggestion/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /use suggestion/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/reunions/r-1/location",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            locationName: "Kansas City, MO",
            locationLat: 39.0997,
            locationLng: -94.5786,
          }),
        })
      );
    });
  });

  it("handles fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<LocationSection reunionId="r-1" />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load location data");
    });
  });
});

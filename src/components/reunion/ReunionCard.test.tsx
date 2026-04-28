import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReunionCard } from "./ReunionCard";
import type { Reunion } from "@/types";

describe("ReunionCard", () => {
  const baseReunion: Reunion = {
    id: "reunion-1",
    name: "Smith Family Reunion 2026",
    description: "Annual summer gathering",
    status: "planning",
    organizerId: "user-1",
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
  };

  it("renders reunion name", () => {
    render(<ReunionCard reunion={baseReunion} />);
    expect(screen.getByText("Smith Family Reunion 2026")).toBeInTheDocument();
  });

  it("renders reunion status badge", () => {
    render(<ReunionCard reunion={baseReunion} />);
    expect(screen.getByText("Planning")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<ReunionCard reunion={baseReunion} />);
    expect(screen.getByText("Annual summer gathering")).toBeInTheDocument();
  });

  it("renders created date", () => {
    render(<ReunionCard reunion={baseReunion} />);
    expect(screen.getByText(/Created/i)).toBeInTheDocument();
    expect(screen.getByText(/1\/15\/2025/)).toBeInTheDocument();
  });

  it("shows 'Organizer' when isOrganizer is true", () => {
    render(<ReunionCard reunion={baseReunion} isOrganizer={true} />);
    expect(screen.getByText(/Organizer/i)).toBeInTheDocument();
  });

  it("shows 'Member' when isOrganizer is false", () => {
    render(<ReunionCard reunion={baseReunion} isOrganizer={false} />);
    expect(screen.getByText(/Member/i)).toBeInTheDocument();
  });

  it("shows 'Member' when isOrganizer is undefined", () => {
    render(<ReunionCard reunion={baseReunion} />);
    expect(screen.getByText(/Member/i)).toBeInTheDocument();
  });

  it("links to reunion detail page", () => {
    render(<ReunionCard reunion={baseReunion} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/reunion/reunion-1");
  });

  it("shows different status colors for planning", () => {
    render(<ReunionCard reunion={{ ...baseReunion, status: "planning" }} />);
    const badge = screen.getByText("Planning");
    expect(badge).toHaveClass("bg-secondary");
  });

  it("shows different status colors for date_locked", () => {
    render(<ReunionCard reunion={{ ...baseReunion, status: "date_locked" }} />);
    const badge = screen.getByText("Date Locked");
    expect(badge).toHaveClass("bg-primary");
  });

  it("shows different status colors for finalized", () => {
    render(<ReunionCard reunion={{ ...baseReunion, status: "finalized" }} />);
    const badge = screen.getByText("Finalized");
    expect(badge).toHaveClass("border");
  });

  it("shows different status colors for cancelled", () => {
    render(<ReunionCard reunion={{ ...baseReunion, status: "cancelled" }} />);
    const badge = screen.getByText("Cancelled");
    expect(badge).toHaveClass("bg-destructive/10");
    expect(badge).toHaveClass("text-destructive");
  });

  it("does not render description when not provided", () => {
    const reunionWithoutDescription: Reunion = {
      ...baseReunion,
      description: null,
    };
    render(<ReunionCard reunion={reunionWithoutDescription} />);
    // Description element should not exist
    expect(screen.queryByText("Annual summer gathering")).not.toBeInTheDocument();
  });

  it("renders card with hover styles", () => {
    const { container } = render(<ReunionCard reunion={baseReunion} />);
    const card = container.querySelector('[class*="cursor-pointer"]');
    expect(card).toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReunionSteps, type StepConfig } from "./ReunionSteps";

const steps: StepConfig[] = [
  {
    id: "reunion-invite",
    number: 1,
    title: "Invite households",
    summary: "2 households added",
    state: "done",
    body: <p>Invite body</p>,
  },
  {
    id: "reunion-dates",
    number: 2,
    title: "Pick a date",
    summary: "Add date options",
    state: "active",
    body: <p>Date body</p>,
  },
  {
    id: "reunion-location",
    number: 3,
    title: "Choose a location",
    summary: "Lock a date first",
    state: "pending",
    body: <p>Location body</p>,
  },
];

describe("ReunionSteps", () => {
  it("expands the initial step", () => {
    render(
      <ReunionSteps steps={steps} initialExpandedId="reunion-dates" />
    );

    expect(screen.getByText("Date body")).toBeInTheDocument();
    expect(screen.queryByText("Invite body")).not.toBeInTheDocument();
  });

  it("keeps only one step expanded at a time", async () => {
    const user = userEvent.setup();
    render(
      <ReunionSteps steps={steps} initialExpandedId="reunion-dates" />
    );

    await user.click(screen.getByRole("button", { name: /Invite households/i }));

    expect(screen.getByText("Invite body")).toBeInTheDocument();
    expect(screen.queryByText("Date body")).not.toBeInTheDocument();
  });

  it("collapses an expanded step when clicked again", async () => {
    const user = userEvent.setup();
    render(
      <ReunionSteps steps={steps} initialExpandedId="reunion-dates" />
    );

    await user.click(screen.getByRole("button", { name: /Pick a date/i }));

    expect(screen.queryByText("Date body")).not.toBeInTheDocument();
  });
});

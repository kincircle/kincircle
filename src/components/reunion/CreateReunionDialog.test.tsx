import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock server actions BEFORE importing component
vi.mock("@/lib/actions/reunion", () => ({
  createReunion: vi.fn(() => Promise.resolve({ id: "test-123", name: "Test Reunion" })),
}));

import { CreateReunionDialog } from "./CreateReunionDialog";
import { createReunion } from "@/lib/actions/reunion";
import { toast } from "sonner";

describe("CreateReunionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders trigger button", () => {
    render(<CreateReunionDialog />);
    expect(screen.getByRole("button", { name: /new reunion/i })).toBeInTheDocument();
  });

  it("opens dialog on click", async () => {
    const user = userEvent.setup();
    render(<CreateReunionDialog />);

    const trigger = screen.getByRole("button", { name: /new reunion/i });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Create a Reunion")).toBeInTheDocument();
    });
  });

  it("shows name and description inputs", async () => {
    const user = userEvent.setup();
    render(<CreateReunionDialog />);

    await user.click(screen.getByRole("button", { name: /new reunion/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });
  });

  it("validates empty name (doesn't submit)", async () => {
    const user = userEvent.setup();
    render(<CreateReunionDialog />);

    await user.click(screen.getByRole("button", { name: /new reunion/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const submitButton = screen.getByRole("button", { name: /create reunion/i });
    expect(submitButton).toBeDisabled();

    // Typing spaces only should still be disabled
    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, "   ");

    expect(submitButton).toBeDisabled();
    expect(createReunion).not.toHaveBeenCalled();
  });

  it("calls createReunion with form data on submit", async () => {
    const user = userEvent.setup();
    render(<CreateReunionDialog />);

    await user.click(screen.getByRole("button", { name: /new reunion/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/name/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    await user.type(nameInput, "Smith Family Reunion 2026");
    await user.type(descriptionInput, "Annual family gathering");

    const submitButton = screen.getByRole("button", { name: /create reunion/i });
    expect(submitButton).not.toBeDisabled();

    await user.click(submitButton);

    await waitFor(() => {
      expect(createReunion).toHaveBeenCalledWith({
        name: "Smith Family Reunion 2026",
        description: "Annual family gathering",
      });
    });
  });

  it("shows success toast and closes dialog on success", async () => {
    const user = userEvent.setup();
    render(<CreateReunionDialog />);

    await user.click(screen.getByRole("button", { name: /new reunion/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, "Test Reunion");

    const submitButton = screen.getByRole("button", { name: /create reunion/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Reunion created!");
    });

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows error toast on failure", async () => {
    vi.mocked(createReunion).mockRejectedValueOnce(new Error("Network error"));

    const user = userEvent.setup();
    render(<CreateReunionDialog />);

    await user.click(screen.getByRole("button", { name: /new reunion/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, "Test Reunion");

    const submitButton = screen.getByRole("button", { name: /create reunion/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to create reunion");
    });

    // Dialog should remain open on error
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("handles description as optional (omits if empty)", async () => {
    const user = userEvent.setup();
    render(<CreateReunionDialog />);

    await user.click(screen.getByRole("button", { name: /new reunion/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, "Test Reunion");

    const submitButton = screen.getByRole("button", { name: /create reunion/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(createReunion).toHaveBeenCalledWith({
        name: "Test Reunion",
        description: undefined,
      });
    });
  });

  it("shows loading state while submitting", async () => {
    let resolveCreate: (value: unknown) => void;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    vi.mocked(createReunion).mockReturnValue(createPromise as Promise<{ id: string; name: string }>);

    const user = userEvent.setup();
    render(<CreateReunionDialog />);

    await user.click(screen.getByRole("button", { name: /new reunion/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, "Test Reunion");

    const submitButton = screen.getByRole("button", { name: /create reunion/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Creating...")).toBeInTheDocument();
    });

    // Resolve the promise
    resolveCreate!({ id: "test-123", name: "Test Reunion" });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("trims whitespace from inputs", async () => {
    const user = userEvent.setup();
    render(<CreateReunionDialog />);

    await user.click(screen.getByRole("button", { name: /new reunion/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/name/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    await user.type(nameInput, "  Trimmed Name  ");
    await user.type(descriptionInput, "  Trimmed Description  ");

    const submitButton = screen.getByRole("button", { name: /create reunion/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(createReunion).toHaveBeenCalledWith({
        name: "Trimmed Name",
        description: "Trimmed Description",
      });
    });
  });
});

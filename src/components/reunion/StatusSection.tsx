"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { finalizeReunion } from "@/lib/actions/finalize";

interface StatusSectionProps {
  reunionId: string;
  currentStatus: string;
  lockedLocationName?: string | null;
  lockedLocationLat?: number | null;
  lockedLocationLng?: number | null;
}

export function StatusSection({
  reunionId,
  currentStatus,
  lockedLocationName = null,
  lockedLocationLat = null,
  lockedLocationLng = null,
}: StatusSectionProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleFinalize() {
    if (!lockedLocationName) {
      return;
    }

    try {
      setSubmitting(true);
      await finalizeReunion(
        reunionId,
        lockedLocationName,
        lockedLocationLat,
        lockedLocationLng
      );
      toast.success("Reunion finalized!");
      router.refresh();
    } catch (error) {
      toast.error("Failed to finalize reunion");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  if (currentStatus === "cancelled") {
    return (
      <p className="muted rounded-[var(--radius-md)] border border-dashed border-[var(--border)] py-4 text-center text-sm">
        This reunion has been cancelled.
      </p>
    );
  }

  if (currentStatus === "finalized") {
    return (
      <div className="space-y-4">
        <div
          className="rounded-[var(--radius-md)] p-4"
          style={{ background: "var(--sage-soft)" }}
        >
          <p className="mb-1 text-sm font-medium">Final plan sent</p>
          <p className="muted text-sm">
            The date and location are locked and the plan is ready for everyone.
          </p>
        </div>
        <Link href={`/reunion/${reunionId}/plan`} className="btn ghost sm">
          <ExternalLink className="h-4 w-4" />
          View final plan
        </Link>
      </div>
    );
  }

  if (currentStatus !== "date_locked") {
    return (
      <p className="muted rounded-[var(--radius-md)] border border-dashed border-[var(--border)] py-4 text-center text-sm">
        Lock a date before sending the final plan.
      </p>
    );
  }

  if (!lockedLocationName) {
    return (
      <p className="muted rounded-[var(--radius-md)] border border-dashed border-[var(--border)] py-4 text-center text-sm">
        Choose and save a location before sending the final plan.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-[var(--radius-md)] p-4"
        style={{ background: "var(--sage-soft)" }}
      >
        <p className="mb-1 text-sm font-medium">Ready to send</p>
        <p className="text-lg font-semibold">{lockedLocationName}</p>
        {lockedLocationLat !== null && lockedLocationLng !== null && (
          <p className="muted mt-1 text-sm">
            {lockedLocationLat.toFixed(4)}, {lockedLocationLng.toFixed(4)}
          </p>
        )}
      </div>

      <button
        type="button"
        className="btn primary sm disabled:pointer-events-none disabled:opacity-50"
        disabled={submitting}
        onClick={handleFinalize}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Send final plan
      </button>

      <p className="muted flex items-center gap-2 text-sm">
        <MapPin className="h-4 w-4" />
        This locks the saved location and emails the final plan.
      </p>
    </div>
  );
}

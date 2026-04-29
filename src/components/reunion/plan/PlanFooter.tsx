"use client";

import Link from "next/link";

export function PlanFooter({
  reunionId,
  calendarHref,
}: {
  reunionId: string;
  calendarHref: string | null;
}) {
  return (
    <footer className="kc-plan-footer">
      <div className="kc-plan-footer-row">
        <Link href={`/reunion/${reunionId}`}>Back to reunion</Link>
        <button type="button" onClick={() => window.print()}>
          Print this plan
        </button>
        {calendarHref ? (
          <a href={calendarHref} target="_blank" rel="noopener noreferrer">
            Add to calendar
          </a>
        ) : null}
      </div>
      <small>KinCircle &middot; Made with warm light.</small>
    </footer>
  );
}

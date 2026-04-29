function initials(name: string | null | undefined): string {
  if (!name) return "KC";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "KC";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface UpdateItem {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  authorName: string | null;
}

interface UpdatesStackProps {
  updates: UpdateItem[];
}

export function UpdatesStack({ updates }: UpdatesStackProps) {
  if (updates.length === 0) {
    return <p className="kc-plan-empty">No updates have been posted yet.</p>;
  }

  return (
    <div className="kc-updates-stack">
      {updates.map((update) => (
        <div key={update.id} className="kc-update-bubble">
          <span className="avatar">{initials(update.authorName)}</span>
          <div>
            <small>
              <strong>{update.authorName ?? "Organizer"}</strong>{" "}
              &middot; {formatRelative(update.createdAt)}
            </small>
            <p>{update.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

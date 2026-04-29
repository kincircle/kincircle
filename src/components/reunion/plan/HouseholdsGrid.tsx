import type { Household, HouseholdMember } from "@/types";

interface HouseholdsGridProps {
  households: Household[];
  members: HouseholdMember[];
  organizerId: string;
}

function initials(name: string | null | undefined): string {
  if (!name) return "KC";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "KC";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function HouseholdsGrid({
  households,
  members,
  organizerId,
}: HouseholdsGridProps) {
  const memberCountByHousehold = new Map<string, number>();
  for (const member of members) {
    memberCountByHousehold.set(
      member.householdId,
      (memberCountByHousehold.get(member.householdId) ?? 0) + 1
    );
  }

  const totalPartySize = households.reduce(
    (sum, h) => sum + (h.partySize ?? 1),
    0
  );
  const childCount = members.filter((m) => m.ageGroup === "child").length;
  const adultCount = Math.max(
    members.filter((m) => m.ageGroup === "adult").length,
    totalPartySize - childCount
  );

  // Count unique states; fall back to unique cities if state data is sparse
  const uniqueStates = new Set(households.map((h) => h.state).filter(Boolean));
  const stateCount = uniqueStates.size;
  const uniqueCities = new Set(
    households.map((h) => [h.city, h.state].filter(Boolean).join(", ")).filter(Boolean)
  );
  const locationCount = stateCount > 0 ? stateCount : uniqueCities.size;
  const locationLabel = stateCount > 0 ? "states" : "cities";

  return (
    <>
      {households.length > 0 ? (
        <div className="kc-households-grid">
          {households.map((h) => {
            // Find the host household: the one whose claimedByUserId matches organizerId
            const isHost = h.claimedByUserId === organizerId;
            const memberCount =
              memberCountByHousehold.get(h.id) ?? h.partySize ?? 1;
            const location = [h.city, h.state].filter(Boolean).join(", ");

            return (
              <div key={h.id} className="kc-household-card">
                <span className="avatar">{initials(h.primaryContactName)}</span>
                <div className="kc-household-who">
                  <p>
                    {h.primaryContactName}
                    {isHost && (
                      <span className="badge sage" style={{ marginLeft: "0.4rem" }}>
                        host
                      </span>
                    )}
                    {h.rsvpStatus === "maybe" && (
                      <span className="badge muted" style={{ marginLeft: "0.4rem" }}>
                        maybe
                      </span>
                    )}
                  </p>
                  {location && <small>{location}</small>}
                </div>
                <span className="kc-household-count">{memberCount}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="kc-plan-empty">No confirmed attendees yet.</p>
      )}

      <div className="kc-total-strip">
        <div className="kc-total-stat">
          <div>{households.length}</div>
          <span>households</span>
        </div>
        <div className="kc-total-stat">
          <div>{totalPartySize}</div>
          <span>people</span>
        </div>
        <div className="kc-total-stat">
          <div>{adultCount}</div>
          <span>adults</span>
        </div>
        <div className="kc-total-stat">
          <div>{childCount}</div>
          <span>kids</span>
        </div>
        <div className="kc-total-stat">
          <div>
            <em>{locationCount}</em>
          </div>
          <span>{locationLabel}</span>
        </div>
      </div>
    </>
  );
}

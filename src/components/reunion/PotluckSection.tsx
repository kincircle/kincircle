"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export type PotluckListItem = {
  id: string;
  name: string;
  notes: string | null;
  claimedByHouseholdId: string | null;
  claimedByHouseholdName: string | null;
};

type PotluckRow = PotluckListItem & {
  suggested: boolean;
};

const DEFAULT_ITEMS: Array<Pick<PotluckListItem, "name" | "notes">> = [
  { name: "Mac & cheese", notes: "Serves about 15" },
  { name: "Cornbread", notes: "One tray or basket" },
  { name: "Sweet tea", notes: "5 gallons" },
  { name: "Collard greens", notes: "Serves about 15" },
  { name: "Dessert", notes: "Cobbler, pies, or cookies" },
  { name: "Cooler with ice and kids' drinks", notes: "Open" },
];

function normalizeKey(name: string) {
  return name.trim().toLocaleLowerCase();
}

function mergeItems(items: PotluckListItem[]): PotluckRow[] {
  const byName = new Map(items.map((item) => [normalizeKey(item.name), item]));
  const defaultRows = DEFAULT_ITEMS.map((suggestion) => {
    const persisted = byName.get(normalizeKey(suggestion.name));
    return persisted
      ? { ...persisted, suggested: true }
      : {
          id: `suggested:${suggestion.name}`,
          name: suggestion.name,
          notes: suggestion.notes,
          claimedByHouseholdId: null,
          claimedByHouseholdName: null,
          suggested: true,
        };
  });
  const customRows = items
    .filter((item) => !DEFAULT_ITEMS.some((suggestion) => normalizeKey(suggestion.name) === normalizeKey(item.name)))
    .map((item) => ({ ...item, suggested: false }));

  return [...defaultRows, ...customRows];
}

export function PotluckSection({
  reunionId,
  initialItems,
  currentHouseholdId,
  canClaim,
}: {
  reunionId: string;
  initialItems: PotluckListItem[];
  currentHouseholdId: string | null;
  canClaim: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");

  const rows = useMemo(() => mergeItems(items), [items]);

  async function submitPotluckAction(payload: Record<string, unknown>) {
    const res = await fetch(`/api/reunions/${reunionId}/potluck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Could not update potluck item");
    }

    const updated = data.item as PotluckListItem;
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === updated.id);
      if (index >= 0) {
        return prev.map((item) => (item.id === updated.id ? updated : item));
      }

      const sameNameIndex = prev.findIndex(
        (item) => normalizeKey(item.name) === normalizeKey(updated.name)
      );
      if (sameNameIndex >= 0) {
        return prev.map((item, itemIndex) =>
          itemIndex === sameNameIndex ? updated : item
        );
      }

      return [...prev, updated];
    });
  }

  async function claim(row: PotluckRow) {
    setPendingKey(row.id);
    try {
      await submitPotluckAction({
        action: "claim",
        itemId: row.suggested ? undefined : row.id,
        name: row.name,
        notes: row.notes,
      });
      toast.success(`You're bringing ${row.name}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not claim item");
    } finally {
      setPendingKey(null);
    }
  }

  async function release(row: PotluckRow) {
    setPendingKey(row.id);
    try {
      await submitPotluckAction({ action: "release", itemId: row.id });
      toast.success(`${row.name} is open again.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not release item");
    } finally {
      setPendingKey(null);
    }
  }

  async function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newItemName.trim();
    if (!name) return;

    setPendingKey("new-item");
    try {
      await submitPotluckAction({
        action: "create",
        name,
        notes: newItemNotes.trim() || undefined,
      });
      setNewItemName("");
      setNewItemNotes("");
      toast.success("Potluck item added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add item");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <section className="kc-potluck-band">
      <div className="kc-potluck-inner">
        <div className="kc-plan-section-head">
          <span className="section-eyebrow">Bring something delicious</span>
          <h2>
            The <em>potluck.</em>
          </h2>
          <p>
            The organizer is covering the main entree. Sign up for what
            you&apos;ll bring so the table has the right mix.
          </p>
        </div>

        <div className="kc-potluck-list">
          {rows.map((row) => {
            const isClaimed = Boolean(row.claimedByHouseholdId);
            const claimedByMe = row.claimedByHouseholdId === currentHouseholdId;
            const pending = pendingKey === row.id;

            return (
              <div
                key={row.id}
                className={`kc-potluck-row${isClaimed ? " claimed" : ""}`}
              >
                <div className="kc-potluck-check" aria-hidden="true">
                  {isClaimed && <Check className="h-4 w-4" />}
                </div>
                <div className="kc-potluck-item">
                  <h4>{row.name}</h4>
                  <small>
                    {row.claimedByHouseholdName
                      ? `Bringing it: ${row.claimedByHouseholdName}`
                      : row.notes
                        ? `Open - ${row.notes}`
                        : "Open"}
                  </small>
                </div>

                {isClaimed && !claimedByMe && (
                  <span className="badge sage">Claimed</span>
                )}
                {claimedByMe && (
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => release(row)}
                    disabled={pending}
                  >
                    {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Release
                  </button>
                )}
                {!isClaimed && canClaim && (
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => claim(row)}
                    disabled={pending}
                  >
                    {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Sign me up
                  </button>
                )}
                {!isClaimed && !canClaim && (
                  <span className="badge muted">Open</span>
                )}
              </div>
            );
          })}
        </div>

        <form className="kc-potluck-add" onSubmit={addItem}>
          <div>
            <label htmlFor="potluck-name">Add an item</label>
            <input
              id="potluck-name"
              value={newItemName}
              onChange={(event) => setNewItemName(event.target.value)}
              placeholder="Fruit salad, paper plates, yard games..."
              maxLength={120}
            />
          </div>
          <div>
            <label htmlFor="potluck-notes">Notes</label>
            <input
              id="potluck-notes"
              value={newItemNotes}
              onChange={(event) => setNewItemNotes(event.target.value)}
              placeholder="Optional"
              maxLength={240}
            />
          </div>
          <button
            type="submit"
            className="btn"
            disabled={!newItemName.trim() || pendingKey === "new-item"}
          >
            {pendingKey === "new-item" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </button>
        </form>
      </div>
    </section>
  );
}

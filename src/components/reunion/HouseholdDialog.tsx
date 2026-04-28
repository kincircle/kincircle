"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createHousehold, updateHousehold } from "@/lib/actions/household";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AgeGroup, Household, HouseholdMember } from "@/types";

interface HouseholdDialogProps {
  reunionId: string;
  household?: HouseholdWithMembers | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}

export type HouseholdWithMembers = Household & {
  members: HouseholdMember[];
};

interface MemberDraft {
  id: string;
  name: string;
  ageGroup: AgeGroup;
  age: string;
}

interface HouseholdFormState {
  primaryContactName: string;
  primaryContactEmail: string;
  phone: string;
  city: string;
  state: string;
  zipCode: string;
  members: MemberDraft[];
}

const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  adult: "Adult",
  child: "Child",
};

const US_STATES = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
] as const;

function createMemberDraft(member?: Partial<HouseholdMember>): MemberDraft {
  return {
    id:
      member?.id ||
      globalThis.crypto?.randomUUID?.() ||
      `member-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: member?.name ?? "",
    ageGroup: member?.ageGroup === "child" ? "child" : "adult",
    age: member?.age !== null && member?.age !== undefined ? String(member.age) : "",
  };
}

function createInitialState(household?: HouseholdWithMembers | null): HouseholdFormState {
  if (!household) {
    return {
      primaryContactName: "",
      primaryContactEmail: "",
      phone: "",
      city: "",
      state: "",
      zipCode: "",
      members: [],
    };
  }

  return {
    primaryContactName: household.primaryContactName ?? "",
    primaryContactEmail: household.primaryContactEmail ?? "",
    phone: household.phone ?? "",
    city: household.city ?? "",
    state: household.state ?? "",
    zipCode: household.zipCode ?? "",
    members: household.members.map((member) => createMemberDraft(member)),
  };
}

export function HouseholdDialog({
  reunionId,
  household,
  open,
  onOpenChange,
  onSaved,
}: HouseholdDialogProps) {
  const isEditMode = Boolean(household);
  const [form, setForm] = useState<HouseholdFormState>(() =>
    createInitialState(household)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(createInitialState(household));
    }
  }, [household, open]);

  function setField<Key extends keyof HouseholdFormState>(
    field: Key,
    value: HouseholdFormState[Key]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addMember() {
    setForm((current) => ({
      ...current,
      members: [...current.members, createMemberDraft()],
    }));
  }

  function removeMember(memberId: string) {
    setForm((current) => ({
      ...current,
      members: current.members.filter((member) => member.id !== memberId),
    }));
  }

  function updateMember(
    memberId: string,
    field: keyof MemberDraft,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === memberId ? { ...member, [field]: value } : member
      ),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.primaryContactName.trim()) {
      return;
    }

    const members = form.members
      .filter((member) => member.name.trim().length > 0)
      .map((member) => ({
        id: member.id,
        name: member.name.trim(),
        ageGroup: member.ageGroup,
        age:
          member.age.trim().length > 0
            ? Number.parseInt(member.age.trim(), 10)
            : undefined,
      }));

    setSaving(true);
    try {
      if (isEditMode && household) {
        await updateHousehold(household.id, {
          primaryContactName: form.primaryContactName.trim(),
          primaryContactEmail: form.primaryContactEmail.trim() || undefined,
          phone: form.phone.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          zipCode: form.zipCode.trim() || undefined,
          members,
        });
        toast.success("Household updated");
      } else {
        await createHousehold(reunionId, {
          primaryContactName: form.primaryContactName.trim(),
          primaryContactEmail: form.primaryContactEmail.trim() || undefined,
          phone: form.phone.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          zipCode: form.zipCode.trim() || undefined,
          members,
        });
        toast.success("Household created");
      }

      await onSaved();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save household";
      toast.error(message);
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Household" : "Add Household"}
            </DialogTitle>
            <DialogDescription>
              Add a household with a primary contact now and update members or
              contact details later.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="primaryContactName">Primary Contact Name</Label>
              <Input
                id="primaryContactName"
                value={form.primaryContactName}
                onChange={(event) =>
                  setField("primaryContactName", event.target.value)
                }
                placeholder="e.g. Jordan Smith"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryContactEmail">Email</Label>
              <Input
                id="primaryContactEmail"
                type="email"
                value={form.primaryContactEmail}
                onChange={(event) =>
                  setField("primaryContactEmail", event.target.value)
                }
                placeholder="family@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(event) => setField("city", event.target.value)}
                placeholder="Atlanta"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select
                value={form.state || null}
                onValueChange={(value) =>
                  setField("state", typeof value === "string" ? value : "")
                }
              >
                <SelectTrigger className="w-full" id="state">
                  <SelectValue>
                    {(value) =>
                      typeof value === "string"
                        ? US_STATES.find(([abbr]) => abbr === value)?.[1] ?? value
                        : "Select a state"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map(([abbr, name]) => (
                    <SelectItem key={abbr} value={abbr}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input
                id="zipCode"
                value={form.zipCode}
                onChange={(event) => setField("zipCode", event.target.value)}
                placeholder="30303"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-medium">Members</h3>
                <p className="text-sm text-muted-foreground">
                  Add adults or children in this household.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addMember}>
                <Plus className="h-3.5 w-3.5" />
                Add Member
              </Button>
            </div>

            {form.members.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No additional household members yet.
              </div>
            ) : (
              <div className="space-y-3">
                {form.members.map((member, index) => (
                  <div
                    key={member.id}
                    className="rounded-lg border p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Member {index + 1}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeMember(member.id)}
                        aria-label={`Remove member ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_120px]">
                      <div className="space-y-2">
                        <Label htmlFor={`member-name-${member.id}`}>Name</Label>
                        <Input
                          id={`member-name-${member.id}`}
                          value={member.name}
                          onChange={(event) =>
                            updateMember(member.id, "name", event.target.value)
                          }
                          placeholder="Member name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`member-age-group-${member.id}`}>
                          Age Group
                        </Label>
                        <Select
                          value={member.ageGroup}
                          onValueChange={(value) =>
                            updateMember(
                              member.id,
                              "ageGroup",
                              value === "child" ? "child" : "adult"
                            )
                          }
                        >
                          <SelectTrigger
                            className="w-full"
                            id={`member-age-group-${member.id}`}
                          >
                            <SelectValue>
                              {(value) =>
                                typeof value === "string"
                                  ? AGE_GROUP_LABELS[
                                      value === "child" ? "child" : "adult"
                                    ]
                                  : "Select age group"
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="adult">Adult</SelectItem>
                            <SelectItem value="child">Child</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`member-age-${member.id}`}>Age</Label>
                        <Input
                          id={`member-age-${member.id}`}
                          type="number"
                          min={0}
                          value={member.age}
                          onChange={(event) =>
                            updateMember(member.id, "age", event.target.value)
                          }
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.primaryContactName.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditMode ? "Save Changes" : "Create Household"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

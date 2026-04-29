import type { InferSelectModel } from "drizzle-orm";
import type {
  reunion,
  household,
  householdMember,
  invite,
  dateOption,
  dateVote,
  potluckItem,
  reunionUpdate,
  user,
} from "@/db/schema";

export type User = InferSelectModel<typeof user>;
export type Reunion = InferSelectModel<typeof reunion>;
export type Household = InferSelectModel<typeof household>;
export type HouseholdMember = InferSelectModel<typeof householdMember>;
export type Invite = InferSelectModel<typeof invite>;
export type DateOption = InferSelectModel<typeof dateOption>;
export type DateVote = InferSelectModel<typeof dateVote>;
export type PotluckItem = InferSelectModel<typeof potluckItem>;
export type ReunionUpdate = InferSelectModel<typeof reunionUpdate>;

export type ReunionStatus = "planning" | "date_locked" | "finalized" | "cancelled";
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";
export type HouseholdInvitationStatus = "not_sent" | "pending" | "accepted" | "revoked" | "expired";
export type RSVPStatus = "pending" | "yes" | "no" | "maybe";
export type VoteChoice = "works" | "prefer" | "cannot";
export type AgeGroup = "adult" | "child";

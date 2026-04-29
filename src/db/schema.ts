import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  date,
  uniqueIndex,
  doublePrecision,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Auth tables - defined here for migrations, managed by Better Auth at runtime
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => [
  index("session_user_id_idx").on(table.userId),
]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("account_user_id_idx").on(table.userId),
  uniqueIndex("account_provider_account_idx").on(table.providerId, table.accountId),
]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("verification_identifier_idx").on(table.identifier),
]);

// KinCircle tables
export const reunion = pgTable("reunion", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  organizerId: text("organizer_id").notNull().references(() => user.id),
  status: text("status", { enum: ["planning", "date_locked", "finalized", "cancelled"] }).notNull().default("planning"),
  lockedDate: date("locked_date"),
  lockedDateOptionId: uuid("locked_date_option_id").references((): AnyPgColumn => dateOption.id, { onDelete: "set null" }),
  lockedLocationName: text("locked_location_name"),
  lockedLocationLat: doublePrecision("locked_location_lat"),
  lockedLocationLng: doublePrecision("locked_location_lng"),
  heroImageUrl: text("hero_image_url"),
  heroImagePublicId: text("hero_image_public_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("reunion_organizer_id_idx").on(table.organizerId),
  index("reunion_locked_date_option_id_idx").on(table.lockedDateOptionId),
  check("reunion_status_check", sql`${table.status} in ('planning', 'date_locked', 'finalized', 'cancelled')`),
]);

export const household = pgTable("household", {
  id: uuid("id").primaryKey().defaultRandom(),
  reunionId: uuid("reunion_id").notNull().references(() => reunion.id, { onDelete: "cascade" }),
  claimedByUserId: text("claimed_by_user_id").references(() => user.id, { onDelete: "set null" }),
  primaryContactName: text("primary_contact_name").notNull(),
  primaryContactEmail: text("primary_contact_email"),
  phone: text("phone"),
  invitationStatus: text("invitation_status", { enum: ["not_sent", "pending", "accepted", "revoked", "expired"] }).notNull().default("not_sent"),
  rsvpStatus: text("rsvp_status", { enum: ["pending", "yes", "no", "maybe"] }).notNull().default("pending"),
  claimedAt: timestamp("claimed_at"),
  partySize: integer("party_size").notNull().default(1),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  dietaryNeeds: text("dietary_needs"),
  arrivalNotes: text("arrival_notes"),
  departureNotes: text("departure_notes"),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  lastEditedBy: text("last_edited_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("household_reunion_id_idx").on(table.reunionId),
  index("household_claimed_by_user_id_idx").on(table.claimedByUserId),
  index("household_reunion_claimed_by_user_idx").on(table.reunionId, table.claimedByUserId),
  check("household_invitation_status_check", sql`${table.invitationStatus} in ('not_sent', 'pending', 'accepted', 'revoked', 'expired')`),
  check("household_rsvp_status_check", sql`${table.rsvpStatus} in ('pending', 'yes', 'no', 'maybe')`),
  check("household_party_size_check", sql`${table.partySize} >= 1`),
  check("household_latitude_check", sql`${table.lat} is null or (${table.lat} >= -90 and ${table.lat} <= 90)`),
  check("household_longitude_check", sql`${table.lng} is null or (${table.lng} >= -180 and ${table.lng} <= 180)`),
]);

export const householdMember = pgTable("household_member", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").notNull().references(() => household.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ageGroup: text("age_group", { enum: ["adult", "child"] }).notNull().default("adult"),
  age: integer("age"),
}, (table) => [
  index("household_member_household_id_idx").on(table.householdId),
  check("household_member_age_group_check", sql`${table.ageGroup} in ('adult', 'child')`),
  check("household_member_age_check", sql`${table.age} is null or ${table.age} >= 0`),
]);

export const potluckItem = pgTable("potluck_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  reunionId: uuid("reunion_id").notNull().references(() => reunion.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  notes: text("notes"),
  claimedByHouseholdId: uuid("claimed_by_household_id").references(() => household.id, { onDelete: "set null" }),
  claimedAt: timestamp("claimed_at"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("potluck_item_reunion_id_idx").on(table.reunionId),
  index("potluck_item_claimed_by_household_id_idx").on(table.claimedByHouseholdId),
  uniqueIndex("potluck_item_reunion_name_idx").on(table.reunionId, table.name),
]);

export const invite = pgTable("invite", {
  id: uuid("id").primaryKey().defaultRandom(),
  reunionId: uuid("reunion_id").notNull().references(() => reunion.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  email: text("email").notNull(),
  householdId: uuid("household_id").references(() => household.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "accepted", "revoked", "expired"] }).notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("invite_reunion_id_idx").on(table.reunionId),
  index("invite_household_id_idx").on(table.householdId),
  index("invite_reunion_email_idx").on(table.reunionId, table.email),
  check("invite_status_check", sql`${table.status} in ('pending', 'accepted', 'revoked', 'expired')`),
]);

export const dateOption = pgTable("date_option", {
  id: uuid("id").primaryKey().defaultRandom(),
  reunionId: uuid("reunion_id").notNull().references(() => reunion.id, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  imagePublicId: text("image_public_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("date_option_reunion_id_idx").on(table.reunionId),
  check("date_option_date_order_check", sql`${table.endDate} >= ${table.startDate}`),
]);

export const dateVote = pgTable("date_vote", {
  id: uuid("id").primaryKey().defaultRandom(),
  dateOptionId: uuid("date_option_id").notNull().references(() => dateOption.id, { onDelete: "cascade" }),
  householdId: uuid("household_id").notNull().references(() => household.id, { onDelete: "cascade" }),
  vote: text("vote", { enum: ["works", "prefer", "cannot"] }).notNull(),
}, (table) => [
  uniqueIndex("date_vote_option_household_idx").on(table.dateOptionId, table.householdId),
  index("date_vote_household_id_idx").on(table.householdId),
  check("date_vote_vote_check", sql`${table.vote} in ('works', 'prefer', 'cannot')`),
]);

export const reunionUpdate = pgTable("reunion_update", {
  id: uuid("id").primaryKey().defaultRandom(),
  reunionId: uuid("reunion_id").notNull().references(() => reunion.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  createdBy: text("created_by").notNull().references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("reunion_update_reunion_id_idx").on(table.reunionId),
]);

export const reunionPhoto = pgTable("reunion_photo", {
  id: uuid("id").primaryKey().defaultRandom(),
  reunionId: uuid("reunion_id").notNull().references(() => reunion.id, { onDelete: "cascade" }),
  uploadedByUserId: text("uploaded_by_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  publicId: text("public_id").notNull(),
  caption: text("caption"),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("reunion_photo_reunion_id_idx").on(table.reunionId),
  index("reunion_photo_uploaded_by_user_id_idx").on(table.uploadedByUserId),
  index("reunion_photo_reunion_created_at_idx").on(table.reunionId, table.createdAt),
]);

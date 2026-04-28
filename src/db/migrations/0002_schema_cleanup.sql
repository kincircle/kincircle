ALTER TABLE "household" RENAME COLUMN "user_id" TO "claimed_by_user_id";--> statement-breakpoint
ALTER TABLE "household" RENAME COLUMN "invite_status" TO "invitation_status";--> statement-breakpoint
ALTER TABLE "account" DROP CONSTRAINT "account_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "date_option" DROP CONSTRAINT "date_option_reunion_id_reunion_id_fk";
--> statement-breakpoint
ALTER TABLE "date_vote" DROP CONSTRAINT "date_vote_household_id_household_id_fk";
--> statement-breakpoint
ALTER TABLE "household" DROP CONSTRAINT "household_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "household" DROP CONSTRAINT "household_reunion_id_reunion_id_fk";
--> statement-breakpoint
ALTER TABLE "household" DROP CONSTRAINT "household_created_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "household" DROP CONSTRAINT "household_last_edited_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "invite" DROP CONSTRAINT "invite_reunion_id_reunion_id_fk";
--> statement-breakpoint
ALTER TABLE "invite" DROP CONSTRAINT "invite_household_id_household_id_fk";
--> statement-breakpoint
ALTER TABLE "reunion_update" DROP CONSTRAINT "reunion_update_reunion_id_reunion_id_fk";
--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT "session_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "reunion" ADD COLUMN "locked_date_option_id" uuid;--> statement-breakpoint
ALTER TABLE "household" ALTER COLUMN "invitation_status" SET DEFAULT 'not_sent';--> statement-breakpoint
UPDATE "household" h
SET "invitation_status" = CASE
	WHEN EXISTS (
		SELECT 1 FROM "invite" i
		WHERE i."household_id" = h."id" AND i."status" = 'accepted'
	) OR h."claimed_at" IS NOT NULL THEN 'accepted'
	WHEN EXISTS (
		SELECT 1 FROM "invite" i
		WHERE i."household_id" = h."id"
			AND i."status" = 'pending'
			AND i."expires_at" > now()
	) THEN 'pending'
	WHEN EXISTS (
		SELECT 1 FROM "invite" i
		WHERE i."household_id" = h."id" AND i."status" = 'revoked'
	) THEN 'revoked'
	WHEN EXISTS (
		SELECT 1 FROM "invite" i
		WHERE i."household_id" = h."id"
			AND (i."status" = 'expired' OR (i."status" = 'pending' AND i."expires_at" <= now()))
	) THEN 'expired'
	WHEN h."invitation_status" = 'accepted' THEN 'accepted'
	WHEN h."invitation_status" = 'expired' THEN 'expired'
	ELSE 'not_sent'
END;--> statement-breakpoint
UPDATE "reunion" r
SET "locked_date_option_id" = (
	SELECT d."id"
	FROM "date_option" d
	WHERE d."reunion_id" = r."id"
		AND d."start_date" = r."locked_date"
	ORDER BY d."created_at", d."id"
	LIMIT 1
)
WHERE r."locked_date" IS NOT NULL
	AND r."locked_date_option_id" IS NULL;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_option" ADD CONSTRAINT "date_option_reunion_id_reunion_id_fk" FOREIGN KEY ("reunion_id") REFERENCES "public"."reunion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_vote" ADD CONSTRAINT "date_vote_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household" ADD CONSTRAINT "household_claimed_by_user_id_user_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household" ADD CONSTRAINT "household_reunion_id_reunion_id_fk" FOREIGN KEY ("reunion_id") REFERENCES "public"."reunion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household" ADD CONSTRAINT "household_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household" ADD CONSTRAINT "household_last_edited_by_user_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_reunion_id_reunion_id_fk" FOREIGN KEY ("reunion_id") REFERENCES "public"."reunion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reunion" ADD CONSTRAINT "reunion_locked_date_option_id_date_option_id_fk" FOREIGN KEY ("locked_date_option_id") REFERENCES "public"."date_option"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reunion_update" ADD CONSTRAINT "reunion_update_reunion_id_reunion_id_fk" FOREIGN KEY ("reunion_id") REFERENCES "public"."reunion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "date_option_reunion_id_idx" ON "date_option" USING btree ("reunion_id");--> statement-breakpoint
CREATE INDEX "date_vote_household_id_idx" ON "date_vote" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "household_reunion_id_idx" ON "household" USING btree ("reunion_id");--> statement-breakpoint
CREATE INDEX "household_claimed_by_user_id_idx" ON "household" USING btree ("claimed_by_user_id");--> statement-breakpoint
CREATE INDEX "household_reunion_claimed_by_user_idx" ON "household" USING btree ("reunion_id","claimed_by_user_id");--> statement-breakpoint
CREATE INDEX "household_member_household_id_idx" ON "household_member" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "invite_reunion_id_idx" ON "invite" USING btree ("reunion_id");--> statement-breakpoint
CREATE INDEX "invite_household_id_idx" ON "invite" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "invite_reunion_email_idx" ON "invite" USING btree ("reunion_id","email");--> statement-breakpoint
CREATE INDEX "reunion_organizer_id_idx" ON "reunion" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "reunion_locked_date_option_id_idx" ON "reunion" USING btree ("locked_date_option_id");--> statement-breakpoint
CREATE INDEX "reunion_update_reunion_id_idx" ON "reunion_update" USING btree ("reunion_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "date_option" ADD CONSTRAINT "date_option_date_order_check" CHECK ("date_option"."end_date" >= "date_option"."start_date");--> statement-breakpoint
ALTER TABLE "date_vote" ADD CONSTRAINT "date_vote_vote_check" CHECK ("date_vote"."vote" in ('works', 'prefer', 'cannot'));--> statement-breakpoint
ALTER TABLE "household" ADD CONSTRAINT "household_invitation_status_check" CHECK ("household"."invitation_status" in ('not_sent', 'pending', 'accepted', 'revoked', 'expired'));--> statement-breakpoint
ALTER TABLE "household" ADD CONSTRAINT "household_rsvp_status_check" CHECK ("household"."rsvp_status" in ('pending', 'yes', 'no', 'maybe'));--> statement-breakpoint
ALTER TABLE "household" ADD CONSTRAINT "household_party_size_check" CHECK ("household"."party_size" >= 1);--> statement-breakpoint
ALTER TABLE "household" ADD CONSTRAINT "household_latitude_check" CHECK ("household"."lat" is null or ("household"."lat" >= -90 and "household"."lat" <= 90));--> statement-breakpoint
ALTER TABLE "household" ADD CONSTRAINT "household_longitude_check" CHECK ("household"."lng" is null or ("household"."lng" >= -180 and "household"."lng" <= 180));--> statement-breakpoint
ALTER TABLE "household_member" ADD CONSTRAINT "household_member_age_group_check" CHECK ("household_member"."age_group" in ('adult', 'child'));--> statement-breakpoint
ALTER TABLE "household_member" ADD CONSTRAINT "household_member_age_check" CHECK ("household_member"."age" is null or "household_member"."age" >= 0);--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_status_check" CHECK ("invite"."status" in ('pending', 'accepted', 'revoked', 'expired'));--> statement-breakpoint
ALTER TABLE "reunion" ADD CONSTRAINT "reunion_status_check" CHECK ("reunion"."status" in ('planning', 'date_locked', 'finalized', 'cancelled'));

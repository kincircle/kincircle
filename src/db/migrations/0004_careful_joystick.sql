CREATE TABLE "potluck_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reunion_id" uuid NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"claimed_by_household_id" uuid,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "potluck_item" ADD CONSTRAINT "potluck_item_reunion_id_reunion_id_fk" FOREIGN KEY ("reunion_id") REFERENCES "public"."reunion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "potluck_item" ADD CONSTRAINT "potluck_item_claimed_by_household_id_household_id_fk" FOREIGN KEY ("claimed_by_household_id") REFERENCES "public"."household"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "potluck_item" ADD CONSTRAINT "potluck_item_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "potluck_item_reunion_id_idx" ON "potluck_item" USING btree ("reunion_id");--> statement-breakpoint
CREATE INDEX "potluck_item_claimed_by_household_id_idx" ON "potluck_item" USING btree ("claimed_by_household_id");--> statement-breakpoint
CREATE UNIQUE INDEX "potluck_item_reunion_name_idx" ON "potluck_item" USING btree ("reunion_id","name");
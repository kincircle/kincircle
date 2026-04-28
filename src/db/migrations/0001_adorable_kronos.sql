ALTER TABLE "household" ALTER COLUMN "primary_contact_email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "last_edited_by" text;--> statement-breakpoint
ALTER TABLE "household" ADD CONSTRAINT "household_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household" ADD CONSTRAINT "household_last_edited_by_user_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
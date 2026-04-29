CREATE TABLE IF NOT EXISTS "reunion_photo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reunion_id" uuid NOT NULL,
	"uploaded_by_user_id" text NOT NULL,
	"url" text NOT NULL,
	"public_id" text NOT NULL,
	"caption" text,
	"width" integer,
	"height" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "date_option" ADD COLUMN IF NOT EXISTS "image_url" text;--> statement-breakpoint
ALTER TABLE "date_option" ADD COLUMN IF NOT EXISTS "image_public_id" text;--> statement-breakpoint
ALTER TABLE "reunion" ADD COLUMN IF NOT EXISTS "hero_image_url" text;--> statement-breakpoint
ALTER TABLE "reunion" ADD COLUMN IF NOT EXISTS "hero_image_public_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reunion_photo" ADD CONSTRAINT "reunion_photo_reunion_id_reunion_id_fk" FOREIGN KEY ("reunion_id") REFERENCES "public"."reunion"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reunion_photo" ADD CONSTRAINT "reunion_photo_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reunion_photo_reunion_id_idx" ON "reunion_photo" USING btree ("reunion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reunion_photo_uploaded_by_user_id_idx" ON "reunion_photo" USING btree ("uploaded_by_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reunion_photo_reunion_created_at_idx" ON "reunion_photo" USING btree ("reunion_id","created_at");

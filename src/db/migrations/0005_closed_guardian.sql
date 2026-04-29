ALTER TABLE "potluck_item" ADD COLUMN "claimed_at" timestamp;--> statement-breakpoint
ALTER TABLE "potluck_item" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;
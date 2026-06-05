CREATE TABLE "light_curves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_id" uuid NOT NULL,
	"time_array" jsonb NOT NULL,
	"flux_array" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stellar_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_name" varchar(100) NOT NULL,
	"mission" varchar(50) NOT NULL,
	"star_mass_solar" double precision NOT NULL,
	"star_radius_solar" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stellar_targets_target_name_unique" UNIQUE("target_name")
);
--> statement-breakpoint
ALTER TABLE "light_curves" ADD CONSTRAINT "light_curves_target_id_stellar_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."stellar_targets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_target_name" ON "stellar_targets" USING btree ("target_name");
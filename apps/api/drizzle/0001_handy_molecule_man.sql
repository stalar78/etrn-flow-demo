CREATE TABLE "guest_session_usage_limits" (
	"guest_session_id" uuid PRIMARY KEY NOT NULL,
	"mutation_count" integer DEFAULT 0 NOT NULL,
	"reset_count" integer DEFAULT 0 NOT NULL,
	"rate_window_started_at" timestamp with time zone NOT NULL,
	"rate_window_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guest_session_usage_limits" ADD CONSTRAINT "guest_session_usage_limits_guest_session_id_guest_sessions_id_fk" FOREIGN KEY ("guest_session_id") REFERENCES "public"."guest_sessions"("id") ON DELETE cascade ON UPDATE no action;
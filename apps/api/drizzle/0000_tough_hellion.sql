CREATE TABLE "guest_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence" bigserial NOT NULL,
	"guest_session_id" uuid NOT NULL,
	"shipment_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"actor_role" text NOT NULL,
	"previous_state" text NOT NULL,
	"next_state" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipment_events_sequence_unique" UNIQUE("sequence"),
	CONSTRAINT "shipment_events_actor_role_check" CHECK (actor_role in ('dispatcher', 'warehouse', 'driver', 'consignee', 'manager')),
	CONSTRAINT "shipment_events_previous_state_check" CHECK (previous_state in ('draft', 'ready_for_dispatch', 'awaiting_loading', 'loading', 'in_transit', 'awaiting_unloading', 'unloading', 'awaiting_confirmation', 'completed', 'attention_required', 'cancelled')),
	CONSTRAINT "shipment_events_next_state_check" CHECK (next_state in ('draft', 'ready_for_dispatch', 'awaiting_loading', 'loading', 'in_transit', 'awaiting_unloading', 'unloading', 'awaiting_confirmation', 'completed', 'attention_required', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_session_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"state" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipments_guest_session_id_unique" UNIQUE("guest_session_id","id"),
	CONSTRAINT "shipments_state_check" CHECK (state in ('draft', 'ready_for_dispatch', 'awaiting_loading', 'loading', 'in_transit', 'awaiting_unloading', 'unloading', 'awaiting_confirmation', 'completed', 'attention_required', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_guest_session_id_guest_sessions_id_fk" FOREIGN KEY ("guest_session_id") REFERENCES "public"."guest_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_same_guest_session_fk" FOREIGN KEY ("guest_session_id","shipment_id") REFERENCES "public"."shipments"("guest_session_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_guest_session_id_guest_sessions_id_fk" FOREIGN KEY ("guest_session_id") REFERENCES "public"."guest_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shipment_events_guest_session_shipment_idx" ON "shipment_events" USING btree ("guest_session_id","shipment_id");--> statement-breakpoint
CREATE INDEX "shipment_events_sequence_idx" ON "shipment_events" USING btree ("sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_guest_session_reference_unique" ON "shipments" USING btree ("guest_session_id","reference");--> statement-breakpoint
CREATE INDEX "shipments_guest_session_idx" ON "shipments" USING btree ("guest_session_id");
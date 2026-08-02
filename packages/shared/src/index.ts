import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("etrn-flow-api")
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const demoRoles = [
  "dispatcher",
  "warehouse",
  "driver",
  "consignee",
  "manager"
] as const;

export const shipmentWorkflowStates = [
  "draft",
  "ready_for_dispatch",
  "awaiting_loading",
  "loading",
  "in_transit",
  "awaiting_unloading",
  "unloading",
  "awaiting_confirmation",
  "completed",
  "attention_required",
  "cancelled"
] as const;

export type DemoRole = (typeof demoRoles)[number];
export type ShipmentWorkflowState = (typeof shipmentWorkflowStates)[number];

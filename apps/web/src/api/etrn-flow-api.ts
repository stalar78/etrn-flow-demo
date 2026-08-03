import { z } from "zod";

import { healthResponseSchema } from "@etrn-flow/shared";

const shipmentStateSchema = z.enum([
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
]);

const actorRoleSchema = z.enum([
  "dispatcher",
  "warehouse",
  "driver",
  "consignee",
  "manager"
]);

const shipmentWorkflowActionSchema = z.enum([
  "prepareDispatch",
  "dispatch",
  "markVehicleArrived",
  "completeLoading",
  "cancel"
]);

export type ShipmentState = z.infer<typeof shipmentStateSchema>;
export type ActorRole = z.infer<typeof actorRoleSchema>;
export type ShipmentWorkflowAction = z.infer<typeof shipmentWorkflowActionSchema>;

export type ApiErrorCode =
  | "invalid_shipment_id"
  | "invalid_transition_request"
  | "shipment_not_found"
  | "transition_forbidden"
  | "invalid_transition"
  | "transition_conflict"
  | "transition_unavailable"
  | "guest_session_unavailable"
  | "demo_bootstrap_unavailable"
  | "demo_reset_unavailable"
  | "demo_reset_quota_exceeded"
  | "guest_session_quota_exceeded"
  | "guest_session_rate_limited"
  | "guest_session_usage_unavailable"
  | "shipment_list_unavailable"
  | "shipment_detail_unavailable"
  | "request_failed"
  | "invalid_response";

export class EtrnFlowApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message = code
  ) {
    super(message);
    this.name = "EtrnFlowApiError";
  }
}

const apiErrorSchema = z.object({
  error: z.string()
});

const sessionResponseSchema = z.object({
  session: z.object({
    id: z.string(),
    expiresAt: z.string(),
    created: z.boolean()
  })
});

const bootstrapResponseSchema = z.object({
  demo: z.object({
    created: z.boolean(),
    shipmentCount: z.number()
  })
});

const resetDemoResponseSchema = z.object({
  reset: z.literal(true)
});

const shipmentSummarySchema = z.object({
  id: z.string(),
  reference: z.string(),
  state: shipmentStateSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

const shipmentEventSchema = z.object({
  id: z.string(),
  sequence: z.number(),
  eventType: z.string(),
  actorRole: actorRoleSchema,
  previousState: shipmentStateSchema,
  nextState: shipmentStateSchema,
  payload: z.record(z.unknown()),
  createdAt: z.string()
});

const shipmentListResponseSchema = z.object({
  shipments: z.array(shipmentSummarySchema)
});

const shipmentDetailResponseSchema = z.object({
  shipment: shipmentSummarySchema,
  events: z.array(shipmentEventSchema)
});

const transitionResponseSchema = z.object({
  transition: z.object({
    shipmentId: z.string(),
    action: shipmentWorkflowActionSchema,
    actorRole: actorRoleSchema,
    previousState: shipmentStateSchema,
    nextState: shipmentStateSchema
  }),
  event: shipmentEventSchema
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
export type ResetDemoResponse = z.infer<typeof resetDemoResponseSchema>;
export type ShipmentSummary = z.infer<typeof shipmentSummarySchema>;
export type ShipmentEvent = z.infer<typeof shipmentEventSchema>;
export type ShipmentListResponse = z.infer<typeof shipmentListResponseSchema>;
export type ShipmentDetailResponse = z.infer<typeof shipmentDetailResponseSchema>;
export type TransitionResponse = z.infer<typeof transitionResponseSchema>;

export type ExecuteShipmentActionInput = {
  action: ShipmentWorkflowAction;
  actorRole: ActorRole;
};

export async function getHealth(options?: { signal?: AbortSignal }) {
  return request("/health", healthResponseSchema, { signal: options?.signal });
}

export async function getSession(options?: { signal?: AbortSignal }) {
  return request("/api/session", sessionResponseSchema, { signal: options?.signal });
}

export async function bootstrapDemo(options?: { signal?: AbortSignal }) {
  return request("/api/demo/bootstrap", bootstrapResponseSchema, {
    method: "POST",
    signal: options?.signal
  });
}

export async function resetDemo(options?: { signal?: AbortSignal }) {
  return request("/api/demo/reset", resetDemoResponseSchema, {
    method: "POST",
    signal: options?.signal
  });
}

export async function listShipments(options?: { signal?: AbortSignal }) {
  return request("/api/shipments", shipmentListResponseSchema, { signal: options?.signal });
}

export async function getShipmentDetail(shipmentId: string, options?: { signal?: AbortSignal }) {
  return request(`/api/shipments/${encodeURIComponent(shipmentId)}`, shipmentDetailResponseSchema, {
    signal: options?.signal
  });
}

export async function executeShipmentAction(
  shipmentId: string,
  input: ExecuteShipmentActionInput,
  options?: { signal?: AbortSignal }
) {
  return request(`/api/shipments/${encodeURIComponent(shipmentId)}/actions`, transitionResponseSchema, {
    body: input,
    method: "POST",
    signal: options?.signal
  });
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: {
    body?: unknown;
    method?: "GET" | "POST";
    signal?: AbortSignal;
  } = {}
) {
  let response: Response;

  try {
    response = await fetch(path, {
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      method: options.method ?? "GET",
      signal: options.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new EtrnFlowApiError("request_failed");
  }

  const json = await readJson(response);

  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(json);
    throw new EtrnFlowApiError(
      normalizeErrorCode(parsedError.success ? parsedError.data.error : undefined)
    );
  }

  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    throw new EtrnFlowApiError("invalid_response");
  }

  return parsed.data;
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new EtrnFlowApiError("invalid_response");
  }
}

function normalizeErrorCode(code: string | undefined): ApiErrorCode {
  switch (code) {
    case "invalid_shipment_id":
    case "invalid_transition_request":
    case "shipment_not_found":
    case "transition_forbidden":
    case "invalid_transition":
    case "transition_conflict":
    case "transition_unavailable":
    case "guest_session_unavailable":
    case "demo_bootstrap_unavailable":
    case "demo_reset_unavailable":
    case "demo_reset_quota_exceeded":
    case "guest_session_quota_exceeded":
    case "guest_session_rate_limited":
    case "guest_session_usage_unavailable":
    case "shipment_list_unavailable":
    case "shipment_detail_unavailable":
      return code;
    default:
      return "request_failed";
  }
}

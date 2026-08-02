import type { DemoRole, ShipmentWorkflowState } from "@etrn-flow/shared";

export type GuestSessionRecord = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
};

export type ShipmentRecord = {
  id: string;
  guestSessionId: string;
  reference: string;
  state: ShipmentWorkflowState;
  createdAt: Date;
  updatedAt: Date;
};

export type ShipmentEventRecord = {
  id: string;
  sequence: number;
  guestSessionId: string;
  shipmentId: string;
  eventType: string;
  actorRole: DemoRole;
  previousState: ShipmentWorkflowState;
  nextState: ShipmentWorkflowState;
  payload: Record<string, unknown>;
  createdAt: Date;
};

export type CreateGuestSessionInput = {
  expiresAt: Date;
};

export type CreateShipmentInput = {
  guestSessionId: string;
  reference: string;
  state: ShipmentWorkflowState;
};

export type UpdateShipmentStateInput = {
  guestSessionId: string;
  shipmentId: string;
  expectedState: ShipmentWorkflowState;
  nextState: ShipmentWorkflowState;
};

export type AppendShipmentEventInput = {
  guestSessionId: string;
  shipmentId: string;
  eventType: string;
  actorRole: DemoRole;
  previousState: ShipmentWorkflowState;
  nextState: ShipmentWorkflowState;
  payload?: Record<string, unknown>;
};

export interface GuestSessionRepository {
  create(input: CreateGuestSessionInput): Promise<GuestSessionRecord>;
  findById(id: string): Promise<GuestSessionRecord | null>;
  touchLastSeen(input: { id: string; lastSeenAt: Date }): Promise<GuestSessionRecord | null>;
}

export interface ShipmentRepository {
  create(input: CreateShipmentInput): Promise<ShipmentRecord>;
  findByIdScoped(input: {
    guestSessionId: string;
    shipmentId: string;
  }): Promise<ShipmentRecord | null>;
  listByGuestSession(guestSessionId: string): Promise<ShipmentRecord[]>;
  updateStateGuarded(input: UpdateShipmentStateInput): Promise<ShipmentRecord | null>;
}

export interface ShipmentEventRepository {
  append(input: AppendShipmentEventInput): Promise<ShipmentEventRecord>;
  listForShipmentScoped(input: {
    guestSessionId: string;
    shipmentId: string;
  }): Promise<ShipmentEventRecord[]>;
}

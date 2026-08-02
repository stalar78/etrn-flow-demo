import cookie from "@fastify/cookie";
import Fastify from "fastify";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { healthResponseSchema } from "@etrn-flow/shared";

import { getSessionConfig, type SessionConfig } from "./config/session.js";
import {
  createDatabaseConnection,
  type Database
} from "./db/connection.js";
import { createPostgresRepositories } from "./persistence/postgres/repositories.js";
import { DemoBootstrapService } from "./services/demo-bootstrap.js";
import { GuestSessionService, type Clock } from "./services/guest-session.js";
import type { ShipmentEventRecord, ShipmentRecord } from "@etrn-flow/domain";

export type AppOptions = {
  enableGuestSessions?: boolean;
  database?: AppDatabase;
  sessionConfig?: SessionConfig;
  clock?: Clock;
};

export type AppDatabase = {
  db: Database;
  close(): Promise<void>;
};

declare module "fastify" {
  interface FastifyRequest {
    guestSession?: {
      id: string;
      expiresAt: Date;
      created: boolean;
    };
  }
}

export function createApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info"
    }
  });

  app.get("/health", async () =>
    healthResponseSchema.parse({
      status: "ok",
      service: "etrn-flow-api"
    })
  );

  if (options.enableGuestSessions) {
    const sessionConfig = options.sessionConfig ?? getSessionConfig();
    const database = options.database ?? createDatabaseConnection();
    const repositories = createPostgresRepositories(database.db);
    const guestSessionService = new GuestSessionService(
      repositories.guestSessions,
      { ttlSeconds: sessionConfig.ttlSeconds },
      options.clock
    );
    const demoBootstrapService = new DemoBootstrapService(repositories);

    app.addHook("onClose", async () => {
      if (!options.database) {
        await database.close();
      }
    });

    app.register(cookie);
    app.decorateRequest("guestSession");

    const resolveGuestSession = async (request: FastifyRequest, reply: FastifyReply) => {
      let resolution;

      try {
        const cookieValue = request.cookies[sessionConfig.cookieName];
        const safeCookieValue = isSessionCookieValue(cookieValue)
          ? cookieValue
          : undefined;
        resolution = await guestSessionService.resolveOrCreate(safeCookieValue);
      } catch (error) {
        request.log.error({ error }, "Failed to resolve guest session");

        return reply.code(503).send({
          error: "guest_session_unavailable"
        });
      }

      request.guestSession = {
        id: resolution.session.id,
        expiresAt: resolution.session.expiresAt,
        created: resolution.created
      };

      if (resolution.created) {
        reply.setCookie(sessionConfig.cookieName, resolution.session.id, {
          httpOnly: true,
          secure: sessionConfig.cookieSecure,
          sameSite: sessionConfig.cookieSameSite,
          path: "/",
          domain: sessionConfig.cookieDomain,
          maxAge: sessionConfig.ttlSeconds
        });
      }

      return undefined;
    };

    app.get("/api/session", { preHandler: resolveGuestSession }, async (request) => {
      const guestSession = requireGuestSession(request);

      return {
        session: {
          id: guestSession.id,
          expiresAt: guestSession.expiresAt.toISOString(),
          created: guestSession.created
        }
      };
    });

    app.post("/api/demo/bootstrap", { preHandler: resolveGuestSession }, async (request, reply) => {
      try {
        const result = await demoBootstrapService.bootstrap(requireGuestSession(request).id);

        return {
          demo: result
        };
      } catch (error) {
        request.log.error({ error }, "Failed to bootstrap demo shipments");

        return reply.code(503).send({
          error: "demo_bootstrap_unavailable"
        });
      }
    });

    app.get("/api/shipments", { preHandler: resolveGuestSession }, async (request, reply) => {
      try {
        const records = await repositories.shipments.listByGuestSession(
          requireGuestSession(request).id
        );

        return {
          shipments: records.slice(0, 50).map(toShipmentDto)
        };
      } catch (error) {
        request.log.error({ error }, "Failed to list shipments");

        return reply.code(503).send({
          error: "shipment_list_unavailable"
        });
      }
    });

    app.get("/api/shipments/:shipmentId", { preHandler: resolveGuestSession }, async (request, reply) => {
      const parsedParams = shipmentParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        return reply.code(400).send({
          error: "invalid_shipment_id"
        });
      }

      try {
        const guestSessionId = requireGuestSession(request).id;
        const shipment = await repositories.shipments.findByIdScoped({
          guestSessionId,
          shipmentId: parsedParams.data.shipmentId
        });

        if (!shipment) {
          return reply.code(404).send({
            error: "shipment_not_found"
          });
        }

        const events = await repositories.shipmentEvents.listForShipmentScoped({
          guestSessionId,
          shipmentId: shipment.id
        });

        return {
          shipment: toShipmentDto(shipment),
          events: events.map(toShipmentEventDto)
        };
      } catch (error) {
        request.log.error({ error }, "Failed to load shipment detail");

        return reply.code(503).send({
          error: "shipment_detail_unavailable"
        });
      }
    });
  }

  return app;
}

function isSessionCookieValue(value: string | undefined): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const shipmentParamsSchema = z.object({
  shipmentId: z.string().uuid()
});

function requireGuestSession(request: FastifyRequest) {
  if (!request.guestSession) {
    throw new Error("Guest session context is missing.");
  }

  return request.guestSession;
}

function toShipmentDto(record: ShipmentRecord) {
  return {
    id: record.id,
    reference: record.reference,
    state: record.state,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function toShipmentEventDto(record: ShipmentEventRecord) {
  return {
    id: record.id,
    sequence: record.sequence,
    eventType: record.eventType,
    actorRole: record.actorRole,
    previousState: record.previousState,
    nextState: record.nextState,
    payload: record.payload,
    createdAt: record.createdAt.toISOString()
  };
}

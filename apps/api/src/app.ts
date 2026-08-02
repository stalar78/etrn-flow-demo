import cookie from "@fastify/cookie";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

import { healthResponseSchema } from "@etrn-flow/shared";

import { getSessionConfig, type SessionConfig } from "./config/session.js";
import {
  createDatabaseConnection,
  type Database
} from "./db/connection.js";
import { createPostgresRepositories } from "./persistence/postgres/repositories.js";
import { GuestSessionService, type Clock } from "./services/guest-session.js";

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

    app.addHook("onClose", async () => {
      if (!options.database) {
        await database.close();
      }
    });

    app.register(cookie);
    app.decorateRequest("guestSession");

    app.get("/api/session", async (request, reply) => {
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

      return {
        session: {
          id: resolution.session.id,
          expiresAt: resolution.session.expiresAt.toISOString(),
          created: resolution.created
        }
      };
    });
  }

  return app;
}

function isSessionCookieValue(value: string | undefined): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

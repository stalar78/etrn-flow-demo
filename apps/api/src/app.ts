import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

import { healthResponseSchema } from "@etrn-flow/shared";

export function createApp(): FastifyInstance {
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

  return app;
}

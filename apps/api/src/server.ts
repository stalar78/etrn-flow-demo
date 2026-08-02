import { createApp } from "./app.js";

const host = process.env.API_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.API_PORT ?? "3000", 10);

const app = createApp({ enableGuestSessions: true });

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error({ error }, "Failed to start ETRN Flow API");
  process.exitCode = 1;
}

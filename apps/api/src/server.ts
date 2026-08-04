import { createApp } from "./app.js";

const host = process.env.API_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.API_PORT ?? "3000", 10);

const app = createApp({ enableGuestSessions: true });
let shutdownPromise: Promise<void> | null = null;

async function shutdown(signal: NodeJS.Signals) {
  if (shutdownPromise) {
    app.log.info({ signal }, "Shutdown already in progress");
    return shutdownPromise;
  }

  app.log.info({ signal }, "Shutting down ETRN Flow API");
  shutdownPromise = app.close()
    .then(() => {
      app.log.info({ signal }, "ETRN Flow API stopped");
    })
    .catch((error: unknown) => {
      app.log.error({ error, signal }, "Failed to stop ETRN Flow API cleanly");
      process.exitCode = 1;
    });

  return shutdownPromise;
}

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error({ error }, "Failed to start ETRN Flow API");
  process.exitCode = 1;
}

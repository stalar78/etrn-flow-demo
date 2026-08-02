import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { beforeAll, describe, expect, it } from "vitest";

import { createApp, type AppOptions } from "../app.js";
import { createDatabaseConnection } from "../db/connection.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for session integration tests.");
}

const connection = createDatabaseConnection(databaseUrl);

beforeAll(async () => {
  await migrate(connection.db, {
    migrationsFolder: "drizzle"
  });
  await connection.db.execute(sql`truncate shipment_events, shipments, guest_sessions restart identity cascade`);

  return async () => {
    await connection.close();
  };
});

describe("guest session API", () => {
  it("creates a session and sets an HttpOnly cookie", async () => {
    const app = createSessionTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/session"
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      session: {
        created: true
      }
    });
    expect(response.cookies[0]).toMatchObject({
      name: "test_guest_session",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      path: "/"
    });
  });

  it("reuses a valid session cookie", async () => {
    const app = createSessionTestApp();
    const firstResponse = await app.inject({ method: "GET", url: "/api/session" });
    const cookie = firstResponse.cookies[0];
    const sessionId = firstResponse.json().session.id;

    const secondResponse = await app.inject({
      method: "GET",
      url: "/api/session",
      cookies: {
        [cookie.name]: cookie.value
      }
    });
    await app.close();

    expect(secondResponse.statusCode).toBe(200);
    expect(secondResponse.json()).toMatchObject({
      session: {
        id: sessionId,
        created: false
      }
    });
    expect(secondResponse.cookies).toHaveLength(0);
  });

  it("replaces malformed and unknown session cookies", async () => {
    const app = createSessionTestApp();

    const malformedResponse = await app.inject({
      method: "GET",
      url: "/api/session",
      cookies: {
        test_guest_session: "not-a-session-id"
      }
    });
    const unknownResponse = await app.inject({
      method: "GET",
      url: "/api/session",
      cookies: {
        test_guest_session: "11111111-1111-4111-8111-111111111111"
      }
    });
    await app.close();

    expect(malformedResponse.json().session.created).toBe(true);
    expect(malformedResponse.cookies[0]?.value).toMatch(uuidPattern);
    expect(unknownResponse.json().session.created).toBe(true);
    expect(unknownResponse.cookies[0]?.value).toMatch(uuidPattern);
    expect(unknownResponse.cookies[0]?.value).not.toBe(malformedResponse.cookies[0]?.value);
  });

  it("replaces expired session cookies", async () => {
    const app = createSessionTestApp();
    const expiredSession = await connection.db.execute<{ id: string }>(sql`
      insert into guest_sessions (expires_at)
      values (now() - interval '1 second')
      returning id
    `);
    const expiredId = expiredSession.rows[0]?.id;

    const response = await app.inject({
      method: "GET",
      url: "/api/session",
      cookies: {
        test_guest_session: expiredId ?? ""
      }
    });
    await app.close();

    expect(response.json().session.created).toBe(true);
    expect(response.json().session.id).not.toBe(expiredId);
    expect(response.cookies[0]?.value).toBe(response.json().session.id);
  });

  it("/health does not create a guest session", async () => {
    const app = createSessionTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.cookies).toHaveLength(0);
  });

  it("can emit secure cookies when configured", async () => {
    const app = createSessionTestApp({ cookieSecure: true });

    const response = await app.inject({
      method: "GET",
      url: "/api/session"
    });
    await app.close();

    expect(response.cookies[0]).toMatchObject({
      secure: true
    });
  });

  it("returns a controlled error when session persistence fails", async () => {
    const app = createSessionTestApp({
      database: {
        db: {
          insert() {
            throw new Error("simulated database failure");
          },
          select() {
            throw new Error("simulated database failure");
          },
          update() {
            throw new Error("simulated database failure");
          },
          transaction() {
            throw new Error("simulated database failure");
          }
        } as never,
        async close() {}
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/session"
    });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: "guest_session_unavailable"
    });
  });
});

const uuidPattern = /^[0-9a-f-]{36}$/i;

function createSessionTestApp(options: {
  cookieSecure?: boolean;
  database?: AppOptions["database"];
} = {}) {
  return createApp({
    enableGuestSessions: true,
    database: options.database ?? connection,
    sessionConfig: {
      cookieName: "test_guest_session",
      ttlSeconds: 60 * 60,
      cookieSecure: options.cookieSecure ?? false,
      cookieSameSite: "lax"
    }
  });
}

import { z } from "zod";

const sameSiteValues = ["strict", "lax", "none"] as const;

const sessionConfigSchema = z.object({
  GUEST_SESSION_COOKIE_NAME: z.string().min(1).default("etrn_guest_session"),
  GUEST_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24),
  GUEST_SESSION_COOKIE_SECURE: z
    .enum(["auto", "true", "false"])
    .default("auto"),
  GUEST_SESSION_COOKIE_SAME_SITE: z.enum(sameSiteValues).default("lax"),
  GUEST_SESSION_COOKIE_DOMAIN: z.string().min(1).optional(),
  NODE_ENV: z.string().optional()
});

export type SessionConfig = {
  cookieName: string;
  ttlSeconds: number;
  cookieSecure: boolean;
  cookieSameSite: (typeof sameSiteValues)[number];
  cookieDomain?: string;
};

export function getSessionConfig(env: NodeJS.ProcessEnv = process.env): SessionConfig {
  const parsed = sessionConfigSchema.parse(env);
  const cookieSecure =
    parsed.GUEST_SESSION_COOKIE_SECURE === "auto"
      ? parsed.NODE_ENV === "production"
      : parsed.GUEST_SESSION_COOKIE_SECURE === "true";

  return {
    cookieName: parsed.GUEST_SESSION_COOKIE_NAME,
    ttlSeconds: parsed.GUEST_SESSION_TTL_SECONDS,
    cookieSecure,
    cookieSameSite: parsed.GUEST_SESSION_COOKIE_SAME_SITE,
    cookieDomain: parsed.GUEST_SESSION_COOKIE_DOMAIN
  };
}

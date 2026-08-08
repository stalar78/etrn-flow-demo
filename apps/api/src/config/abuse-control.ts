import { z } from "zod";

const abuseControlConfigSchema = z.object({
  GUEST_SESSION_MUTATION_LIMIT: z.coerce.number().int().positive().max(100000).default(60),
  GUEST_SESSION_RESET_LIMIT: z.coerce.number().int().positive().max(100000).default(8),
  GUEST_SESSION_RATE_WINDOW_SECONDS: z.coerce.number().int().positive().max(86400).default(10),
  GUEST_SESSION_RATE_MAX_REQUESTS: z.coerce.number().int().positive().max(10000).default(8)
});

export type AbuseControlConfig = {
  mutationLimit: number;
  resetLimit: number;
  rateWindowSeconds: number;
  rateMaxRequests: number;
};

export function getAbuseControlConfig(env: NodeJS.ProcessEnv = process.env): AbuseControlConfig {
  const parsed = abuseControlConfigSchema.parse(env);

  return {
    mutationLimit: parsed.GUEST_SESSION_MUTATION_LIMIT,
    resetLimit: parsed.GUEST_SESSION_RESET_LIMIT,
    rateWindowSeconds: parsed.GUEST_SESSION_RATE_WINDOW_SECONDS,
    rateMaxRequests: parsed.GUEST_SESSION_RATE_MAX_REQUESTS
  };
}

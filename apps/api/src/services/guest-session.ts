import type { GuestSessionRecord, GuestSessionRepository } from "@etrn-flow/domain";

export type Clock = {
  now(): Date;
};

export type GuestSessionServiceConfig = {
  ttlSeconds: number;
};

export type GuestSessionResolution =
  | {
      created: true;
      session: GuestSessionRecord;
      replacedSessionId?: string;
    }
  | {
      created: false;
      session: GuestSessionRecord;
    };

export class GuestSessionService {
  constructor(
    private readonly repository: GuestSessionRepository,
    private readonly config: GuestSessionServiceConfig,
    private readonly clock: Clock = systemClock
  ) {}

  async resolveOrCreate(sessionId?: string): Promise<GuestSessionResolution> {
    if (!sessionId) {
      return this.createSession();
    }

    const existing = await this.repository.findById(sessionId);
    if (!existing || isExpired(existing, this.clock.now())) {
      return this.createSession(sessionId);
    }

    const lastSeenAt = this.clock.now();
    const touched = await this.repository.touchLastSeen({
      id: existing.id,
      lastSeenAt
    });

    if (!touched) {
      return this.createSession(sessionId);
    }

    return {
      created: false,
      session: touched
    };
  }

  private async createSession(replacedSessionId?: string): Promise<GuestSessionResolution> {
    const now = this.clock.now();
    const session = await this.repository.create({
      expiresAt: new Date(now.getTime() + this.config.ttlSeconds * 1000)
    });

    return {
      created: true,
      session,
      replacedSessionId
    };
  }
}

const systemClock: Clock = {
  now() {
    return new Date();
  }
};

function isExpired(session: GuestSessionRecord, now: Date) {
  return session.expiresAt.getTime() <= now.getTime();
}

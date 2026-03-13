// ============================================================
// Redis store for Web Demo tracking data
// Shares Redis instance with wechat-ops, prefix: spark7:web:
// ============================================================

import Redis from "ioredis";

const SESSIONS_KEY = "spark7:web:sessions"; // Hash: sessionId → JSON
const EVENTS_PREFIX = "spark7:web:events:"; // List per session

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL not set");
    redis = new Redis(url, { maxRetriesPerRequest: 2, connectTimeout: 5000 });
  }
  return redis;
}

// ── Session profile (upsert) ──

export interface WebSessionProfile {
  sessionId: string;
  catName?: string;
  personalityType?: string;
  secondaryType?: string;
  catPersonalityDesc?: string;
  hasCat?: boolean;
  nickname?: string;
  contact?: string;
  userProfile?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WebSessionExperience {
  durationMs?: number;
  completedAllActs?: boolean;
  peakMoment?: string;
  peakExtra?: string;
  feedback?: string;
  nps?: number;
  cardSaved?: boolean;
  cardShared?: boolean;
}

export interface WebSessionData {
  profile: WebSessionProfile;
  experience: WebSessionExperience;
}

export async function upsertSession(
  sessionId: string,
  data: Partial<WebSessionData["profile"]> & Partial<WebSessionExperience>
): Promise<void> {
  const r = getRedis();
  const existing = await r.hget(SESSIONS_KEY, sessionId);
  const now = new Date().toISOString();

  let session: WebSessionData;
  if (existing) {
    session = JSON.parse(existing);
    // merge profile fields
    Object.assign(session.profile, filterUndefined({
      catName: data.catName,
      personalityType: data.personalityType,
      secondaryType: data.secondaryType,
      catPersonalityDesc: data.catPersonalityDesc,
      hasCat: data.hasCat,
      nickname: data.nickname,
      contact: data.contact,
      userProfile: data.userProfile,
    }));
    session.profile.updatedAt = now;
    // merge experience fields
    Object.assign(session.experience, filterUndefined({
      durationMs: data.durationMs,
      completedAllActs: data.completedAllActs,
      peakMoment: data.peakMoment,
      peakExtra: data.peakExtra,
      feedback: data.feedback,
      nps: data.nps,
      cardSaved: data.cardSaved,
      cardShared: data.cardShared,
    }));
  } else {
    session = {
      profile: {
        sessionId,
        catName: data.catName,
        personalityType: data.personalityType,
        secondaryType: data.secondaryType,
        catPersonalityDesc: data.catPersonalityDesc,
        nickname: data.nickname,
        contact: data.contact,
        userProfile: data.userProfile as Record<string, unknown>,
        createdAt: now,
        updatedAt: now,
      },
      experience: {
        durationMs: data.durationMs,
        peakMoment: data.peakMoment,
        peakExtra: data.peakExtra,
        feedback: data.feedback,
        nps: data.nps,
        cardSaved: data.cardSaved,
        cardShared: data.cardShared,
      },
    };
  }

  await r.hset(SESSIONS_KEY, sessionId, JSON.stringify(session));
}

// ── Events ──

export interface TrackEvent {
  event: string;
  act_id?: number;
  timestamp: number;
  [key: string]: unknown;
}

export async function pushEvents(sessionId: string, events: TrackEvent[]): Promise<void> {
  if (!events.length) return;
  const r = getRedis();
  const key = `${EVENTS_PREFIX}${sessionId}`;
  await r.rpush(key, ...events.map((e) => JSON.stringify(e)));
}

// ── Export ──

export async function exportAll(): Promise<{
  exportTime: string;
  source: string;
  totalUsers: number;
  users: Array<{
    profile: WebSessionProfile;
    experience: WebSessionExperience;
    events: TrackEvent[];
  }>;
}> {
  const r = getRedis();
  const allSessions = await r.hgetall(SESSIONS_KEY);
  const users: Array<{
    profile: WebSessionProfile;
    experience: WebSessionExperience;
    events: TrackEvent[];
  }> = [];

  for (const [sessionId, json] of Object.entries(allSessions)) {
    const session: WebSessionData = JSON.parse(json);
    const rawEvents = await r.lrange(`${EVENTS_PREFIX}${sessionId}`, 0, -1);
    const events = rawEvents.map((e) => JSON.parse(e) as TrackEvent);
    users.push({
      profile: session.profile,
      experience: session.experience,
      events,
    });
  }

  // Sort by createdAt desc
  users.sort((a, b) => new Date(b.profile.createdAt).getTime() - new Date(a.profile.createdAt).getTime());

  return {
    exportTime: new Date().toISOString(),
    source: "web-demo",
    totalUsers: users.length,
    users,
  };
}

export async function exportSession(sessionId: string) {
  const r = getRedis();
  const json = await r.hget(SESSIONS_KEY, sessionId);
  if (!json) return null;
  const session: WebSessionData = JSON.parse(json);
  const rawEvents = await r.lrange(`${EVENTS_PREFIX}${sessionId}`, 0, -1);
  const events = rawEvents.map((e) => JSON.parse(e) as TrackEvent);
  return { profile: session.profile, experience: session.experience, events };
}

// ── Helpers ──

function filterUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

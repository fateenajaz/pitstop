import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

function nowIso() {
  return new Date().toISOString();
}

export const getCaseFile = internalQuery({
  args: { vehicleId: v.string() },
  handler: async (ctx, { vehicleId }) => {
    const notes = await ctx.db
      .query("caseNotes")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicleId))
      .collect();

    return {
      vehicleId,
      notes: notes
        .map(({ timestamp, note }) => ({ timestamp, note }))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      investigations: [],
    };
  },
});

export const appendCaseNote = internalMutation({
  args: { vehicleId: v.string(), note: v.string() },
  handler: async (ctx, { vehicleId, note }) => {
    await ctx.db.insert("caseNotes", {
      vehicleId,
      note,
      timestamp: nowIso(),
    });
  },
});

export const clearCaseFile = internalMutation({
  args: { vehicleId: v.string() },
  handler: async (ctx, { vehicleId }) => {
    const notes = await ctx.db
      .query("caseNotes")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicleId))
      .collect();

    await Promise.all(notes.map((note) => ctx.db.delete(note._id)));
  },
});

export const loadSession = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    return ctx.db
      .query("sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
  },
});

export const findLatestVehicleSession = internalQuery({
  args: { vehicleId: v.string() },
  handler: async (ctx, { vehicleId }) => {
    return ctx.db
      .query("sessions")
      .withIndex("by_vehicle_updated", (q) => q.eq("vehicleId", vehicleId))
      .order("desc")
      .first();
  },
});

export const saveSession = internalMutation({
  args: { sessionId: v.string(), patch: v.any() },
  handler: async (ctx, { sessionId, patch }) => {
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    const timestamp = nowIso();
    const cleanPatch = Object.fromEntries(
      Object.entries(patch ?? {}).filter(([, value]) => typeof value !== "undefined"),
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...cleanPatch,
        annotations: Array.isArray(cleanPatch.annotations)
          ? cleanPatch.annotations
          : existing.annotations ?? [],
        events: Array.isArray(cleanPatch.events) ? cleanPatch.events : existing.events ?? [],
        eventCount:
          typeof cleanPatch.eventCount === "number"
            ? cleanPatch.eventCount
            : existing.eventCount ?? (existing.events?.length || 0),
        updatedAt: timestamp,
      });
      return {
        ...existing,
        ...cleanPatch,
        updatedAt: timestamp,
      };
    }

    const next = {
      sessionId,
      vehicleId: cleanPatch.vehicleId,
      status: cleanPatch.status || "idle",
      currentPhase: cleanPatch.currentPhase ?? null,
      phaseStatus: cleanPatch.phaseStatus || "",
      phaseProgress: cleanPatch.phaseProgress ?? null,
      modelGuidance: cleanPatch.modelGuidance ?? null,
      evidenceRequest: cleanPatch.evidenceRequest ?? null,
      followUpQuestion: cleanPatch.followUpQuestion ?? null,
      brief: cleanPatch.brief ?? null,
      annotations: Array.isArray(cleanPatch.annotations) ? cleanPatch.annotations : [],
      budget: cleanPatch.budget ?? null,
      events: Array.isArray(cleanPatch.events) ? cleanPatch.events : [],
      eventCount: typeof cleanPatch.eventCount === "number" ? cleanPatch.eventCount : 0,
      messages: cleanPatch.messages,
      totalTokensUsed: cleanPatch.totalTokensUsed,
      fullResponse: cleanPatch.fullResponse,
      error: cleanPatch.error ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const insertable = Object.fromEntries(
      Object.entries(next).filter(([, value]) => typeof value !== "undefined"),
    ) as any;

    await ctx.db.insert("sessions", insertable);
    return insertable;
  },
});

export const appendSessionEvent = internalMutation({
  args: {
    sessionId: v.string(),
    event: v.string(),
    data: v.any(),
    patch: v.any(),
  },
  handler: async (ctx, { sessionId, event, data, patch }) => {
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    if (!existing) return null;

    const eventCount = existing.eventCount || 0;
    const nextEvents = [
      ...(Array.isArray(existing.events) ? existing.events : []),
      {
        index: eventCount,
        event,
        data,
        timestamp: nowIso(),
      },
    ].slice(-200);

    const nextAnnotations =
      event === "annotation"
        ? [...(Array.isArray(existing.annotations) ? existing.annotations : []), data]
        : existing.annotations ?? [];

    await ctx.db.patch(existing._id, {
      ...(patch ?? {}),
      annotations: nextAnnotations,
      events: nextEvents,
      eventCount: eventCount + 1,
      updatedAt: nowIso(),
    });

    return { ok: true };
  },
});

export const clearVehicleSessions = internalMutation({
  args: { vehicleId: v.string() },
  handler: async (ctx, { vehicleId }) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_vehicle_updated", (q) => q.eq("vehicleId", vehicleId))
      .collect();

    await Promise.all(sessions.map((session) => ctx.db.delete(session._id)));
  },
});

export const consumeRateLimit = internalMutation({
  args: {
    key: v.string(),
    limit: v.number(),
    windowMs: v.number(),
  },
  handler: async (ctx, { key, limit, windowMs }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (!existing || now - existing.windowStart >= windowMs) {
      if (existing) {
        await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
      } else {
        await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
      }
      return { ok: true, remaining: Math.max(0, limit - 1), retryAfterMs: 0 };
    }

    if (existing.count >= limit) {
      return {
        ok: false,
        remaining: 0,
        retryAfterMs: Math.max(0, windowMs - (now - existing.windowStart)),
      };
    }

    await ctx.db.patch(existing._id, { count: existing.count + 1 });
    return {
      ok: true,
      remaining: Math.max(0, limit - existing.count - 1),
      retryAfterMs: 0,
    };
  },
});

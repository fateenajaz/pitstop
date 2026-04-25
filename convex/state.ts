import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

function nowIso() {
  return new Date().toISOString();
}

export const getCaseFile = internalQuery({
  args: { userId: v.id("users"), vehicleId: v.string() },
  handler: async (ctx, { userId, vehicleId }) => {
    const notes = await ctx.db
      .query("caseNotes")
      .withIndex("by_user_vehicle", (q) => q.eq("userId", userId).eq("vehicleId", vehicleId))
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
  args: { userId: v.id("users"), vehicleId: v.string(), note: v.string() },
  handler: async (ctx, { userId, vehicleId, note }) => {
    await ctx.db.insert("caseNotes", {
      userId,
      vehicleId,
      note,
      timestamp: nowIso(),
    });
  },
});

export const clearCaseFile = internalMutation({
  args: { userId: v.id("users"), vehicleId: v.string() },
  handler: async (ctx, { userId, vehicleId }) => {
    const notes = await ctx.db
      .query("caseNotes")
      .withIndex("by_user_vehicle", (q) => q.eq("userId", userId).eq("vehicleId", vehicleId))
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
  args: { userId: v.id("users"), vehicleId: v.string() },
  handler: async (ctx, { userId, vehicleId }) => {
    return ctx.db
      .query("sessions")
      .withIndex("by_user_vehicle_updated", (q) => q.eq("userId", userId).eq("vehicleId", vehicleId))
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
      userId: cleanPatch.userId,
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
  args: { userId: v.id("users"), vehicleId: v.string() },
  handler: async (ctx, { userId, vehicleId }) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_vehicle_updated", (q) => q.eq("userId", userId).eq("vehicleId", vehicleId))
      .collect();

    await Promise.all(sessions.map((session) => ctx.db.delete(session._id)));
  },
});

export const getUserByUsernameLower = internalQuery({
  args: { usernameLower: v.string() },
  handler: async (ctx, { usernameLower }) => {
    return ctx.db
      .query("users")
      .withIndex("by_username_lower", (q) => q.eq("usernameLower", usernameLower))
      .first();
  },
});

export const createUser = internalMutation({
  args: {
    username: v.string(),
    usernameLower: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
    iterations: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username_lower", (q) => q.eq("usernameLower", args.usernameLower))
      .first();

    if (existing) throw new Error("Username is already taken.");

    const userId = await ctx.db.insert("users", {
      ...args,
      createdAt: nowIso(),
    });

    return { userId };
  },
});

export const createAuthSession = internalMutation({
  args: {
    userId: v.id("users"),
    tokenHash: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, { userId, tokenHash, expiresAt }) => {
    await ctx.db.insert("authSessions", {
      userId,
      tokenHash,
      expiresAt,
      createdAt: nowIso(),
    });
  },
});

export const getAuthSession = internalQuery({
  args: { tokenHash: v.string(), now: v.number() },
  handler: async (ctx, { tokenHash, now }) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (!session || session.expiresAt < now) return null;
    const user = await ctx.db.get(session.userId);
    if (!user) return null;

    return {
      sessionId: session._id,
      user: {
        id: user._id,
        username: user.username,
      },
    };
  },
});

export const deleteAuthSession = internalMutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (session) await ctx.db.delete(session._id);
  },
});

export const listCars = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const cars = await ctx.db
      .query("cars")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return cars
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(({ publicId, name, label, type, color, modelAsset, photos, createdAt }) => ({
        id: publicId,
        name,
        label,
        type,
        color,
        modelAsset,
        photos: photos || [],
        createdAt,
      }));
  },
});

export const getOwnedCar = internalQuery({
  args: { userId: v.id("users"), publicId: v.string() },
  handler: async (ctx, { userId, publicId }) => {
    return ctx.db
      .query("cars")
      .withIndex("by_user_public_id", (q) => q.eq("userId", userId).eq("publicId", publicId))
      .first();
  },
});

export const createCar = internalMutation({
  args: {
    userId: v.id("users"),
    publicId: v.string(),
    name: v.string(),
    label: v.string(),
    type: v.string(),
    color: v.string(),
    modelAsset: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const timestamp = nowIso();
    await ctx.db.insert("cars", {
      ...args,
      photos: args.photos || [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      id: args.publicId,
      name: args.name,
      label: args.label,
      type: args.type,
      color: args.color,
      modelAsset: args.modelAsset,
      photos: args.photos || [],
      createdAt: timestamp,
    };
  },
});

export const updateCar = internalMutation({
  args: {
    userId: v.id("users"),
    publicId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      label: v.optional(v.string()),
      type: v.optional(v.string()),
      color: v.optional(v.string()),
      modelAsset: v.optional(v.string()),
      photos: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, { userId, publicId, updates }) => {
    const car = await ctx.db
      .query("cars")
      .withIndex("by_user_public_id", (q) => q.eq("userId", userId).eq("publicId", publicId))
      .first();

    if (!car) throw new Error("Car not found.");

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => typeof value !== "undefined"),
    );
    await ctx.db.patch(car._id, { ...cleanUpdates, updatedAt: nowIso() });
    return { success: true };
  },
});

export const deleteCar = internalMutation({
  args: { userId: v.id("users"), publicId: v.string() },
  handler: async (ctx, { userId, publicId }) => {
    const car = await ctx.db
      .query("cars")
      .withIndex("by_user_public_id", (q) => q.eq("userId", userId).eq("publicId", publicId))
      .first();

    if (car) await ctx.db.delete(car._id);
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

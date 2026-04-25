import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    usernameLower: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
    iterations: v.number(),
    createdAt: v.string(),
  }).index("by_username_lower", ["usernameLower"]),

  authSessions: defineTable({
    userId: v.id("users"),
    tokenHash: v.string(),
    expiresAt: v.number(),
    createdAt: v.string(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_user", ["userId"]),

  cars: defineTable({
    userId: v.id("users"),
    publicId: v.string(),
    name: v.string(),
    label: v.string(),
    type: v.string(),
    color: v.string(),
    modelAsset: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_public_id", ["publicId"])
    .index("by_user_public_id", ["userId", "publicId"]),

  caseNotes: defineTable({
    userId: v.id("users"),
    vehicleId: v.string(),
    timestamp: v.string(),
    note: v.string(),
  })
    .index("by_vehicle", ["vehicleId"])
    .index("by_user_vehicle", ["userId", "vehicleId"]),

  sessions: defineTable({
    sessionId: v.string(),
    userId: v.optional(v.id("users")),
    vehicleId: v.optional(v.string()),
    status: v.string(),
    currentPhase: v.optional(v.union(v.string(), v.null())),
    phaseStatus: v.optional(v.string()),
    phaseProgress: v.optional(v.union(v.number(), v.null())),
    modelGuidance: v.optional(v.any()),
    evidenceRequest: v.optional(v.any()),
    followUpQuestion: v.optional(v.any()),
    brief: v.optional(v.any()),
    annotations: v.optional(v.array(v.any())),
    budget: v.optional(v.any()),
    events: v.optional(v.array(v.any())),
    eventCount: v.number(),
    messages: v.optional(v.any()),
    totalTokensUsed: v.optional(v.number()),
    fullResponse: v.optional(v.string()),
    error: v.optional(v.union(v.string(), v.null())),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_session", ["sessionId"])
    .index("by_vehicle_updated", ["vehicleId", "updatedAt"])
    .index("by_user_vehicle_updated", ["userId", "vehicleId", "updatedAt"]),

  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),
});

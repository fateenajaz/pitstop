import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  caseNotes: defineTable({
    vehicleId: v.string(),
    timestamp: v.string(),
    note: v.string(),
  }).index("by_vehicle", ["vehicleId"]),

  sessions: defineTable({
    sessionId: v.string(),
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
    .index("by_vehicle_updated", ["vehicleId", "updatedAt"]),

  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),
});

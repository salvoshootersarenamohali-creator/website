import { describe, expect, it } from "vitest"
import { reviewStatus, summarizeTraining } from "@/lib/range/training-sessions"
import { sessionFields } from "@/lib/range/training-core"
import { validateTrainingFile } from "@/lib/range/training-media"

describe("training records and analytics", () => {
    it("weights percentages by maximum and preserves missing values and zero", () => {
        const result = summarizeTraining([
            { date: "2026-01-01", discipline: "pistol", score: 0, maximumScore: 100, durationMinutes: null, shotCount: 0 },
            { date: "2026-01-01", discipline: "pistol", score: "300", maximumScore: "400", durationMinutes: 40, shotCount: null },
            { date: "2026-01-02", discipline: "general", score: null, maximumScore: null, durationMinutes: null, shotCount: null },
        ])
        expect(result.summary).toEqual({ sessions: 3, trainingDays: 2, percentage: 60, durationMinutes: 40, shotCount: 0 })
        expect(result.series[0].percentage).toBe(60)
        expect(result.series[1]).toMatchObject({ percentage: null, score: null, durationMinutes: null, shotCount: null })
        expect(summarizeTraining([]).summary).toMatchObject({ percentage: null, durationMinutes: null, shotCount: null })
    })
    it("flags each coach's own old review without erasing other reviews", () => {
        const reviews = [{ coachId: "a", reviewed: true, sessionVersion: 1 }, { coachId: "b", reviewed: true, sessionVersion: 2 }]
        expect(reviewStatus(2, reviews, "a")).toBe("changed")
        expect(reviewStatus(2, reviews, "b")).toBe("reviewed")
        expect(reviewStatus(2, reviews, "c")).toBe("unreviewed")
        expect(reviewStatus(2, reviews)).toBe("changed")
    })
    it("validates score pairs, decimal precision, dates and optional metrics", () => {
        const input = { date: "2026-01-01", label: "Morning", discipline: "pistol", notes: "" }
        expect(sessionFields({ ...input, score: 0, maximumScore: 400 })).toMatchObject({ score: 0, shotCount: null })
        expect(sessionFields({ ...input, score: 365.25, maximumScore: 400 })).toMatchObject({ score: 365.25 })
        for (const invalid of [{ score: 300 }, { score: 401, maximumScore: 400 }, { score: -1, maximumScore: 400 }, { score: 1.001, maximumScore: 400 }, { maximumScore: 0, score: 0 }, { shotCount: 2.5 }, { score: true, maximumScore: 400 }, { date: "2099-01-01" }, { date: "2026-02-30" }, { durationMinutes: 1441 }, { discipline: "unknown" }]) expect(() => sessionFields({ ...input, ...invalid })).toThrow()
    })
    it("rejects oversized, disguised, and unsupported uploads", () => {
        expect(() => validateTrainingFile(new Uint8Array([255, 216, 255, 1]), "image/jpeg", "target")).not.toThrow()
        expect(() => validateTrainingFile(new TextEncoder().encode("%PDF-1.7"), "application/pdf", "plan")).not.toThrow()
        expect(() => validateTrainingFile(new TextEncoder().encode("%PDF-1.7"), "application/pdf", "target")).toThrow()
        expect(() => validateTrainingFile(new TextEncoder().encode("<svg>"), "image/jpeg", "target")).toThrow()
        expect(() => validateTrainingFile(new Uint8Array(3000001), "image/jpeg", "target")).toThrow()
        expect(() => validateTrainingFile(new Uint8Array(), "image/png", "target")).toThrow()
    })
})

import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Tutorial } from "@/components/range/Tutorial"
import { readTutorialProgress, searchTutorialLessons, tutorialGuides, type TutorialRole } from "@/lib/range/tutorials"

const destinations = {
    student: ["overview", "plans", "diary", "progress", "security"],
    coach: ["home", "training", "students", "attendance", "fees", "finance", "transfers", "password"],
    owner: ["home", "training", "students", "attendance", "fees", "finance", "transfers", "password", "staff", "salaries", "reports"],
}

describe("account tutorials", () => {
    it.each<TutorialRole>(["student", "coach", "owner"])("keeps %s lessons within that account's available screens", role => {
        const guide = tutorialGuides[role]
        expect(new Set(guide.lessons.map(lesson => lesson.id)).size).toBe(guide.lessons.length)
        for (const lesson of guide.lessons) {
            expect(destinations[role]).toContain(lesson.destination)
            expect(lesson.steps.length).toBeGreaterThanOrEqual(4)
        }
        const html = renderToStaticMarkup(createElement(Tutorial, { user: { id: "test-account", name: "Test User", phone: null, role, mustChangePassword: true }, navigate: () => {} }))
        expect(html).toContain(guide.title)
        expect(html).toContain("change your temporary password")
        expect(html).toContain("Start visual walkthrough")
        if (role !== "owner") {
            expect(html).not.toContain("Record and correct salary payments")
            expect(html).not.toContain("Set up locations and coach accounts")
        }
    })

    it("finds relevant lessons using instructions as well as titles", () => {
        expect(searchTutorialLessons(tutorialGuides.student.lessons, "  maximum SCORE ").map(lesson => lesson.id)).toContain("record-session")
        expect(searchTutorialLessons(tutorialGuides.coach.lessons, "camera permission").map(lesson => lesson.id)).toContain("coach-shifts")
        expect(searchTutorialLessons(tutorialGuides.student.lessons, "salary")).toEqual([])
    })

    it("recovers progress after invalid storage, a changed lesson list, or a role mismatch", () => {
        const lessons = tutorialGuides.student.lessons
        for (const value of [null, "broken json", "null", "42", "[]"]) {
            expect(readTutorialProgress(value, lessons)).toEqual({ lessonId: lessons[0].id, completed: [] })
        }
        expect(readTutorialProgress(JSON.stringify({ lessonId: "salary-payments", completed: ["record-session", "record-session", "salary-payments", null, 2] }), lessons))
            .toEqual({ lessonId: lessons[0].id, completed: ["record-session"] })
        expect(readTutorialProgress(JSON.stringify({ lessonId: "read-plans", completed: "invalid" }), lessons))
            .toEqual({ lessonId: "read-plans", completed: [] })
    })

    it("restores a valid reading position and completion history", () => {
        const progress = { lessonId: "review-diaries", completed: ["account-security", "assign-plans"] }
        expect(readTutorialProgress(JSON.stringify(progress), tutorialGuides.coach.lessons)).toEqual(progress)
    })

    it("does not expose a guide for an unknown account role", () => {
        expect(renderToStaticMarkup(createElement(Tutorial, { user: { id: "test", name: "Test", phone: null, role: "unknown", mustChangePassword: false }, navigate: () => {} }))).toBe("")
    })
})

import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { VisualWalkthrough } from "@/components/range/tutorial/VisualWalkthrough"
import { createDemoState, demoReducer, demoStepDone, type DemoAction } from "@/lib/range/tutorial-demo"
import { demoFieldsValid, getWalkthrough } from "@/lib/range/tutorial-walkthroughs"
import { tutorialGuides, type TutorialRole } from "@/lib/range/tutorials"

describe("visual tutorial isolation and workflows", () => {
    it.each<TutorialRole>(["student", "coach", "owner", "finance"])("lets every %s walkthrough reach its final demo result", role => {
        for (const lesson of tutorialGuides[role].lessons) {
            const walk = getWalkthrough(lesson.id, role)
            let state = createDemoState()
            for (const step of walk.steps) {
                const actions: Record<string, DemoAction> = { navigation: { type: "open" }, start: { type: "start" }, details: { type: "fill", walkthrough: walk }, attachment: { type: "attach" }, save: { type: "save", walkthrough: walk }, result: { type: "extra" }, history: { type: "history" } }
                state = demoReducer(state, actions[step.target])
                expect(demoStepDone(step, state, walk), `${role}: ${lesson.id}: ${step.target}`).toBe(true)
            }
        }
    })

    it("starts each visit empty without modifying any previous demo session", () => {
        const initial = createDemoState()
        const walk = getWalkthrough("record-session", "student")
        const filled = demoReducer(initial, { type: "fill", walkthrough: walk })
        const saved = demoReducer(filled, { type: "save", walkthrough: walk })
        expect(initial.values).toEqual({})
        expect(saved.saved).toBe(true)
        expect(createDemoState()).toEqual(initial)
        expect(createDemoState().values).not.toBe(saved.values)
    })

    it("waits for a valid score and maximum before saving a session", () => {
        const walk = getWalkthrough("record-session", "student")
        let state = demoReducer(createDemoState(), { type: "fill", walkthrough: walk })
        state = demoReducer(state, { type: "field", key: "maximum", value: "100" })
        expect(demoReducer(state, { type: "save", walkthrough: walk }).saved).toBe(false)
        state = demoReducer(state, { type: "field", key: "maximum", value: "400" })
        expect(demoReducer(state, { type: "save", walkthrough: walk }).saved).toBe(true)
    })

    it("requires a simulated capture for check-in without using a camera", () => {
        const walk = getWalkthrough("coach-shifts", "coach")
        expect(demoReducer(createDemoState(), { type: "save", walkthrough: walk }).saved).toBe(false)
        const captured = demoReducer(createDemoState(), { type: "attach" })
        expect(demoReducer(captured, { type: "save", walkthrough: walk }).saved).toBe(true)
    })

    it("keeps recorded zero metrics valid in the example diary", () => {
        const walk = getWalkthrough("record-session", "student")
        let state = demoReducer(createDemoState(), { type: "fill", walkthrough: walk })
        state = demoReducer(state, { type: "field", key: "score", value: "0" })
        expect(demoReducer(state, { type: "save", walkthrough: walk }).saved).toBe(true)
    })

    it("keeps preview choices available until the second plan save", () => {
        const walk = getWalkthrough("assign-plans", "coach")
        let state = demoReducer(createDemoState(), { type: "fill", walkthrough: walk })
        state = demoReducer(state, { type: "save", walkthrough: walk })
        state = demoReducer(state, { type: "field", key: "replace", value: "yes" })
        expect(state.saved).toBe(true)
        expect(demoStepDone(walk.steps.at(-1)!, state, walk)).toBe(false)
        state = demoReducer(state, { type: "extra" })
        expect(demoStepDone(walk.steps.at(-1)!, state, walk)).toBe(true)
    })

    it("rejects reversed coverage dates and mismatched example passwords", () => {
        const walk = getWalkthrough("account-security", "owner")
        const sample = Object.fromEntries(walk.fields.map(field => [field.key, field.sample]))
        expect(demoFieldsValid(walk.fields, { ...sample, confirm: "different" })).toBe(false)
        expect(demoFieldsValid([], { start: "2026-12-03", end: "2026-11-03" })).toBe(false)
    })

    it("uses a total amount for expenses instead of requiring product details", () => {
        const walk = getWalkthrough("income-expenses", "coach")
        const values = { type: "Expense", amount: "500", account: "Demo range cash", notes: "Sample range expense" }
        expect(demoFieldsValid(walk.fields, values)).toBe(true)
        expect(demoFieldsValid(walk.fields, { ...values, amount: "" })).toBe(false)
    })

    it("renders the modal without fetching real records or requesting camera access", () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Tutorial must not fetch"))
        try {
            renderToStaticMarkup(createElement(VisualWalkthrough, { lesson: tutorialGuides.coach.lessons.find(lesson => lesson.id === "coach-shifts")!, role: "coach", onExit: () => {}, onLeave: () => {}, onComplete: () => {} }))
            expect(fetchSpy).not.toHaveBeenCalled()
        } finally { fetchSpy.mockRestore() }
    })
})

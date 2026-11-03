import { demoFieldsValid, type Walkthrough, type WalkthroughStep } from "./tutorial-walkthroughs"

// A walkthrough owns this state in memory. It never enters the range API or storage.
export type DemoState = { opened: boolean; started: boolean; values: Record<string, string>; attached: boolean; saved: boolean; history: boolean; extra: boolean }
export function createDemoState(): DemoState { return { opened: false, started: false, values: {}, attached: false, saved: false, history: false, extra: false } }
export type DemoAction = { type: "open" | "start" | "attach" | "history" | "extra" } | { type: "field"; key: string; value: string } | { type: "fill" | "save"; walkthrough: Walkthrough }
export function demoReducer(state: DemoState, action: DemoAction): DemoState {
    switch (action.type) {
        case "open": return { ...state, opened: true }
        case "start": return { ...state, started: true }
        case "attach": return { ...state, attached: true }
        case "history": return { ...state, history: true }
        case "extra": return { ...state, extra: true }
        case "field": return { ...state, values: { ...state.values, [action.key]: action.value }, saved: action.key === "replace" ? state.saved : false, extra: false }
        case "fill": return { ...state, values: { ...state.values, ...Object.fromEntries(action.walkthrough.fields.map(item => [item.key, item.sample])), ...(action.walkthrough.kind === "attendance" ? { attendance: "Present" } : {}) }, saved: false, extra: false }
        case "save": {
            const walk = action.walkthrough
            if (!demoFieldsValid(walk.fields, state.values) || (["images", "shift"].includes(walk.kind) && !state.attached) || (walk.kind === "attendance" && !state.values.attendance)) return state
            return { ...state, saved: true }
        }
    }
}

export function demoStepDone(step: WalkthroughStep, state: DemoState, walkthrough: Walkthrough) {
    switch (step.target) {
        case "navigation": return state.opened
        case "start": return state.started
        case "details": return walkthrough.kind === "attendance" ? Boolean(state.values.attendance) : demoFieldsValid(walkthrough.fields, state.values)
        case "attachment": return state.attached
        case "save": return state.saved
        case "history": return state.history
        case "result": return step.task ? state.extra : true
    }
}

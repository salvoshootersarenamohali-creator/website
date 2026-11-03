"use client"

import { useEffect, useReducer, useRef, useState, type ReactNode } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { ArrowLeft, ArrowRight, BookOpen, Camera, Check, CheckCircle2, ChevronRight, CirclePlay, Crosshair, FileText, Flag, Lightbulb, MousePointer2, RotateCcw, ShieldCheck, Sparkles, Target, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TutorialLesson, TutorialRole } from "@/lib/range/tutorials"
import { getWalkthrough, visibleDemoFields, type DemoTarget, type Walkthrough } from "@/lib/range/tutorial-walkthroughs"
import { createDemoState, demoReducer, demoStepDone, type DemoState } from "@/lib/range/tutorial-demo"
import { Field, Panel, StatusBadge } from "../shared"

type Props = { lesson: TutorialLesson; role: TutorialRole; onExit: () => void; onLeave: () => void; onComplete: () => void; onNext?: () => void }
export function VisualWalkthrough({ lesson, role, onExit, onLeave, onComplete, onNext }: Props) {
    const walkthrough = getWalkthrough(lesson.id, role)
    const [state, dispatch] = useReducer(demoReducer, undefined, createDemoState)
    const [stepIndex, setStepIndex] = useState(0), [finished, setFinished] = useState(false)
    const root = useRef<HTMLDivElement>(null), coachHeading = useRef<HTMLHeadingElement>(null)
    const step = walkthrough.steps[stepIndex], done = demoStepDone(step, state, walkthrough)
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            root.current?.querySelector<HTMLElement>(`[data-demo-target="${step.target}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" })
            coachHeading.current?.focus({ preventScroll: true })
        })
        return () => cancelAnimationFrame(frame)
    }, [stepIndex, step.target])

    function showMe() {
        switch (step.target) {
            case "navigation": dispatch({ type: "open" }); break
            case "start": dispatch({ type: "start" }); break
            case "details": dispatch({ type: "fill", walkthrough }); break
            case "attachment": dispatch({ type: "attach" }); break
            case "save": dispatch({ type: "save", walkthrough }); break
            case "result": dispatch({ type: "extra" }); break
            case "history": dispatch({ type: "history" }); break
        }
    }
    function next() {
        if (!done) return
        if (stepIndex === walkthrough.steps.length - 1) { onComplete(); setFinished(true) }
        else setStepIndex(index => index + 1)
    }
    const focus = (target: DemoTarget, children: ReactNode) => <DemoFocus key={target} id={target} active={step.target === target} number={stepIndex + 1}>{children}</DemoFocus>
    const value = (key: string) => state.values[key] || ""
    const money = (key: string, fallback: number) => `₹${Number(value(key) || fallback).toLocaleString("en-IN")}`
    const history = () => focus("history", <div className="demo-history"><Button variant="outline" onClick={() => dispatch({ type: "history" })}>{walkthrough.kind === "report" ? "Download Excel" : walkthrough.kind === "shift" ? "Practise check-out" : "Version history"}<ChevronRight size={15} aria-hidden="true" /></Button>{state.history && <div className="demo-history-content" role="status">{walkthrough.kind === "report" ? <><strong>Example export preview</strong><p>Records sheet · {exampleReport(state.values).rows.length} sample rows</p><p>Summary sheet · {exampleReport(state.values).totals.map(([label, amount]) => `${label} ${amount}`).join(" · ")}</p><small>This preview uses only tutorial data.</small></> : walkthrough.kind === "shift" ? <><strong>Checked out · 5:00 PM IST</strong><p>8 completed hours · Sample shift</p></> : <><strong>Version 1 · Earlier entry</strong><p>Focus on a steady hold and a clean release.</p><strong>Version 2 · Current entry</strong><p>{value("notes") || "Keep the same follow-through on the final ten shots."}</p></>}</div>}</div>)

    return <Dialog.Root open onOpenChange={open => { if (!open) onLeave() }}><Dialog.Portal><Dialog.Overlay className="walkthrough-overlay" /><Dialog.Content className="range-app walkthrough-dialog" ref={root} aria-describedby="walkthrough-description">
        <header className="walkthrough-topbar"><div><span className="walkthrough-mode"><Sparkles size={14} aria-hidden="true" />Tutorial mode</span><Dialog.Title>{lesson.title}</Dialog.Title></div><div className="walkthrough-topbar-tools"><Button variant="ghost" aria-label="All walkthroughs" onClick={onExit}><BookOpen size={16} aria-hidden="true" /><span className="walkthrough-all-label">All walkthroughs</span></Button><Dialog.Close asChild><Button variant="outline"><X size={16} aria-hidden="true" />Exit tutorial</Button></Dialog.Close></div></header>
        <Dialog.Description id="walkthrough-description" className="walkthrough-banner"><ShieldCheck size={15} aria-hidden="true" />Practice with sample data. Nothing here changes your account.</Dialog.Description>
        {finished ? <div className="walkthrough-finished"><span><CheckCircle2 size={42} aria-hidden="true" /></span><p className="range-eyebrow">Walkthrough complete</p><h2>You’ve tried it. Now you know the steps.</h2><p>{lesson.title}</p><p className="range-muted">Your demo session ends when you leave. You can replay it whenever you like.</p><div>{onNext && <Button onClick={onNext}>Next walkthrough<ArrowRight size={16} aria-hidden="true" /></Button>}<Button variant="outline" onClick={onExit}>Choose another walkthrough</Button></div></div> : <div className="walkthrough-body">
            <div className="demo-stage" aria-label={`${role} demo workspace`}>
                <div className="demo-scroll"><div className="demo-workspace">
                    <aside className="demo-sidebar"><div className="demo-brand"><Crosshair size={25} aria-hidden="true" /><span>SALVO<small>{role === "student" ? "Student portal" : "Range workspace"}</small></span></div><p className="demo-nav-label">{role} demo</p><nav aria-label="Demo workspace menu">{demoNavigation(role).map(label => label === walkthrough.screen ? focus("navigation", <button type="button" className={`demo-nav-current ${state.opened ? "demo-nav-opened" : ""}`} onClick={() => dispatch({ type: "open" })}><MousePointer2 size={16} aria-hidden="true" />{label}</button>) : <button type="button" disabled key={label}>{label}</button>)}</nav><div className="demo-person"><span>{role === "student" ? "AS" : "CD"}</span><div>{role === "student" ? "Aarav Sharma" : role === "coach" ? "Coach Dev" : "Demo Owner"}<small>Sample account</small></div></div></aside>
                    <main className="demo-main"><div className="demo-location"><span>{state.opened ? walkthrough.screen : "Overview"}</span><span>Demo Zirakpur · IST</span></div>
                        <div className="demo-page-heading"><p className="range-eyebrow">{role} workspace · Example day</p><h2>{state.opened ? walkthrough.screen : "Welcome to your practice workspace"}</h2><p>3 November 2026 · All people and records below are examples.</p></div>
                        {!state.opened ? <DemoOverview role={role} /> : <>
                            {focus("start", <div className="demo-action-row"><div><strong>{walkthrough.screen}</strong><p>{walkthrough.kind === "form" ? "Create and review a sample record." : "Explore the example and try the highlighted action."}</p></div><Button onClick={() => dispatch({ type: "start" })}>{state.started && <Check size={15} aria-hidden="true" />}{walkthrough.start}</Button></div>)}
                            {!state.started ? <div className="demo-placeholder"><CirclePlay size={37} aria-hidden="true" /><h3>Your example is ready.</h3><p>Follow the highlighted steps to practise this workflow.</p><div className="demo-mini-students"><span>AS</span>{role !== "student" && <><span>MS</span><span>KR</span></>}<small>{role === "student" ? "Your sample training" : "Demo students & records"}</small></div></div> : <div className="demo-workflow">
                                {walkthrough.kind === "attendance" && focus("details", <Panel title="Daily student roll" description="Demo Zirakpur · 3 November 2026"><div className="range-roll-summary"><span><strong>1</strong> Present</span><span><strong>1</strong> Leave</span><span><strong>{value("attendance") ? "0" : "1"}</strong> Unmarked</span></div><div className="demo-attendance-tools"><p>Bulk marking preserves existing choices.</p><Button variant="outline" onClick={() => dispatch({ type: "field", key: "attendance", value: "Present" })}>Mark unmarked present</Button></div>{[["Aarav Sharma", "Present"], ["Meera Singh", "Leave"], ["Kabir Rao", value("attendance") || "Unmarked"]].map(([name, mark], index) => <div key={name} className="demo-roll-row"><span className="range-student-avatar">{name.split(" ").map(word => word[0]).join("")}</span><strong>{name}</strong>{index < 2 ? <StatusBadge tone={index === 0 ? "success" : "neutral"}>{mark}</StatusBadge> : <label><span className="sr-only">Attendance for Kabir Rao</span><select className="field" value={value("attendance")} onChange={event => dispatch({ type: "field", key: "attendance", value: event.target.value })}><option value="">Unmarked</option>{["Present", "Absent", "Leave"].map(item => <option key={item}>{item}</option>)}</select></label>}</div>)}</Panel>)}
                                {!!walkthrough.fields.length && focus("details", <Panel title={walkthrough.kind === "progress" ? "Progress filters" : walkthrough.kind === "report" ? "Report filters" : walkthrough.start} description="Use these sample fields to practise the steps.">
                                    {["session", "review", "feedback"].includes(walkthrough.kind) && <DemoSession reviewed={walkthrough.kind === "feedback"} name={value("student") || "Aarav Sharma"} />}
                                    {walkthrough.kind === "transfer" && <div className="demo-transfer-preview"><StatusBadge tone="warning">Pending</StatusBadge><h3>Coach Dev → Demo range cash</h3><strong>₹1,000</strong><p>Daily cash handover · 3 November 2026</p></div>}
                                    <div className="demo-fields">{visibleDemoFields(walkthrough.fields, state.values).map(item => <Field key={item.key} label={item.label}>{item.options ? <select className="field" value={value(item.key)} onChange={event => dispatch({ type: "field", key: item.key, value: event.target.value })}><option value="">Choose {item.label.toLowerCase()}</option>{item.options.map(option => <option key={option}>{option}</option>)}</select> : item.type === "textarea" ? <textarea className="field" rows={3} value={value(item.key)} placeholder={item.sample} maxLength={1000} autoComplete="off" onChange={event => dispatch({ type: "field", key: item.key, value: event.target.value })} /> : <input className="field" type={item.type || "text"} value={value(item.key)} placeholder={item.sample} min={item.type === "number" && item.key !== "opening" ? ["score", "shots", "minutes"].includes(item.key) ? "0" : "0.01" : undefined} step={item.type === "number" ? "any" : undefined} maxLength={150} autoComplete="off" data-1p-ignore data-lpignore="true" onChange={event => dispatch({ type: "field", key: item.key, value: event.target.value })} />}</Field>)}</div><Button variant="outline" className="demo-fill" onClick={() => dispatch({ type: "fill", walkthrough })}><Sparkles size={15} aria-hidden="true" />Fill sample values</Button>
                                </Panel>)}
                                {["images", "shift", "plans"].includes(walkthrough.kind) && focus("attachment", <Panel title={walkthrough.kind === "shift" ? "Live camera · Demo" : walkthrough.kind === "plans" ? "Plan documents" : "Target images"} description={walkthrough.kind === "shift" ? "A simulated camera preview. Your camera stays off." : "A provided example; no real file is uploaded."}>
                                    {walkthrough.kind === "shift" ? <div className="demo-camera"><svg viewBox="0 0 280 145" role="img" aria-label="Illustrated demo selfie"><rect width="280" height="145" rx="12" fill="#e9efe8" /><circle cx="140" cy="57" r="26" fill="#c1d0bc" /><path d="M80 145v-15c0-34 27-46 60-46s60 12 60 46v15" fill="#819d77" /><rect x="91" y="18" width="98" height="111" rx="30" fill="none" stroke="#285443" strokeDasharray="6 5" />{state.attached && <text x="140" y="139" textAnchor="middle" fontSize="11" fill="#285443">Sample captured</text>}</svg></div> : walkthrough.kind !== "plans" && state.attached ? <TargetPicture /> : null}
                                    <Button variant="outline" onClick={() => dispatch({ type: "attach" })}>{walkthrough.kind === "shift" ? <Camera size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}{walkthrough.kind === "shift" ? "Take demo selfie" : walkthrough.kind === "plans" ? "Open sample drill sheet" : "Use sample target"}</Button>
                                    {walkthrough.kind === "plans" && state.attached && <div className="demo-drill-sheet" role="status"><p className="range-eyebrow">Example drill sheet · Preview</p><h3>Precision practice · 40 shots</h3><div className="demo-drill-sets">{[1, 2, 3, 4].map(set => <span key={set}><Target size={22} aria-hidden="true" /><strong>Set {set}</strong>10 shots</span>)}</div><p>Warm up, keep a steady hold, and finish each shot with a consistent follow-through.</p></div>}
                                </Panel>)}
                                {walkthrough.kind !== "plans" && focus("save", <div className="demo-save"><Button onClick={() => dispatch({ type: "save", walkthrough })}>{state.saved ? <CheckCircle2 size={16} aria-hidden="true" /> : null}{walkthrough.save}</Button>{state.saved && <span role="status">{walkthrough.kind === "progress" ? "Showing raw scores out of 400" : "Example applied"}</span>}</div>)}
                                {(state.saved || ["plans", "progress", "overview"].includes(walkthrough.kind)) && focus("result", <Panel title={demoResultTitle(lesson.id, state, walkthrough)} description="Sample result · Tutorial only">
                                    {walkthrough.kind === "plans" ? <><div className="demo-plan"><p className="range-eyebrow">Aarav Sharma · 3 November · v2</p><h3>Steady hold. Clean release.</h3><ol><li>Warm up for 10 minutes.</li><li>Complete four sets of ten shots. Take a short break between sets.</li><li>Finish with five minutes of dry practice.</li></ol><small>Updated by Coach Dev</small></div></> : walkthrough.kind === "progress" ? <DemoProgress raw={state.saved} rifle={value("discipline") === "Air rifle"} month={value("period") === "This month"} /> : walkthrough.kind === "overview" ? <DemoOverview attention={state.saved} /> : walkthrough.kind === "report" ? <DemoReport report={value("report")} values={state.values} /> : <>
                                        <div className="demo-result-record"><CheckCircle2 size={25} aria-hidden="true" /><div><strong>{demoResultTitle(lesson.id, state, walkthrough)}</strong><p>{demoResultDescription(lesson.id, state)}</p></div><StatusBadge tone={lesson.id === "coach-handovers" || lesson.id === "feedback-history" ? "warning" : "success"}>{lesson.id === "coach-handovers" ? "Pending" : lesson.id === "feedback-history" ? "Changed since review" : lesson.id === "assign-plans" && !state.extra ? "Preview" : lesson.id === "student-access" && !state.extra ? "Account created" : "Saved"}</StatusBadge></div>
                                        {(lesson.id === "record-session" || lesson.id === "review-diaries") && <div className="demo-result-metrics"><span><strong>{value("score") || "365"} / {value("maximum") || "400"}</strong>Score</span><span><strong>{value("minutes") || "45"}</strong>Minutes</span><span><strong>{value("shots") || "40"}</strong>Shots</span></div>}
                                        {walkthrough.kind === "images" && state.attached && <TargetPicture />}
                                        {lesson.id === "feedback-history" && <DemoSession reviewed />}
                                        {lesson.id === "assign-plans" && <div className="demo-assignment-preview"><p>Aarav Sharma · Existing plan</p><label><input type="checkbox" checked={value("replace") === "yes"} onChange={event => dispatch({ type: "field", key: "replace", value: event.target.checked ? "yes" : "no" })} />Replace existing plan</label><p>Meera Singh · New plan</p><Button onClick={() => dispatch({ type: "extra" })}>Save selected assignments</Button>{state.extra && <p role="status">Plan saved for Meera{value("replace") === "yes" ? " and Aarav" : "; Aarav’s existing plan is preserved"}.</p>}</div>}
                                        {lesson.id === "student-access" && <div className="demo-assignment-preview"><p>Assigned coaches: {value("coach") || "Coach Dev"}</p><Button onClick={() => dispatch({ type: "extra" })}>Save coach assignments</Button>{state.extra && <p role="status">Sample coach assignment saved.</p>}</div>}
                                        {["income-expenses", "financial-setup", "owner-handovers"].includes(lesson.id) && <div className="demo-balance"><span>{lesson.id === "financial-setup" ? value("name") : value("account") || "Demo range cash"}</span><strong>{lesson.id === "financial-setup" ? money("opening", 5000) : lesson.id === "coach-handovers" ? "₹5,000" : lesson.id === "owner-handovers" && value("decision") === "Reject handover" ? "₹5,000" : lesson.id === "income-expenses" ? `₹${(5000 + (value("type") === "Product sale" ? Number(value("quantity")) * Number(value("price")) : (value("type") === "Expense" ? -1 : 1) * Number(value("amount")))).toLocaleString("en-IN")}` : "₹6,000"}</strong><small>Example tracked funds</small></div>}
                                        <dl className="demo-saved-values">{visibleDemoFields(walkthrough.fields, state.values).filter(item => !["current", "password", "confirm"].includes(item.key)).map(item => <div key={item.key}><dt>{item.label}</dt><dd>{value(item.key)}</dd></div>)}</dl>
                                    </>}
                                </Panel>)}
                                {walkthrough.steps.some(item => item.target === "history") && history()}
                            </div>}
                        </>}
                    </main>
                </div></div>
            </div>
            <aside className="walkthrough-coach" aria-label="Tutorial guidance"><div className="walkthrough-coach-top"><span><MousePointer2 size={18} aria-hidden="true" />Your guide</span><span>{stepIndex + 1} / {walkthrough.steps.length}</span></div><div className="walkthrough-dots" aria-label="Walkthrough progress">{walkthrough.steps.map((item, index) => <span key={index} className={index === stepIndex ? "is-current" : index < stepIndex ? "is-done" : ""} />)}</div><div className="walkthrough-instruction" key={stepIndex}><p className="range-eyebrow">Step {stepIndex + 1} · {step.task ? "Your turn" : "Take a look"}</p><h2 ref={coachHeading} tabIndex={-1}>{step.title}</h2><p>{step.instruction}</p>{step.task && <div className={`walkthrough-task ${done ? "is-done" : ""}`} role="status">{done ? <CheckCircle2 size={17} aria-hidden="true" /> : <MousePointer2 size={17} aria-hidden="true" />}<span>{done ? "Done. You’re ready to continue." : step.task}</span></div>}{step.task && !done && <Button variant="outline" onClick={showMe}><CirclePlay size={16} aria-hidden="true" />Show me</Button>}</div><div className="walkthrough-coach-bottom"><p><Lightbulb size={15} aria-hidden="true" />The highlighted area is the part to try. Use Back to revisit a step.</p><div><Button variant="outline" disabled={stepIndex === 0} onClick={() => setStepIndex(index => index - 1)}><ArrowLeft size={16} aria-hidden="true" />Back</Button><Button disabled={!done} onClick={next}>{stepIndex === walkthrough.steps.length - 1 ? "Finish walkthrough" : "Next"}{stepIndex === walkthrough.steps.length - 1 ? <Flag size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}</Button></div><Button variant="ghost" onClick={() => { dispatch({ type: "open" }); setStepIndex(0) }}><RotateCcw size={13} aria-hidden="true" />Back to first step</Button></div></aside>
        </div>}
    </Dialog.Content></Dialog.Portal></Dialog.Root>
}

function DemoFocus({ id, active, number, children }: { id: DemoTarget; active: boolean; number: number; children: ReactNode }) {
    return <div data-demo-target={id} className={`demo-focus ${active ? "demo-focus-active" : ""}`} inert={!active}>{active && <span className="demo-focus-number" aria-hidden="true">{number}</span>}{children}</div>
}
function demoNavigation(role: TutorialRole) {
    return role === "student" ? ["Overview", "Training Plans", "Diary & History", "Progress", "Account Security"] : ["Overview", "Training & progress", role === "owner" ? "Coach attendance" : "My attendance", "Students & attendance", "Admissions & fees", "Income & expenses", "Money handovers", ...(role === "owner" ? ["Salary payments", "Reports & history", "Staff & locations"] : []), "Account security"]
}
function demoResultTitle(id: string, state: DemoState, walk: Walkthrough) {
    const v = state.values
    if (id === "record-session") return v.label || walk.resultTitle
    if (id === "student-fees") return `${v.student} · ${v.type}`
    if (id === "income-expenses") return v.type === "Product sale" ? `${v.product} · ${v.quantity} × ₹${v.price}` : `${v.type} · ₹${Number(v.amount).toLocaleString("en-IN")}`
    if (id === "locations-staff") return `${v.name} · Active`
    if (id === "financial-setup") return `${v.name} · ₹${Number(v.opening).toLocaleString("en-IN")}`
    if (id === "owner-handovers" && v.decision === "Reject handover") return "Handover rejected"
    if (id === "reports-overview") return `${v.report} · ${v.location}`
    return walk.resultTitle
}
function demoResultDescription(id: string, state: DemoState) {
    const v = state.values
    if (id === "student-fees") return `₹${Number(v.amount).toLocaleString("en-IN")} · Coverage ${v.start} through ${v.end}`
    if (id === "income-expenses") return v.type === "Expense" ? "Example expense recorded. Tracked funds decrease." : "Example income recorded. Tracked funds increase."
    if (id === "salary-payments") return `₹${Number(v.amount).toLocaleString("en-IN")} · Paid ${v.date} for ${v.month}`
    if (id === "owner-handovers") return v.decision === "Reject handover" ? "No change to tracked balances." : "Equal debit and credit · Income and expenses unchanged."
    if (id === "coach-handovers") return `₹${Number(v.amount).toLocaleString("en-IN")} · Awaiting owner verification. Balances unchanged.`
    if (id === "owner-shifts") return `${v.arrival} → ${v.departure} IST · Owner adjustment`
    return "This example is stored only in the current tutorial session."
}
function DemoOverview({ attention = false, role = "coach" }: { attention?: boolean; role?: TutorialRole }) {
    if (role === "student") return <div className="demo-overview"><div className="demo-stat-grid">{[["My sessions", "4"], ["Training days", "4"], ["Score percentage", "91.3%"]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>Sample training</small></div>)}</div><div className="demo-plan"><p className="range-eyebrow">Today’s plan · Aarav Sharma</p><h3>Steady hold. Clean release.</h3><p>Warm up, complete four ten-shot sets, then finish with dry practice.</p></div><div className="demo-plan"><p className="range-eyebrow">Your coaching team</p><h3>Coach Dev</h3><p>Good progress with your hold. Keep a consistent rhythm for the final ten shots.</p></div></div>
    return <div className="demo-overview"><div className="demo-stat-grid">{[["Income", "₹3,000"], ["Expenses", "₹500"], ["Tracked funds", "₹5,000"]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>Sample range activity</small></div>)}</div><div className={`demo-overview-roll ${attention ? "demo-attention" : ""}`}><div><Users size={20} aria-hidden="true" /><h3>Today’s student attendance</h3><StatusBadge tone="warning">1 unmarked</StatusBadge></div>{[["Aarav Sharma", "Present"], ["Meera Singh", "Leave"], ["Kabir Rao", "Unmarked"]].map(([name, mark]) => <p key={name}><span>{name}</span><strong>{mark}</strong></p>)}</div><div className="demo-plan"><p className="range-eyebrow">Training & progress</p><h3>One session awaiting review</h3><p>Aarav Sharma · Morning precision practice · 365 / 400</p></div></div>
}
function DemoSession({ reviewed = false, name = "Aarav Sharma" }: { reviewed?: boolean; name?: string }) {
    return <div className="demo-session-preview"><div><p className="range-eyebrow">{name} · Air pistol</p><StatusBadge tone={reviewed ? "success" : "warning"}>{reviewed ? "Reviewed · v1" : "Awaiting review"}</StatusBadge></div><h3>Morning precision practice</h3><p>365 / 400 · 45 minutes · 40 shots</p>{reviewed && <blockquote><strong>Coach Dev</strong><p>Good progress with your hold. Keep the same rhythm for the final ten shots.</p></blockquote>}</div>
}
export function TargetPicture() {
    return <figure className="demo-target-image"><svg viewBox="0 0 240 170" role="img" aria-label="Sample shooting target with five shots near the centre"><rect width="240" height="170" rx="8" fill="#faf8f0" />{[65, 53, 41, 29, 17, 6].map((radius, index) => <circle key={radius} cx="120" cy="85" r={radius} fill={index === 1 ? "#26352e" : "none"} stroke={index > 1 ? "#d9e0d6" : "#405344"} strokeWidth="1" />)}{[[117, 83], [126, 79], [113, 92], [121, 90], [122, 82]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#e6be6c" stroke="#fff" strokeWidth=".7" />)}<text x="120" y="160" textAnchor="middle" fontSize="9" fill="#6b7c62">EXAMPLE TARGET · TUTORIAL ONLY</text></svg><figcaption>demo-target.svg · Sample image</figcaption></figure>
}
function DemoProgress({ raw, rifle, month }: { raw: boolean; rifle: boolean; month: boolean }) {
    const scores = rifle ? [371, 376, 380, 384] : [352, 358, 361, 365]
    return <div className="demo-progress"><div className="demo-stat-grid">{[["Sessions", "4"], ["Training days", "4"], ["Shots recorded", "160"]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><h3>{rifle ? "Air rifle" : "Air pistol"} · {raw ? "Scores out of 400" : "Score percentage"}</h3><svg viewBox="0 0 480 210" role="img" aria-label={`Sample progress: ${scores.join(", ")} out of 400`}><path d="M45 25v150h400" fill="none" stroke="#c9d7c4" />{[0, 1, 2].map(n => <g key={n}><line x1="45" x2="440" y1={45 + n * 55} y2={45 + n * 55} stroke="#e3eadd" /><text x="6" y={49 + n * 55} fontSize="11" fill="#687b5f">{raw ? 400 - n * 40 : `${100 - n * 10}%`}</text></g>)}<polyline points={scores.map((score, i) => `${70 + i * 115},${175 - (score - 280) * 1.1}`).join(" ")} fill="none" stroke="#285443" strokeWidth="3" />{scores.map((score, i) => <g key={i}><circle cx={70 + i * 115} cy={175 - (score - 280) * 1.1} r="5" fill="#a7833d" stroke="#fff" /><text x={70 + i * 115} y={162 - (score - 280) * 1.1} textAnchor="middle" fontSize="12" fill="#285443">{raw ? score : `${(score / 4).toFixed(1)}%`}</text><text x={70 + i * 115} y="199" textAnchor="middle" fontSize="11" fill="#687b5f">Session {i + 1}</text></g>)}</svg><small>Example values · {month ? "This month" : "This week"} · Each score has a maximum of 400.</small></div>
}
function exampleReport(values: Record<string, string>) {
    const report = values.report
    const inPeriod = values.from <= "2026-11-03" && values.to >= "2026-11-03"
    const rows = !inPeriod ? [] : report === "Daily student roll" ? [["Aarav Sharma", "Present", "Coach Dev"], ["Meera Singh", "Leave", "Coach Dev"], ["Kabir Rao", "Unmarked", "—"]] : report === "Salary payments" ? [["Coach Dev", "October salary", "₹10,000"], ["Coach Anaya", "October salary", "₹8,000"]] : [["3 Nov", "Renewal · Aarav", "₹1,000"], ["3 Nov", "Product sales", "₹2,000"], ["3 Nov", "Range expense", "−₹500"]]
    const headers = report === "Daily student roll" ? ["Student", "Status", "Marked by"] : report === "Salary payments" ? ["Coach", "Salary month", "Paid"] : ["Date", "Description", "Amount"]
    const totals = report === "Finance ledger" ? [["Income", inPeriod ? "₹3,000" : "₹0"], ["Expenses", inPeriod ? "₹500" : "₹0"], ["Net income", inPeriod ? "₹2,500" : "₹0"]] : report === "Salary payments" ? [["Paid", inPeriod ? "₹18,000" : "₹0"], ["Records", String(rows.length)]] : [["Present", inPeriod ? "1" : "0"], ["Leave", inPeriod ? "1" : "0"], ["Unmarked", inPeriod ? "1" : "0"]]
    return { rows, headers, totals }
}
function DemoReport({ values }: { report: string; values: Record<string, string> }) {
    const { rows, headers, totals } = exampleReport(values)
    return <div className="demo-report"><p>Applied dates: {values.from} through {values.to} · {rows.length} matching records</p><div className="demo-stat-grid">{totals.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><table><thead><tr>{headers.map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((value, i) => <td key={i}>{value}</td>)}</tr>)}</tbody></table>{!rows.length && <p>No sample records in this date range.</p>}</div>
}

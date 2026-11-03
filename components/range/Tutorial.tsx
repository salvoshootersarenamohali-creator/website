"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, CirclePlay, MousePointer2, RotateCcw, Search, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { RangeActor } from "@/lib/range/shared"
import { readTutorialProgress, searchTutorialLessons, tutorialGuides, type TutorialProgress, type TutorialRole } from "@/lib/range/tutorials"
import { getWalkthrough } from "@/lib/range/tutorial-walkthroughs"
import { EmptyState } from "./shared"
import { VisualWalkthrough } from "./tutorial/VisualWalkthrough"

export function Tutorial({ user, navigate }: { user: RangeActor; navigate: (section: string) => void }) {
    if (user.role !== "student" && user.role !== "coach" && user.role !== "owner" && user.role !== "finance") return null
    return <RoleTutorial key={`${user.id}-${user.role}`} user={user} role={user.role} navigate={navigate} />
}

function RoleTutorial({ user, role, navigate }: { user: RangeActor; role: TutorialRole; navigate: (section: string) => void }) {
    const guide = tutorialGuides[role]
    const storageKey = `salvo:tutorial:v2:${role}:${user.id}`
    const [progress, setProgress] = useState<TutorialProgress>({ lessonId: guide.lessons[0].id, completed: [] })
    const [ready, setReady] = useState(false), [storageError, setStorageError] = useState(false), [query, setQuery] = useState(""), [tourId, setTourId] = useState<string>()
    const lessonHeading = useRef<HTMLHeadingElement>(null), launchButton = useRef<HTMLButtonElement>(null)
    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (!active) return
            let restored: TutorialProgress = { lessonId: guide.lessons[0].id, completed: [] }
            try { restored = readTutorialProgress(window.localStorage.getItem(storageKey), guide.lessons); setProgress(restored) }
            catch { setStorageError(true) }
            setReady(true); setTourId(restored.lessonId)
        })
        return () => { active = false }
    }, [storageKey, guide])

    const visible = searchTutorialLessons(guide.lessons, query)
    const lesson = visible.find(item => item.id === progress.lessonId) || visible[0]
    const index = guide.lessons.findIndex(item => item.id === lesson?.id)
    const completed = progress.completed.length, allDone = completed === guide.lessons.length
    const done = lesson ? progress.completed.includes(lesson.id) : false
    const activeTour = guide.lessons.find(item => item.id === tourId)
    const nextTour = activeTour ? guide.lessons[guide.lessons.indexOf(activeTour) + 1] : undefined

    function save(next: TutorialProgress) {
        setProgress(next)
        try { window.localStorage.setItem(storageKey, JSON.stringify(next)); setStorageError(false) }
        catch { setStorageError(true) }
    }
    function select(id: string) {
        save({ ...progress, lessonId: id })
        requestAnimationFrame(() => { lessonHeading.current?.focus(); lessonHeading.current?.scrollIntoView({ behavior: "smooth", block: "start" }) })
    }
    function launch(id: string) { save({ ...progress, lessonId: id }); setTourId(id) }
    function exit() { setTourId(undefined); requestAnimationFrame(() => launchButton.current?.focus()) }

    return <div className="range-tutorial">
        <section className="tutorial-welcome" aria-labelledby="tutorial-guide-title">
            <div className="tutorial-welcome-copy"><span className="tutorial-book"><MousePointer2 size={25} aria-hidden="true" /></span><div><p className="range-eyebrow">Interactive walkthroughs · {role}</p><h2 id="tutorial-guide-title">{guide.title}</h2><p>See where to click. Try it with sample data. Learn at your own pace.</p></div></div>
            <div className="tutorial-progress"><p id="tutorial-progress-label"><strong>{completed} of {guide.lessons.length}</strong> walkthroughs completed</p><progress value={completed} max={guide.lessons.length} aria-labelledby="tutorial-progress-label" /><small>{storageError ? "Progress cannot be saved in this browser." : "Only your tutorial progress is saved in this browser."}</small></div>
        </section>
        <div className="tutorial-demo-notice"><ShieldCheck size={19} aria-hidden="true" /><div><strong>A practice workspace, just for the tutorial.</strong><p>Sample people and records appear only here. Exit any time to return to your account.</p></div></div>
        {user.mustChangePassword && <div className="tutorial-notice" role="note"><BookOpen size={19} aria-hidden="true" /><p>You can practise every walkthrough now. Your real records stay locked until you change your temporary password in Account security.</p></div>}
        {allDone && <div className="tutorial-success" role="status"><CheckCircle2 size={21} aria-hidden="true" /><div><strong>You’ve completed your guide.</strong><p>Replay any walkthrough whenever you need a reminder.</p></div></div>}
        <div className="tutorial-layout">
            <aside className="tutorial-contents" aria-label="Tutorial walkthroughs">
                <label className="tutorial-search"><span className="sr-only">Search tutorial lessons</span><Search size={17} aria-hidden="true" /><input className="field" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a task or topic…" /></label>
                <p className="tutorial-list-label">{query.trim() ? `${visible.length} matching walkthrough${visible.length === 1 ? "" : "s"}` : `${guide.lessons.length} walkthroughs · Learn by doing`}</p>
                <nav aria-label="Lesson contents">{[...new Set(visible.map(item => item.group))].map(group => <div className="tutorial-group" key={group}><p>{group}</p>{visible.filter(item => item.group === group).map(item => {
                    const finished = progress.completed.includes(item.id)
                    return <button type="button" key={item.id} disabled={!ready} aria-current={item.id === lesson?.id ? "step" : undefined} onClick={() => select(item.id)}><span className={finished ? "tutorial-lesson-done" : "tutorial-lesson-number"}>{finished ? <Check size={15} aria-hidden="true" /> : String(guide.lessons.indexOf(item) + 1).padStart(2, "0")}</span><span>{item.title}{finished && <span className="sr-only"> (completed)</span>}</span></button>
                })}</div>)}</nav>
                {!!query && <Button variant="ghost" onClick={() => setQuery("")}>Clear search</Button>}
                <Button variant="ghost" className="tutorial-restart" disabled={!ready || !completed} onClick={() => { setQuery(""); save({ lessonId: guide.lessons[0].id, completed: [] }) }}><RotateCcw size={14} aria-hidden="true" />Reset tutorial progress</Button>
            </aside>
            {lesson ? <article className="tutorial-lesson tutorial-visual-lesson" aria-labelledby="tutorial-lesson-title">
                <div className="tutorial-lesson-header"><p className="range-eyebrow">Walkthrough {String(index + 1).padStart(2, "0")} / {guide.lessons.length} · {lesson.group}</p><h2 id="tutorial-lesson-title" tabIndex={-1} ref={lessonHeading}>{lesson.title}</h2><p>{lesson.summary}</p></div>
                <div className="tutorial-scene-preview" aria-hidden="true"><div className="tutorial-preview-sidebar"><CrosshairMark /><i /><i /><i /><i className="is-active" /><i /></div><div className="tutorial-preview-workspace"><span>Sample workspace</span><strong>{getWalkthrough(lesson.id, role).screen}</strong><div className="tutorial-preview-cards"><i /><i /><i /></div><div className="tutorial-preview-form"><i /><i /><i /><span><MousePointer2 size={19} />Try it here</span></div></div><div className="tutorial-preview-tooltip"><span>1</span><strong>Follow the highlight</strong><small>Click, practise, and see the result.</small></div></div>
                <div className="tutorial-launch"><div><span><Sparkles size={15} aria-hidden="true" />{getWalkthrough(lesson.id, role).steps.length} guided steps</span><p>{done ? "You’ve completed this walkthrough. Replay it with a fresh demo session." : "A guide highlights each action while you practise with example records."}</p></div><Button ref={launchButton} disabled={!ready} onClick={() => launch(lesson.id)}><CirclePlay size={18} aria-hidden="true" />{done ? "Replay visual walkthrough" : "Start visual walkthrough"}</Button></div>
                <details className="tutorial-written-reference"><summary><BookOpen size={16} aria-hidden="true" />Read the instructions</summary><ol className="tutorial-steps">{lesson.steps.map((step, stepIndex) => <li key={step.title}><span className="tutorial-step-number" aria-hidden="true">{stepIndex + 1}</span><div><h3>{step.title}</h3><p>{step.detail}</p></div></li>)}</ol><p className="tutorial-tip">{lesson.tip}</p></details>
                <div className="tutorial-pagination"><Button variant="ghost" disabled={!ready || index === 0} onClick={() => { setQuery(""); select(guide.lessons[index - 1].id) }}><ArrowLeft size={16} aria-hidden="true" />Previous</Button><span>{index + 1} / {guide.lessons.length}</span><Button variant="outline" disabled={!ready || index === guide.lessons.length - 1} onClick={() => { setQuery(""); select(guide.lessons[index + 1].id) }}>Next<ArrowRight size={16} aria-hidden="true" /></Button></div>
            </article> : <EmptyState title="No walkthroughs match your search" description="Try training, attendance, payment, or another task." action={<Button variant="outline" onClick={() => setQuery("")}>Show all walkthroughs</Button>} />}
        </div>
        <div><Button variant="ghost" onClick={() => navigate(user.mustChangePassword ? role === "student" ? "security" : "password" : role === "student" ? "overview" : "home")}><ArrowLeft size={15} aria-hidden="true" />Back to my workspace</Button></div>
        {activeTour && <VisualWalkthrough key={activeTour.id} lesson={activeTour} role={role} onExit={exit} onLeave={() => { setTourId(undefined); navigate(user.mustChangePassword ? role === "student" ? "security" : "password" : role === "student" ? "overview" : "home") }} onComplete={() => save({ lessonId: activeTour.id, completed: [...new Set([...progress.completed, activeTour.id])] })} onNext={nextTour ? () => launch(nextTour.id) : undefined} />}
    </div>
}
function CrosshairMark() { return <span className="tutorial-preview-brand">S</span> }

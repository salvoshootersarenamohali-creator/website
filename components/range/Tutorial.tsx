"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Circle, Lightbulb, RotateCcw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { RangeActor } from "@/lib/range/shared"
import { readTutorialProgress, searchTutorialLessons, tutorialGuides, type TutorialProgress, type TutorialRole } from "@/lib/range/tutorials"
import { EmptyState } from "./shared"

export function Tutorial({ user, navigate }: { user: RangeActor; navigate: (section: string) => void }) {
    if (user.role !== "student" && user.role !== "coach" && user.role !== "owner") return null
    return <RoleTutorial key={`${user.id}-${user.role}`} user={user} role={user.role} navigate={navigate} />
}

function RoleTutorial({ user, role, navigate }: { user: RangeActor; role: TutorialRole; navigate: (section: string) => void }) {
    const guide = tutorialGuides[role]
    const storageKey = `salvo:tutorial:v1:${role}:${user.id}`
    const [progress, setProgress] = useState<TutorialProgress>({ lessonId: guide.lessons[0].id, completed: [] })
    const [ready, setReady] = useState(false), [storageError, setStorageError] = useState(false), [query, setQuery] = useState("")
    const lessonHeading = useRef<HTMLHeadingElement>(null)
    useEffect(() => {
        let active = true
        void Promise.resolve().then(() => {
            if (!active) return
            try { setProgress(readTutorialProgress(window.localStorage.getItem(storageKey), guide.lessons)) }
            catch { setStorageError(true) }
            setReady(true)
        })
        return () => { active = false }
    }, [storageKey, guide])

    const visible = searchTutorialLessons(guide.lessons, query)
    const lesson = visible.find(item => item.id === progress.lessonId) || visible[0]
    const index = guide.lessons.findIndex(item => item.id === lesson?.id)
    const completed = progress.completed.length, allDone = completed === guide.lessons.length
    const done = lesson ? progress.completed.includes(lesson.id) : false
    const locked = user.mustChangePassword && lesson && !["password", "security"].includes(lesson.destination)

    function save(next: TutorialProgress) {
        setProgress(next)
        try { window.localStorage.setItem(storageKey, JSON.stringify(next)); setStorageError(false) }
        catch { setStorageError(true) }
    }
    function select(id: string, clearSearch = false) {
        if (clearSearch) setQuery("")
        save({ ...progress, lessonId: id })
        requestAnimationFrame(() => { lessonHeading.current?.focus(); lessonHeading.current?.scrollIntoView({ behavior: "smooth", block: "start" }) })
    }
    function complete() {
        if (!lesson) return
        const nextCompleted = done ? progress.completed.filter(id => id !== lesson.id) : [...progress.completed, lesson.id]
        save({ lessonId: lesson.id, completed: nextCompleted })
    }

    return <div className="range-tutorial">
        <section className="tutorial-welcome" aria-labelledby="tutorial-guide-title">
            <div className="tutorial-welcome-copy"><span className="tutorial-book"><BookOpen size={25} aria-hidden="true" /></span><div><p className="range-eyebrow">Learn your workspace · {role}</p><h2 id="tutorial-guide-title">{guide.title}</h2><p>{guide.introduction}</p></div></div>
            <div className="tutorial-progress"><p id="tutorial-progress-label"><strong>{completed} of {guide.lessons.length}</strong> lessons completed</p><progress value={completed} max={guide.lessons.length} aria-labelledby="tutorial-progress-label" /><small>{storageError ? "Progress is available for this visit. Browser storage is unavailable." : "Progress is saved for this account in this browser."}</small></div>
        </section>
        {user.mustChangePassword && <div className="tutorial-notice" role="note"><BookOpen size={19} aria-hidden="true" /><p>You can read every lesson now. Change your temporary password in Account security before opening your records.</p></div>}
        {allDone && <div className="tutorial-success" role="status"><CheckCircle2 size={21} aria-hidden="true" /><div><strong>You’ve completed your guide.</strong><p>Come back whenever you need a reminder. Every lesson stays available.</p></div></div>}
        <div className="tutorial-layout">
            <aside className="tutorial-contents" aria-label="Tutorial lessons">
                <label className="tutorial-search"><span className="sr-only">Search tutorial lessons</span><Search size={17} aria-hidden="true" /><input className="field" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a task or topic…" /></label>
                <p className="tutorial-list-label">{query.trim() ? `${visible.length} matching lesson${visible.length === 1 ? "" : "s"}` : `${guide.lessons.length} lessons · Go at your own pace`}</p>
                <nav aria-label="Lesson contents">{[...new Set(visible.map(item => item.group))].map(group => <div className="tutorial-group" key={group}><p>{group}</p>{visible.filter(item => item.group === group).map(item => {
                    const finished = progress.completed.includes(item.id)
                    return <button type="button" key={item.id} disabled={!ready} aria-current={item.id === lesson?.id ? "step" : undefined} onClick={() => select(item.id)}><span className={finished ? "tutorial-lesson-done" : "tutorial-lesson-number"}>{finished ? <Check size={15} aria-hidden="true" /> : String(guide.lessons.indexOf(item) + 1).padStart(2, "0")}</span><span>{item.title}{finished && <span className="sr-only"> (completed)</span>}</span></button>
                })}</div>)}</nav>
                {!!query && <Button variant="ghost" onClick={() => setQuery("")}>Clear search</Button>}
                <Button variant="ghost" className="tutorial-restart" disabled={!ready || !completed} onClick={() => { setQuery(""); save({ lessonId: guide.lessons[0].id, completed: [] }) }}><RotateCcw size={14} aria-hidden="true" />Reset tutorial progress</Button>
            </aside>
            {lesson ? <article className="tutorial-lesson" aria-labelledby="tutorial-lesson-title">
                <div className="tutorial-lesson-header"><p className="range-eyebrow">Lesson {String(index + 1).padStart(2, "0")} / {guide.lessons.length} · {lesson.group}</p><h2 id="tutorial-lesson-title" tabIndex={-1} ref={lessonHeading}>{lesson.title}</h2><p>{lesson.summary}</p></div>
                <ol className="tutorial-steps">{lesson.steps.map((step, stepIndex) => <li key={step.title}><span className="tutorial-step-number" aria-hidden="true">{stepIndex + 1}</span><div><h3>{step.title}</h3><p>{step.detail}</p></div></li>)}</ol>
                <aside className="tutorial-tip"><Lightbulb size={20} aria-hidden="true" /><div><strong>Good to know</strong><p>{lesson.tip}</p></div></aside>
                <div className="tutorial-practice"><div><strong>Ready to try it?</strong><p>{locked ? "Set your personal password first to unlock this screen." : "Open the screen, then return through Tutorial in the menu."}</p></div><Button variant="outline" onClick={() => navigate(locked ? role === "student" ? "security" : "password" : lesson.destination)}>{locked ? "Open Account security" : lesson.action}<ArrowRight size={16} aria-hidden="true" /></Button></div>
                <div className="tutorial-completion"><Button variant={done ? "outline" : "default"} disabled={!ready} aria-pressed={done} onClick={complete}>{done ? <CheckCircle2 size={17} aria-hidden="true" /> : <Circle size={17} aria-hidden="true" />}{done ? "Lesson completed" : "Mark lesson complete"}</Button><span role="status" className="range-muted">{done ? "You can revisit this lesson any time." : "Mark complete when you feel comfortable with these steps."}</span></div>
                <nav className="tutorial-pagination" aria-label="Lesson navigation"><Button variant="ghost" disabled={!ready || index === 0} onClick={() => select(guide.lessons[index - 1].id, true)}><ArrowLeft size={16} aria-hidden="true" />Previous lesson</Button><span>{index + 1} / {guide.lessons.length}</span>{index < guide.lessons.length - 1 ? <Button variant="outline" disabled={!ready} onClick={() => select(guide.lessons[index + 1].id, true)}>Next lesson<ArrowRight size={16} aria-hidden="true" /></Button> : <Button variant="outline" disabled={!ready} onClick={() => select(guide.lessons.find(item => !progress.completed.includes(item.id))?.id || guide.lessons[0].id, true)}>{allDone ? "Back to first lesson" : "Review remaining lessons"}<ArrowRight size={16} aria-hidden="true" /></Button>}</nav>
            </article> : <EmptyState title="No lessons match your search" description="Try a task such as password, training, attendance, or payment." action={<Button variant="outline" onClick={() => setQuery("")}>Show all lessons</Button>} />}
        </div>
    </div>
}

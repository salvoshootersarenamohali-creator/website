"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Crosshair, LogOut } from "lucide-react"
import { RangeActor, rangeDay } from "@/lib/range/shared"
import { TrainingPlan, TrainingStudent } from "@/lib/range/training-types"
import { Button } from "@/components/ui/button"
import { EmptyState, LoadingState, Panel, rangeApi } from "./shared"
import { PasswordForm } from "./AccountSecurity"
import { Diary } from "./training/Diary"
import { PlanContent, PlanList } from "./training/Plans"
import { TrainingProgress } from "./training/Progress"
import { TrainingError, useTrainingData } from "./training/shared"

const sections = [{ key: "overview", label: "Overview" }, { key: "plans", label: "Training Plans" }, { key: "diary", label: "Diary & History" }, { key: "progress", label: "Progress" }, { key: "security", label: "Account Security" }]
export function StudentPortal() {
    const router = useRouter()
    const session = useTrainingData<{ user: RangeActor }>("session")
    const [tab, setTab] = useState("overview"), [error, setError] = useState(""), [signingOut, setSigningOut] = useState(false)
    const user = session.data?.user
    useEffect(() => {
        if (user && user.role !== "student") window.location.replace("/range")
    }, [user])
    useEffect(() => {
        const sync = () => { const hash = window.location.hash.slice(1); setTab(sections.some(section => section.key === hash) ? hash : "overview") }
        sync(); window.addEventListener("hashchange", sync)
        return () => window.removeEventListener("hashchange", sync)
    }, [])
    if (!user || user.role !== "student") return <div className="range-start"><TrainingError error={session.error} retry={session.reload} />{!session.error && <LoadingState label="Opening your training portal…" />}</div>
    const active = user.mustChangePassword ? "security" : tab
    const navigate = (next: string) => { setTab(next); window.location.hash = next }
    return <div className="training-student-shell"><header className="training-student-header"><Link className="range-brand" href="/"><Crosshair size={30} aria-hidden="true" /><span>SALVO<small>Student training portal</small></span></Link><div className="training-student-account"><span>{user.name}</span><Button variant="outline" disabled={signingOut} onClick={async () => { setSigningOut(true); try { await rangeApi("logout", {}); router.push("/range/login") } catch (error) { setError(error instanceof Error ? error.message : "Unable to sign out."); setSigningOut(false) } }}><LogOut size={15} />Sign out</Button></div></header><nav className="training-student-nav" aria-label="Student portal">{sections.filter(section => !user.mustChangePassword || section.key === "security").map(section => <a key={section.key} href={`#${section.key}`} aria-current={active === section.key ? "page" : undefined} onClick={() => setTab(section.key)}>{section.label}</a>)}</nav><div className="training-student-main"><div className="range-page-heading"><div><p className="range-eyebrow">Your training, one session at a time</p><h1>{user.mustChangePassword ? "Let’s secure your account" : active === "overview" ? `Welcome back, ${user.name.split(" ")[0]}.` : sections.find(section => section.key === active)?.label}</h1><p>{user.mustChangePassword ? "Set your personal password before opening your training records." : "Your plans, practice, and progress. Together in one place."}</p></div><span className="range-role-pill">Student access</span></div><TrainingError error={error} />{active === "security" ? <Panel title="Account security" className="range-narrow" description="Use a unique password of at least 12 characters. Ask the owner if you need a reset."><PasswordForm onDone={session.reload} /></Panel> : <>{active === "overview" && <StudentOverview user={user} navigate={navigate} />}{active === "plans" && <PlanList profileId={user.shooterProfileId!} />}{active === "diary" && <Diary user={user} profileId={user.shooterProfileId!} />}{active === "progress" && <TrainingProgress profileId={user.shooterProfileId!} />}</>}<footer className="range-workspace-footer"><span>Salvo Shooters Arena</span><span>Training dates use India Standard Time</span></footer></div></div>
}
function StudentOverview({ user, navigate }: { user: RangeActor; navigate: (section: string) => void }) {
    const today = rangeDay(), plans = useTrainingData<{ plans: TrainingPlan[] }>(`training/plans?from=${today}&to=${today}`), roster = useTrainingData<{ students: TrainingStudent[] }>("training/roster")
    return <div className="space-y-5"><div className="training-overview-hero"><div><p className="range-eyebrow">Make today count</p><h2>A little progress.<br />Every single session.</h2><p>Follow your plan, record what you learned, and build on your coach’s feedback.</p></div><Button onClick={() => navigate("diary")}>Open my training diary</Button></div><div className="training-columns"><Panel title={`Today’s plan · ${today}`}><TrainingError error={plans.error} retry={plans.reload} />{plans.loading ? <LoadingState /> : plans.data?.plans[0] ? <PlanContent plan={plans.data.plans[0]} /> : !plans.error && <EmptyState title="No plan assigned for today" description="You can still record a session in your diary." />}</Panel><Panel title="Your coaching team" description="Your assigned coaches can review your sessions and help shape your next steps."><TrainingError error={roster.error} retry={roster.reload} />{roster.loading ? <LoadingState /> : <div className="space-y-3">{roster.data?.students[0]?.trainingCoaches.filter(link => link.coach.active).map(link => <div className="training-coach" key={link.coachId}><span className="range-student-avatar">{link.coach.name.split(/\s+/).map(word => word[0]).slice(0, 2).join("")}</span><strong>{link.coach.name}</strong></div>)}{!roster.data?.students[0]?.trainingCoaches.some(link => link.coach.active) && <p className="range-muted">Your coaching team will appear here once assigned.</p>}</div>}</Panel></div><TrainingProgress profileId={user.shooterProfileId!} compact /></div>
}

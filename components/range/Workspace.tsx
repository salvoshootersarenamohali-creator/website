"use client"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRightLeft, BarChart3, CalendarDays, ChevronRight, ClipboardCheck, Crosshair, LayoutDashboard, LockKeyhole, LogOut, MapPin, Menu, ReceiptText, Settings2, ShieldCheck, Users, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { RangeActor, LocationOption } from "@/lib/range/shared"
import { ActionForm, EmptyState, Field, LoadingState, Panel, rangeApi } from "./shared"
import { Attendance } from "./Attendance"
import { Students } from "./Students"
import { Finance } from "./Finance"
import { Fees } from "./Fees"
import { Transfers } from "./Transfers"
import { Salaries } from "./Salaries"
import { Dashboard } from "./Dashboard"
import { Reports } from "./Reports"
import { Training } from "./Training"
import { PasswordForm } from "./AccountSecurity"

const sections = [
    { key: "training", label: "Training & progress", icon: Crosshair, group: "Workspace", description: "Plan training, review diaries, and follow your students’ progress." },
    { key: "home", label: "Overview", icon: LayoutDashboard, group: "Workspace", description: "Your range at a glance, with the next steps that matter." },
    { key: "attendance", label: "Coach attendance", coachLabel: "My attendance", icon: ClipboardCheck, group: "Workspace", description: "Review coach shifts, completed hours, and attendance requests.", coachDescription: "Check in, check out, and keep track of your shifts." },
    { key: "students", label: "Students & attendance", icon: Users, group: "Workspace", description: "Your student roster and daily attendance, in one place." },
    { key: "fees", label: "Admissions & fees", icon: ReceiptText, group: "Money", description: "Record student payments and see the dates they cover." },
    { key: "finance", label: "Income & expenses", icon: Wallet, group: "Money", description: "See your balances, record payments, and keep the books clear." },
    { key: "transfers", label: "Money handovers", icon: ArrowRightLeft, group: "Money", description: "Track money handed between accounts and review its status." },
    { key: "salaries", label: "Salary payments", icon: CalendarDays, group: "Money", owner: true, description: "Record salary payments and review each coach’s payment history." },
    { key: "reports", label: "Reports & history", icon: BarChart3, group: "Management", owner: true, description: "Find the records you need and download them to Excel." },
    { key: "staff", label: "Staff & locations", icon: Settings2, group: "Management", owner: true, description: "Manage your team, their location access, and your ranges." },
    { key: "password", label: "Account security", icon: LockKeyhole, group: "Account", description: "Keep your workspace account secure with a personal password." },
]
type Staff = RangeActor & { active: boolean; memberships: { locationId: string }[] }
export function Workspace() {
    const [user, setUser] = useState<RangeActor>(), [locations, setLocations] = useState<LocationOption[]>([]), [locationId, setLocationId] = useState(""), [error, setError] = useState(""), [tab, setTab] = useState("home"), [menuOpen, setMenuOpen] = useState(false), [signingOut, setSigningOut] = useState(false)
    const heading = useRef<HTMLHeadingElement>(null), focusContentAfterMenu = useRef(false)
    const load = useCallback(async () => { try { const data = await rangeApi<{ user: RangeActor; locations: LocationOption[] }>("session"); if (data.user.role === "student") { window.location.replace("/range/student"); return }; setUser(data.user); setLocations(data.locations); setError(""); setLocationId(current => data.locations.some(l => l.id === current) ? current : data.locations[0]?.id || "") } catch (e) { setError(e instanceof Error ? e.message : "Unable to load workspace.") } }, [])
    useEffect(() => { void Promise.resolve().then(load) }, [load])
    useEffect(() => {
        const sync = () => { const next = window.location.hash.slice(1); if (next === "workspace-content") return; setTab(sections.some(s => s.key === next && (!s.owner || user?.role === "owner")) ? next : "home") }
        sync(); window.addEventListener("hashchange", sync); window.addEventListener("popstate", sync)
        return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync) }
    }, [user?.role])
    function navigate(next: string, location?: string) {
        if (location) setLocationId(location)
        focusContentAfterMenu.current = menuOpen
        setTab(next); setMenuOpen(false); if (window.location.hash !== `#${next}`) window.history.pushState(null, "", `#${next}`)
        requestAnimationFrame(() => { heading.current?.focus(); window.scrollTo({ top: 0, behavior: "smooth" }) })
    }
    async function signOut() { setSigningOut(true); try { await rangeApi("logout", {}); window.location.assign("/range/login") } catch (e) { setError(e instanceof Error ? e.message : "Unable to sign out."); setSigningOut(false) } }
    if (!user) return <div className="range-start"><div className="range-brand"><Crosshair size={30} /><span>SALVO<small>Range workspace</small></span></div>{error ? <EmptyState title="We couldn’t open your workspace" description={error} action={<Button onClick={load}>Try again</Button>} /> : <LoadingState />}</div>
    const owner = user.role === "owner", current = sections.find(s => s.key === (user.mustChangePassword ? "password" : tab)) || sections[0], label = !owner && current.coachLabel ? current.coachLabel : current.label
    const date = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" }).format(new Date())
    const sidebar = <>
        <Link href="/range" className="range-brand"><Crosshair size={29} strokeWidth={1.6} aria-hidden="true" /><span>SALVO<small>Range workspace</small></span></Link>
        <nav aria-label="Range workspace" className="range-nav">{["Workspace", "Money", "Management", "Account"].map(group => {
            const items = sections.filter(s => s.group === group && (!s.owner || owner) && (!user.mustChangePassword || s.key === "password"))
            return items.length > 0 && <div key={group} className="range-nav-group"><p>{group}</p>{items.map(item => <a key={item.key} href={`#${item.key}`} aria-current={tab === item.key ? "page" : undefined} onClick={event => { event.preventDefault(); navigate(item.key) }}><item.icon size={18} strokeWidth={1.7} aria-hidden="true" /><span>{!owner && item.coachLabel ? item.coachLabel : item.label}</span>{tab === item.key && <span className="range-nav-dot" />}</a>)}</div>
        })}</nav>
        <div className="range-sidebar-bottom"><div className="range-user"><span className="range-avatar">{user.name.split(/\s+/).map(n => n[0]).slice(0, 2).join("")}</span><div><strong>{user.name}</strong><small>{owner ? "Owner" : "Coach"} workspace</small></div><ShieldCheck size={17} aria-hidden="true" /></div><button className="range-signout" disabled={signingOut} onClick={signOut}><LogOut size={17} aria-hidden="true" />{signingOut ? "Signing out…" : "Sign out"}</button><Link href="/" className="range-site-link"><ArrowLeft size={14} aria-hidden="true" />Back to Salvo website</Link></div>
    </>
    return <div className="range-shell"><a className="range-skip" href="#workspace-content">Skip to content</a><aside className="range-sidebar">{sidebar}</aside><div className="range-main">
        <header className="range-topbar"><div className="flex min-w-0 items-center gap-3"><Sheet open={menuOpen} onOpenChange={setMenuOpen}><SheetTrigger asChild><Button variant="outline" size="icon" className="range-menu-button" aria-label="Open workspace navigation"><Menu size={20} /></Button></SheetTrigger><SheetContent side="left" className="range-app range-mobile-sheet" onCloseAutoFocus={event => { if (focusContentAfterMenu.current) { event.preventDefault(); focusContentAfterMenu.current = false; heading.current?.focus() } }}><SheetTitle className="sr-only">Workspace navigation</SheetTitle><SheetDescription className="sr-only">Navigate your Salvo range workspace.</SheetDescription>{sidebar}</SheetContent></Sheet><span className="range-breadcrumb">Workspace <ChevronRight size={14} aria-hidden="true" /><strong>{label}</strong></span></div><div className="range-topbar-tools"><span className="range-date"><CalendarDays size={15} aria-hidden="true" />{date}<span>IST</span></span><label className="range-location"><MapPin size={16} aria-hidden="true" /><span className="sr-only">Location</span><select aria-label="Location" value={locationId} onChange={e => setLocationId(e.target.value)} disabled={!locations.length}>{!locations.length && <option value="">No location</option>}{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label></div></header>
        <div id="workspace-content" className="range-content"><div className="range-page-heading"><div><p className="range-eyebrow">{owner ? "Owner workspace" : "Coach workspace"}</p><h1 ref={heading} tabIndex={-1}>{user.mustChangePassword ? "Let’s secure your account" : tab === "home" ? `Welcome back, ${user.name.split(" ")[0]}.` : label}</h1><p>{user.mustChangePassword ? "Choose your own password to get started." : !owner && current.coachDescription ? current.coachDescription : current.description}</p></div><span className="range-role-pill"><ShieldCheck size={15} aria-hidden="true" />{owner ? "Owner access" : "Coach access"}</span></div>
        {error && <p className="range-feedback range-feedback-error" role="alert">{error}</p>}
        {user.mustChangePassword ? <Panel title="Set your own password" className="range-narrow"><PasswordForm onDone={load} /></Panel> : <>
            {!locationId && !["staff", "password", "training"].includes(tab) && <EmptyState title="No locations assigned yet" description={owner ? "Add a location in Staff & locations to set up your workspace." : "Ask the owner to assign you a location to get started."} action={owner ? <Button onClick={() => navigate("staff")}>Set up a location</Button> : undefined} />}
            {tab === "training" && <Training user={user} />}
            {tab === "home" && locationId && <Dashboard key={locationId} user={user} locationId={locationId} navigate={navigate} />}
            {tab === "staff" && owner && <StaffSettings locations={locations} reload={load} />}
            {tab === "attendance" && locationId && <Attendance key={locationId} user={user} locationId={locationId} />}
            {tab === "students" && locationId && <Students key={locationId} user={user} locationId={locationId} />}
            {tab === "finance" && locationId && <Finance key={locationId} user={user} locationId={locationId} />}
            {tab === "fees" && locationId && <Fees key={locationId} user={user} locationId={locationId} />}
            {tab === "transfers" && locationId && <Transfers key={locationId} user={user} locationId={locationId} />}
            {tab === "salaries" && owner && locationId && <Salaries key={locationId} locationId={locationId} />}
            {tab === "reports" && owner && locationId && <Reports key={locationId} locationId={locationId} />}
            {tab === "password" && <Panel title="Change password" className="range-narrow" description="Use at least 12 characters. A longer, unique passphrase works well."><PasswordForm onDone={load} /></Panel>}
        </>}
        <div className="range-workspace-footer"><span><Crosshair size={13} aria-hidden="true" />Salvo Shooters Arena</span><span>Range dates & times use India Standard Time</span></div></div>
    </div></div>
}
function StaffSettings({ locations, reload }: { locations: LocationOption[]; reload: () => Promise<void> }) {
    const [staff, setStaff] = useState<Staff[]>([]), [editing, setEditing] = useState<Staff>(), [creating, setCreating] = useState(false), [error, setError] = useState(""), [loading, setLoading] = useState(true)
    const load = useCallback(async () => { setLoading(true); try { setStaff((await rangeApi<{ staff: Staff[] }>("staff")).staff); setError("") } catch (e) { setError(e instanceof Error ? e.message : "Unable to load staff.") } finally { setLoading(false) } }, [])
    useEffect(() => { void Promise.resolve().then(load) }, [load])
    return <div className="space-y-5">{error && <p role="alert">{error}</p>}<div className="range-section-toolbar"><p className="range-muted text-sm">{staff.filter(s => s.active).length} active team members · {locations.length} locations</p><Button onClick={() => { setCreating(true); setEditing(undefined) }}><Users size={16} aria-hidden="true" />Add coach</Button></div>
        {(creating || editing) && <>
<Panel expanded title={editing ? `Edit ${editing.name}` : "Add a coach"} description="Create a staff account and assign its locations."><ActionForm submit={editing ? "Save coach changes" : "Create coach account"} key={editing?.id || "new"} onSubmit={async form => { const data = new FormData(form); await rangeApi("staff", { id: editing?.id, name: data.get("name"), phone: data.get("phone"), password: data.get("password"), active: data.get("active") === "on", locationIds: data.getAll("locations") }); setEditing(undefined); setCreating(false); form.reset(); await load() }}><Field label="Name"><input className="field" name="name" required maxLength={100} defaultValue={editing?.name} /></Field><Field label="Phone"><input className="field" name="phone" type="tel" autoComplete="off" required defaultValue={editing?.phone ?? ""} /></Field><Field label={editing ? "Reset temporary password (leave blank to keep)" : "Temporary password (12+ characters)"}><input className="field" name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required={!editing} /></Field><label><input type="checkbox" name="active" defaultChecked={editing?.active ?? true} /> Active account</label><fieldset><legend className="mb-2">Assigned locations</legend>{locations.map(l => <label key={l.id} className="mb-2 block"><input type="checkbox" name="locations" value={l.id} defaultChecked={editing ? editing.memberships.some(m => m.locationId === l.id) : locations.length === 1} /> {l.name}</label>)}</fieldset></ActionForm><Button className="mt-3" variant="outline" onClick={() => { setEditing(undefined); setCreating(false) }}>Cancel</Button></Panel>        </>}
        <div className="grid items-start gap-5 xl:grid-cols-[1.6fr_1fr]"><Panel title="Your team" description="Staff accounts and their assigned locations.">{loading ? <LoadingState label="Loading your team…" /> : staff.length ? <ul>{staff.map(s => <li className="range-staff-row" key={s.id}><span className="range-student-avatar">{s.name.split(/\s+/).map(n => n[0]).slice(0, 2).join("")}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm font-medium">{s.name}</strong><span className="range-badge range-badge-neutral">{s.role}</span></div><p className="range-muted mt-1 text-xs">{s.username || s.phone}</p><p className="range-muted mt-1 text-xs">{s.role === "owner" ? "All locations" : locations.filter(l => s.memberships.some(m => m.locationId === l.id)).map(l => l.name).join(", ") || "No locations assigned"}</p>{s.mustChangePassword && <p className="mt-1 text-xs text-amber-700">Password change required at next sign-in</p>}</div><div className="flex flex-col items-end gap-2"><span className={`range-badge ${s.active ? "range-badge-success" : "range-badge-neutral"}`}>{s.active ? "Active" : "Inactive"}</span>{s.role === "coach" && <Button variant="outline" size="sm" onClick={() => setEditing(s)}>Manage</Button>}</div></li>)}</ul> : <EmptyState title="No staff accounts found" description="Add a coach to invite your team into this workspace." />}</Panel><div className="space-y-5"><Panel title="Your locations" description="Ranges available in this workspace."><div className="space-y-3">{locations.map(l => <div key={l.id} className="flex items-center gap-3 rounded-lg border border-[#e3e9dd] p-3"><MapPin size={18} className="text-[#80996d]" aria-hidden="true" /><div><p className="text-sm font-medium">{l.name}</p><p className="range-muted text-xs">India Standard Time</p></div></div>)}{!locations.length && <EmptyState title="Add your first location" description="Use the form below, then assign coaches to it." />}</div></Panel>
<Panel collapsible title="Add a location" description="Set up another range for your team."><ActionForm submit="Add location" onSubmit={async form => { const data = new FormData(form); await rangeApi("locations", { name: data.get("name"), slug: data.get("slug") }); form.reset(); await reload() }}><Field label="Location name"><input className="field" name="name" required maxLength={100} /></Field><Field label="URL name (for example, mohali)"><input className="field" name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required maxLength={80} /></Field></ActionForm></Panel>        </div></div>
    </div>
}

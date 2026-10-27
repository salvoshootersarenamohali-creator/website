"use client"
import { useCallback, useEffect, useState } from "react"
import { ArrowDownLeft, ArrowRight, ArrowRightLeft, ArrowUpRight, CheckCheck, ClipboardCheck, Clock3, Coins, FilePenLine, ReceiptText, SlidersHorizontal, Users, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatRangeTime, rangeDay, RangeActor } from "@/lib/range/shared"
import { formatMoney } from "@/lib/range/money"
import { EmptyState, Field, LoadingState, Panel, StatusBadge, rangeApi } from "./shared"

type DashboardData = { from: string; to: string; today: string; scope: string; incomePaise: number; expensePaise: number; netPaise: number; attendance: Record<string, number>; openShifts: { id: string; locationId: string; inAt: string; needsReview: boolean; user: { name: string }; location: { name: string } }[]; pendingTransfers: number; pendingCorrections: number; totalBalancePaise: number; accounts: { id: string; name: string; location: string; balancePaise: number; active: boolean }[] }
const rollStatuses = [{ key: "present", label: "Present", color: "#7d9c61" }, { key: "absent", label: "Absent", color: "#cc9985" }, { key: "leave", label: "On leave", color: "#dcc38a" }, { key: "unmarked", label: "Unmarked", color: "#e1e7d9" }]
function shortDate(date: string) { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(`${date}T00:00:00+05:30`)) }
export function Dashboard({ user, locationId, navigate }: { user: RangeActor; locationId: string; navigate: (tab: string, locationId?: string) => void }) {
    const [all, setAll] = useState(false), [from, setFrom] = useState(`${rangeDay().slice(0, 7)}-01`), [to, setTo] = useState(rangeDay()), [data, setData] = useState<DashboardData>(), [error, setError] = useState(""), [loading, setLoading] = useState(true), [period, setPeriod] = useState("month"), [custom, setCustom] = useState(false), [retry, setRetry] = useState(0), [showRequests, setShowRequests] = useState(false)
    const owner = user.role === "owner"
    useEffect(() => {
        let active = true
        if (!from || !to || from > to) return
        void Promise.resolve().then(async () => {
            if (!active) return
            setLoading(true)
            try { const result = await rangeApi<DashboardData>(`dashboard?locationId=${all ? "all" : locationId}&from=${from}&to=${to}`); if (active) { setData(result); setError("") } }
            catch (e) { if (active) setError(e instanceof Error ? e.message : "Unable to load overview.") }
            finally { if (active) setLoading(false) }
        })
        return () => { active = false }
    }, [all, locationId, from, to, retry])
    const choosePeriod = useCallback((value: string) => { setPeriod(value); setCustom(value === "custom"); if (value !== "custom") { setFrom(value === "today" ? rangeDay() : `${rangeDay().slice(0, 7)}-01`); setTo(rangeDay()) } }, [])
    const totalStudents = data ? rollStatuses.reduce((sum, s) => sum + (data.attendance[s.key] || 0), 0) : 0
    const unmarked = data?.attendance.unmarked || 0
    const quickActions = [
        { tab: "attendance", label: owner ? "Coach attendance" : "Check in / out", hint: owner ? "Shifts & hours" : "Start or finish your shift", icon: ClipboardCheck },
        { tab: "students", label: "Student attendance", hint: "Take today’s roll", icon: Users },
        { tab: "fees", label: "Record student fees", hint: "Admission or renewal", icon: ReceiptText },
        { tab: "finance", label: "Income & expenses", hint: "Record a transaction", icon: Wallet },
    ]
    return <div className="range-overview">
        <div className="range-quick-actions" aria-label="Quick actions">{quickActions.map(action => <button key={action.tab} type="button" className="range-quick-action" onClick={() => navigate(action.tab)}><span><action.icon size={18} strokeWidth={1.6} aria-hidden="true" /></span><span><strong>{action.label}</strong><small>{action.hint}</small></span><ArrowRight size={14} aria-hidden="true" /></button>)}</div>
        <section aria-labelledby="financial-snapshot" aria-busy={loading}><div className="range-section-label"><h2 id="financial-snapshot">{owner ? "Financial snapshot" : "My financial snapshot"}</h2><div className="range-period-controls" aria-label="Financial period">{[["today", "Today"], ["month", "This month"], ["custom", "Custom dates"]].map(([key, label]) => <button key={key} type="button" aria-pressed={period === key} onClick={() => choosePeriod(key)}>{label}</button>)}{owner && <button type="button" aria-label="More overview filters" aria-expanded={custom} onClick={() => setCustom(v => !v)}><SlidersHorizontal size={14} aria-hidden="true" /></button>}</div></div>
            {custom && <div className="range-date-filters"><Field label="From"><input className="field" type="date" required value={from} max={to} onChange={e => { setPeriod("custom"); setFrom(e.target.value) }} /></Field><Field label="Through"><input className="field" type="date" required value={to} min={from} onChange={e => { setPeriod("custom"); setTo(e.target.value) }} /></Field>{owner && <label className="py-3 text-xs"><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> Combine all locations</label>}</div>}
            {(!from || !to || from > to) && <p className="range-feedback range-feedback-error" role="alert">Choose a valid start and end date.</p>}
            {error && <div className="range-feedback range-feedback-error" role="alert"><span className="flex-1">{error}</span><button type="button" className="underline" onClick={() => setRetry(v => v + 1)}>Try again</button></div>}
            {!data && loading ? <LoadingState label="Loading your overview…" /> : data && <><div className="range-stat-grid">{[
                { label: "Income", value: data.incomePaise, icon: ArrowDownLeft, hint: "Money received" },
                { label: "Expenses", value: data.expensePaise, icon: ArrowUpRight, hint: "Money paid out" },
                { label: "Net income", value: data.netPaise, icon: Coins, hint: "Income less expenses" },
                { label: "Tracked funds", value: data.totalBalancePaise, icon: Wallet, hint: `Balance as of ${shortDate(data.to)}`, featured: true },
            ].map(stat => <article className={`range-stat ${stat.featured ? "range-stat-featured" : ""}`} key={stat.label}><div className="range-stat-top"><span>{stat.label}</span><stat.icon size={15} strokeWidth={1.5} aria-hidden="true" /></div><strong className="range-stat-value">{formatMoney(stat.value)}</strong><small>{stat.hint}</small></article>)}</div><p className="range-finance-explainer">{loading ? "Updating… · " : ""}{data.scope} · {shortDate(data.from)}–{shortDate(data.to)}{!owner ? " · Entries attributed to you" : ""}. Transfers are excluded from income and expenses.</p></>}
        </section>
        {data && <div className="range-overview-columns"><div className="range-overview-stack">
            <Panel title="Today’s student attendance" description={`${totalStudents} enrolled students · ${shortDate(data.today)}`} action={<StatusBadge tone={unmarked ? "warning" : "success"}>{unmarked ? `${unmarked} to mark` : totalStudents ? "Roll complete" : "No students yet"}</StatusBadge>}>
                {totalStudents ? <><div className="range-attendance-counts">{rollStatuses.map(s => <div key={s.key}><strong>{data.attendance[s.key] || 0}</strong><span>{s.label}</span></div>)}</div><div className="range-attendance-bar" role="img" aria-label={rollStatuses.map(s => `${data.attendance[s.key] || 0} ${s.label.toLowerCase()}`).join(", ")}>{rollStatuses.map(s => <div key={s.key} style={{ width: `${((data.attendance[s.key] || 0) / totalStudents) * 100}%`, background: s.color }} />)}</div><div className="range-roll-footer"><p>{unmarked ? "A few students still need their attendance marked." : "All students have a status for today."}</p><button className="range-text-action" onClick={() => navigate("students")}>Open student roll <ArrowRight size={13} aria-hidden="true" /></button></div></> : <EmptyState title="Your student roll starts here" description="Add students to this location, then mark their attendance each day." action={<Button variant="outline" onClick={() => navigate("students")}>Go to students</Button>} />}
            </Panel>
            <Panel title={owner ? "Coaches on the range" : "My current shift"} description={owner ? "Open shifts across the selected location scope" : "Your attendance status for today"} action={<button className="range-text-action" onClick={() => navigate("attendance")}>View attendance <ArrowRight size={13} aria-hidden="true" /></button>}>
                {data.openShifts.length ? data.openShifts.map(shift => <article key={shift.id} className="range-shift-row"><span className="range-shift-avatar">{shift.user.name.split(/\s+/).map(n => n[0]).slice(0, 2).join("")}</span><div><div className="flex flex-wrap items-center gap-2"><strong>{shift.user.name}</strong><StatusBadge tone={shift.needsReview ? "warning" : "success"}>{shift.needsReview ? "Needs review" : "On shift"}</StatusBadge></div><p>{shift.location.name} · Arrived {formatRangeTime(shift.inAt)}</p>{shift.needsReview && <p className="text-amber-700">An earlier shift is still open. Review the departure time.</p>}</div><button className="range-text-action" onClick={() => navigate("attendance", shift.locationId)} aria-label={`Open attendance for ${shift.user.name}`}><ArrowRight size={15} /></button></article>) : <EmptyState title={owner ? "No coaches currently checked in" : "You’re currently checked out"} description={owner ? "Open shifts appear here after a coach checks in." : "Start your shift with a quick camera check-in."} action={!owner ? <Button onClick={() => navigate("attendance")}>Check in with a selfie</Button> : undefined} />}
            </Panel>
        </div><div className="range-overview-stack">
            <Panel title={owner ? "Needs your attention" : "My requests"} description={owner ? "Keep the day moving with a quick review" : "Keep track of what’s awaiting owner review"}>
                {!data.pendingTransfers && !data.pendingCorrections ? <div className="flex items-start gap-3 py-2"><CheckCheck size={24} className="text-[#789664]" aria-hidden="true" /><div><p className="text-sm font-medium">You’re all caught up</p><p className="range-muted mt-1 text-xs">No pending handovers or correction requests.</p></div></div> : <>
                    <div className="range-review-row"><ArrowRightLeft size={18} aria-hidden="true" /><div><strong>Money handovers</strong><small>{owner ? "Awaiting your confirmation" : "Awaiting owner confirmation"}</small></div><span className="range-review-count">{data.pendingTransfers}</span><button className="range-text-action" aria-label="View money handovers" onClick={() => navigate("transfers")}><ArrowRight size={14} /></button></div>
                    <div className="range-review-row"><FilePenLine size={18} aria-hidden="true" /><div><strong>Correction requests</strong><small>{owner ? "Changes to review" : "Awaiting owner review"}</small></div><span className="range-review-count">{data.pendingCorrections}</span><button className="range-text-action" aria-label="Choose correction requests to review" aria-expanded={showRequests} onClick={() => setShowRequests(v => !v)}><ArrowRight size={14} /></button></div>
                    {showRequests && <div className="mt-3 grid gap-2 rounded-lg bg-[#f4f7ef] p-3"><p className="range-muted text-xs">Open a section to review its correction requests.</p>{[["attendance", "Coach attendance"], ["students", "Student attendance"], ["fees", "Student fees"], ["finance", "Financial entries"], ["transfers", "Handovers"]].map(([tab, name]) => <button key={tab} className="range-text-action" onClick={() => navigate(tab)}>{name}<ArrowRight size={12} /></button>)}</div>}
                </>}
            </Panel>
            <Panel title={owner ? "Funds by account" : "My holding accounts"} description={`Tracked balance as of ${shortDate(data.to)}`} action={<button className="range-text-action" onClick={() => navigate("finance")}>Details <ArrowRight size={13} aria-hidden="true" /></button>}>
                {data.accounts.length ? data.accounts.map(account => <div className="range-account-row" key={account.id}><span><Wallet size={16} strokeWidth={1.5} aria-hidden="true" /></span><div><p>{account.name}{!account.active && <span className="range-muted"> · Inactive</span>}</p><small>{account.location}</small></div><strong className={account.balancePaise < 0 ? "text-amber-700!" : ""}>{formatMoney(account.balancePaise)}</strong></div>) : <EmptyState title="No accounts set up yet" description={owner ? "Add an account and its opening balance in Income & expenses." : "Your holding accounts will appear once the owner sets them up."} />}
            </Panel>
            <div className="flex items-start gap-2 px-1 text-[11px] text-[#87967b]"><Clock3 size={14} className="mt-0.5 shrink-0" aria-hidden="true" /><p>Attendance is always for today. Financial totals follow your selected dates.</p></div>
        </div></div>}
    </div>
}

"use client"
import { useCallback, useEffect, useState } from "react"
import { usePolling } from "@/lib/use-polling"
import { Bell, CheckCheck, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatRangeTime } from "@/lib/range/shared"
import { formatMoney } from "@/lib/range/money"
import { EmptyState, LoadingState, Panel, StatusBadge, rangeApi } from "./shared"

type Update = { id: string; action: string; entityId: string; actor: { name: string }; location: { name: string } | null; createdAt: string; reason: string | null; before: Record<string, unknown> | null; after: Record<string, unknown> | null; read: boolean }
type Activity = { updates: Update[]; unreadCount: number; total: number; page: number }
const labels: Record<string, string> = { "finance.posted": "Financial entry recorded", "finance.voided": "Financial entry voided", "finance.account.saved": "Funds account added or updated", "finance.account.deleted": "Funds account deleted", "finance.product.saved": "Product added or updated", "finance.category.saved": "Category added or updated", "fee.recorded": "Student payment recorded", "fee.voided": "Student payment voided", "salary.recorded": "Salary payment recorded", "salary.voided": "Salary payment voided", "transfer.requested": "Handover recorded", "transfer.confirmed": "Handover confirmed", "transfer.rejected": "Handover rejected", "transfer.reversed": "Transfer reversed", "finance.access.created": "Finance account created", "correction.requested": "Financial correction requested", "correction.rejected": "Financial correction rejected" }
export function FinancialActivityBell({ open, polling = true }: { open: () => void; polling?: boolean }) {
    const [count, setCount] = useState(0)
    const load = useCallback(async (signal: AbortSignal) => {
        try {
            const data = await rangeApi<{ unreadCount: number }>("financial-activity?countOnly=1")
            if (!signal.aborted) setCount(data.unreadCount)
            return true
        } catch { return false }
    }, [])
    usePolling(load, 30_000, polling)
    useEffect(() => {
        const update = (event: Event) => setCount((event as CustomEvent<number>).detail)
        window.addEventListener("financial-activity-count", update)
        return () => window.removeEventListener("financial-activity-count", update)
    }, [])
    return <Button variant="outline" onClick={open} aria-label={`Financial updates${count ? `, ${count} unread` : ""}`}><Bell size={17} aria-hidden="true" />{count > 0 && <span className="range-notification-count">{count > 99 ? "99+" : count}</span>}</Button>
}
export function FinancialActivity() {
    const [data, setData] = useState<Activity>(), [all, setAll] = useState(false), [page, setPage] = useState(1), [loading, setLoading] = useState(true), [error, setError] = useState(""), [busy, setBusy] = useState(false)
    const fetchUpdates = useCallback(async (signal: AbortSignal) => {
        setLoading(true)
        try {
            const result = await rangeApi<Activity>(`financial-activity?page=${page}&all=${all ? "1" : "0"}`)
            if (signal.aborted) return
            setData(result)
            setError("")
            window.dispatchEvent(new CustomEvent("financial-activity-count", { detail: result.unreadCount }))
            return true
        } catch (error) {
            if (!signal.aborted) setError(error instanceof Error ? error.message : "Unable to load financial updates.")
            return false
        } finally {
            if (!signal.aborted) setLoading(false)
        }
    }, [all, page])
    const load = usePolling(fetchUpdates, 30_000)
    async function markRead(ids: string[]) { setBusy(true); try { await rangeApi("financial-activity", { ids }); if (!all && page > 1) setPage(1); else await load() } catch (error) { setError(error instanceof Error ? error.message : "Unable to mark updates read.") } finally { setBusy(false) } }
    return <div className="space-y-5"><Panel title="Financial updates" description="All financial changes are recorded here. Reading an update does not approve, reject, or change the financial record."><div className="range-section-toolbar"><div className="range-segments">{[[false, "Unread"], [true, "All updates"]].map(([value, label]) => <button key={String(value)} type="button" aria-pressed={all === value} onClick={() => { setAll(Boolean(value)); setPage(1) }}>{label}</button>)}</div><span className="range-muted">{data?.unreadCount || 0} unread</span><Button variant="outline" disabled={loading} onClick={load}><RefreshCw size={15} aria-hidden="true" />Refresh</Button><Button variant="outline" disabled={busy || !data?.updates.some(update => !update.read)} onClick={() => markRead(data!.updates.filter(update => !update.read).map(update => update.id))}><CheckCheck size={16} aria-hidden="true" />Mark displayed updates read</Button></div></Panel>
        {error && <p className="range-feedback range-feedback-error" role="alert">{error}</p>}{loading && !data ? <LoadingState label="Loading financial updates…" /> : data?.updates.length ? <div className="space-y-4">{data.updates.map(update => <Panel key={update.id} title={labels[update.action] || update.action} description={`${update.actor.name} · ${update.location?.name || "All locations"} · ${formatRangeTime(update.createdAt)}`} action={<StatusBadge tone={update.read ? "neutral" : "warning"}>{update.read ? "Read" : "New"}</StatusBadge>}><p className="text-sm">{String(update.after?.description || update.after?.name || update.before?.description || update.before?.name || "Financial record")}</p>{update.reason && <p className="range-muted mt-2 text-sm">Reason: {update.reason}</p>}<details className="mt-3"><summary>View recorded changes</summary><div className="grid gap-4 sm:grid-cols-2"><Snapshot title="Before" value={update.before} /><Snapshot title="After" value={update.after} /></div><p className="range-muted mt-3 text-xs">Record reference: {update.entityId}</p></details>{!update.read && <Button className="mt-3" variant="outline" disabled={busy} onClick={() => markRead([update.id])}>Mark read</Button>}</Panel>)}</div> : <EmptyState title={all ? "No financial changes yet" : "You’re up to date"} description="Financial additions, changes, deletions, refunds, and handovers will appear here as they are recorded." />}
        {data && data.total > 50 && <div className="range-section-toolbar"><span className="range-muted">Page {page} · {data.total} updates</span><div className="flex gap-2"><Button variant="outline" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</Button><Button variant="outline" disabled={page * 50 >= data.total || loading} onClick={() => setPage(value => value + 1)}>Next</Button></div></div>}
    </div>
}
function Snapshot({ title, value }: { title: string; value: Record<string, unknown> | null }) {
    return <div className="range-balance-card"><h3 className="mb-3 text-sm font-semibold">{title}</h3>{value ? <dl className="space-y-2">{Object.entries(value).map(([key, item]) => <div key={key} className="text-xs"><dt className="range-muted">{key}</dt><dd className="mt-1 break-words whitespace-pre-wrap">{key.toLowerCase().endsWith("paise") && typeof item === "number" ? formatMoney(item) : typeof item === "object" && item !== null ? JSON.stringify(item, null, 2) : String(item ?? "—")}</dd></div>)}</dl> : <p className="range-muted text-sm">{title === "Before" ? "New record" : "Record removed"}</p>}</div>
}

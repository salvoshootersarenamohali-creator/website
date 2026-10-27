"use client"
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { formatRangeTime } from "@/lib/range/shared"
import { ActionForm, EmptyState, Field, LoadingState, Panel, StatusBadge, rangeApi } from "./shared"

export type Correction = { id: string; userId: string; entityId: string; kind: string; reason: string; proposed: Record<string, string>; status: string; resolution: string | null; createdAt: string; user: { name: string } }
const fieldNames: Record<string, string> = { inAt: "Arrival", outAt: "Departure", date: "Date", status: "Attendance", description: "Description", student: "Student", notes: "Details" }
function displayChange(key: string, value: string) {
    if (["inAt", "outAt"].includes(key) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return `${formatRangeTime(`${value}:00+05:30`)} IST`
    if (key === "status") return value === "unmarked" ? "Not marked" : value.charAt(0).toUpperCase() + value.slice(1)
    return value
}
export function Corrections({ locationId, owner, kind, refresh, review }: { locationId: string; owner: boolean; kind: string; refresh: number; review: (request: Correction) => void }) {
    const [requests, setRequests] = useState<Correction[]>([]), [error, setError] = useState(""), [status, setStatus] = useState(owner ? "pending" : "all"), [loading, setLoading] = useState(true)
    const load = useCallback(async () => { setLoading(true); try { setRequests((await rangeApi<{ requests: Correction[] }>(`corrections?locationId=${encodeURIComponent(locationId)}`)).requests.filter(r => r.kind === kind)); setError("") } catch (e) { setError(e instanceof Error ? e.message : "Unable to load requests.") } finally { setLoading(false) } }, [locationId, kind])
    useEffect(() => { void Promise.resolve().then(load) }, [load, refresh])
    const visible = requests.filter(r => status === "all" || r.status === status)
    return <Panel title="Correction requests" description={owner ? "Review requested changes and keep a record of your decision." : "Track the corrections you’ve sent to the owner."} action={<select className="field max-w-40" aria-label="Correction request status" value={status} onChange={e => setStatus(e.target.value)}><option value="pending">Pending</option><option value="resolved">Resolved</option><option value="rejected">Rejected</option><option value="all">All requests</option></select>}>
        {error && <p role="alert">{error}</p>}{loading ? <LoadingState label="Loading requests…" /> : !visible.length ? <EmptyState title={status === "pending" ? "No pending corrections" : "No correction requests in this view"} description={owner ? "Requests from coaches will appear here for review." : "Any requests you send from this section will appear here."} /> : <div className="space-y-4">{visible.map(r => <article key={r.id} className="range-correction-card"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm font-medium">{r.user.name}</strong><StatusBadge tone={r.status === "pending" ? "warning" : r.status === "resolved" ? "success" : "neutral"}>{r.status}</StatusBadge></div><p className="range-muted mt-1 text-xs">{formatRangeTime(r.createdAt)}</p><p className="my-3 text-sm">{r.reason}</p><dl className="range-proposed-changes">{Object.entries(r.proposed).map(([key, value]) => <div key={key}><dt>{fieldNames[key] || key}</dt><dd>{displayChange(key, String(value))}</dd></div>)}</dl>{r.resolution && <p className="mt-3 text-sm"><span className="range-muted">Owner response: </span>{r.resolution}</p>}{owner && r.status === "pending" && <div className="mt-4"><Button variant="outline" onClick={() => review(r)}>Review correction</Button><details className="mt-2"><summary className="text-xs">Reject this request</summary><ActionForm submit="Reject request" onSubmit={async form => { await rangeApi("corrections/reject", { id: r.id, reason: new FormData(form).get("reason") }); await load() }}><Field label="Reason for rejection"><input className="field" name="reason" required maxLength={1000} placeholder="Explain why this change cannot be approved" /></Field></ActionForm></details></div>}</article>)}</div>}
    </Panel>
}

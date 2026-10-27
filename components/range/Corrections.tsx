"use client"
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { formatRangeTime } from "@/lib/range/shared"
import { ActionForm, Field, Panel, rangeApi } from "./shared"

export type Correction = { id: string; userId: string; entityId: string; kind: string; reason: string; proposed: Record<string, string>; status: string; resolution: string | null; createdAt: string; user: { name: string } }
export function Corrections({ locationId, owner, kind, refresh, review }: { locationId: string; owner: boolean; kind: string; refresh: number; review: (request: Correction) => void }) {
    const [requests, setRequests] = useState<Correction[]>([]), [error, setError] = useState("")
    const load = useCallback(async () => { try { setRequests((await rangeApi<{ requests: Correction[] }>(`corrections?locationId=${encodeURIComponent(locationId)}`)).requests.filter(r => r.kind === kind)) } catch (e) { setError(e instanceof Error ? e.message : "Unable to load requests.") } }, [locationId, kind])
    useEffect(() => { void Promise.resolve().then(load) }, [load, refresh])
    return <Panel title="Correction requests">{error && <p role="alert">{error}</p>}{!requests.length && <p className="text-[#71806b]">No correction requests.</p>}<div className="space-y-4">{requests.map(r => <article key={r.id} className="space-y-2 border-b border-[#e2e8dc] pb-4"><p><strong>{r.user.name}</strong> · {r.status} · {formatRangeTime(r.createdAt)}</p><p>{r.reason}</p>{Object.entries(r.proposed).map(([key, value]) => <p key={key} className="text-sm text-[#71806b]">{key}: {String(value)}</p>)}{r.resolution && <p>Owner response: {r.resolution}</p>}{owner && r.status === "pending" && <><Button variant="outline" onClick={() => review(r)}>Review correction</Button><ActionForm submit="Reject request" onSubmit={async form => { await rangeApi("corrections/reject", { id: r.id, reason: new FormData(form).get("reason") }); await load() }}><Field label="Reason for rejection"><input className="field" name="reason" required maxLength={1000} /></Field></ActionForm></>}</article>)}</div></Panel>
}

"use client"

import * as React from "react"
import { usePolling } from "@/lib/use-polling"
import { type PublicCompetition, type SelectedEntry } from "@/lib/competition"
import { getBookingEligibility, getSelectedBookingEligibility, type RelayAvailability } from "@/lib/relay-booking"
import { relayLabel, type RelayPool } from "@/lib/relay-config"

export type PendingBooking = { date: string; slot: string; pool: RelayPool }

export function useRelayAvailability(slug: string | null, refreshKey: number) {
    const [availability, setAvailability] = React.useState<RelayAvailability[]>([])
    const [error, setError] = React.useState("")
    const [loading, setLoading] = React.useState(true)
    const load = React.useCallback(async (signal: AbortSignal) => {
        if (!slug) return
        try {
            const response = await fetch(`/api/competitions/${encodeURIComponent(slug)}/relays`, { cache: "no-store", signal })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error ?? "Unable to check relay availability.")
            if (signal.aborted) return
            setAvailability(payload.relays)
            setError("")
            return true
        } catch (e) {
            if (!signal.aborted) setError(e instanceof Error ? e.message : "Unable to check relay availability.")
            return false
        } finally {
            if (!signal.aborted) setLoading(false)
        }
    }, [slug])
    const refresh = usePolling(load, 15_000, Boolean(slug))
    React.useEffect(() => {
        if (refreshKey) void refresh()
    }, [refreshKey, refresh])
    return { availability, error, loading }
}

export function RelaySelector({ competition, entries, dateOfBirth, gender, date, slot, onChange, refreshKey = 0, shared, pending = [], currentBooking }: {
    competition: PublicCompetition
    shared?: ReturnType<typeof useRelayAvailability>
    entries: SelectedEntry[]
    dateOfBirth: string
    gender: string
    date: string
    slot: string
    onChange: (date: string, slot: string) => void
    refreshKey?: number
    pending?: PendingBooking[]
    currentBooking?: { date: string; relayId: string; pool: string } | null
}) {
    const local = useRelayAvailability(shared ? null : competition.slug, refreshKey)
    const { availability, error, loading } = shared ?? local
    const config = competition.config
    let eligibility: ReturnType<typeof getBookingEligibility> | null = null
    let selectionError = ""
    try {
        if (entries.length) eligibility = getSelectedBookingEligibility(entries, config, dateOfBirth, gender)
    } catch (e) { selectionError = e instanceof Error ? e.message : "Check selected events." }
    const pool = eligibility?.pool
    const ruleSet = eligibility?.ruleSet
    const onChangeRef = React.useRef(onChange)
    React.useEffect(() => { onChangeRef.current = onChange }, [onChange])
    const day = config.relayBooking.days.find((d) => d.date === date)
    const remaining = (relayId: string, label: string) => {
        if (!pool) return 0
        const value = availability.find((a) => a.date === date && a.relayId === relayId)?.[pool].remaining ?? 0
        const own = currentBooking?.date === date && currentBooking.relayId === relayId && currentBooking.pool === pool ? 1 : 0
        return Math.max(0, value + own - pending.filter((p) => p.date === date && p.slot === label && p.pool === pool).length)
    }
    const valid = day?.relays.some((r) => relayLabel(r) === slot && (!ruleSet || r.ruleSet === ruleSet) && remaining(r.id, relayLabel(r)) > 0)
    React.useEffect(() => {
        if (!day?.relays.length) onChangeRef.current(config.relayBooking.days.find((d) => d.relays.length)?.date ?? "", "")
        else if (slot && (!pool || (!loading && !error && !valid))) onChangeRef.current(date, "")
    }, [day, config.relayBooking.days, date, slot, pool, valid, loading, error])
    return <div className="space-y-3">
        <label className="block text-sm font-semibold text-white/70">Match date
            <select required value={date} onChange={(e) => onChange(e.target.value, "")} className="field mt-2">
                {config.relayBooking.days.filter((d) => d.relays.length).map((d) => <option key={d.date} value={d.date}>{d.date}</option>)}
            </select>
        </label>
        <p className="text-sm text-white/60">{pool === "special" ? `Little Champ / Open Sight: ${config.relayBooking.specialCapacity} shared lanes. Choose any relay.` : pool ? `${ruleSet} entries: ${config.relayBooking.standardCapacity} shared standard lanes.` : "Select event categories to see eligible relays."} Your lane is assigned when registration succeeds.</p>
        {(error || selectionError) && <p role="alert" className="text-sm text-red-200">{selectionError || error}</p>}
        {loading && <p className="text-sm text-white/50">Checking available lanes…</p>}
        <div className="grid gap-2 sm:grid-cols-2">
            {day?.relays.filter((r) => pool && (!ruleSet || r.ruleSet === ruleSet)).map((relay) => {
                const label = relayLabel(relay)
                const left = remaining(relay.id, label)
                return <button key={relay.id} type="button" disabled={loading || !!error || !left} onClick={() => onChange(date, label)} className={`rounded-md border p-3 text-left text-sm disabled:opacity-40 ${slot === label ? "border-[#D4AF37] bg-[#D4AF37]/15" : "border-white/15 bg-white/[0.03]"}`}>
                    <strong className="block">Relay {relay.number} · {relay.ruleSet} · {relay.startTime}–{relay.endTime}</strong>
                    <span className="mt-1 block text-xs text-white/55">Report {relay.reportingTime} · Prepare {relay.preparationTime}</span>
                    <span className="mt-1 block font-bold text-[#E5C558]">{left ? `${left} lanes available` : "Full"}</span>
                </button>
            })}
        </div>
        <input className="sr-only" tabIndex={-1} aria-label="Selected relay" required value={!error && valid ? slot : ""} onChange={() => {}} />
    </div>
}

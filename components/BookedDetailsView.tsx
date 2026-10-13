"use client"
import * as React from "react"
import { type CompetitionConfig } from "@/lib/competition"
import { buildBookedDetails, type BookedRegistration } from "@/lib/booked-details"

export function BookedDetailsView({ registrations, config, title, venue, slug, adminPin }: { registrations: BookedRegistration[]; config: CompetitionConfig; title: string; venue: string; slug: string; adminPin: string }) {
    const [date, setDate] = React.useState(config.relayBooking.days[0]?.date ?? "")
    const [snapshot, setSnapshot] = React.useState(() => ({ details: buildBookedDetails(registrations, config, date), generatedAt: new Date().toISOString() }))
    const [busy, setBusy] = React.useState(false)
    const [error, setError] = React.useState("")
    async function refresh() {
        setBusy(true); setError("")
        try {
            const response = await fetch(`/api/admin/competitions/${slug}/registrations`, { headers: { "x-admin-pin": adminPin }, cache: "no-store" })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error ?? "Unable to refresh detail sheets.")
            setSnapshot({ details: buildBookedDetails(payload.registrations, payload.competition.config, date), generatedAt: new Date().toISOString() })
        } catch (e) { setError(e instanceof Error ? e.message : "Unable to refresh detail sheets.") }
        finally { setBusy(false) }
    }
    async function download(format: "pdf" | "xlsx") {
        setBusy(true); setError("")
        try {
            const response = await fetch(`/api/admin/competitions/${slug}/details/export`, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-pin": adminPin }, body: JSON.stringify({ date, format }) })
            if (!response.ok) { const payload = await response.json(); throw new Error(payload.error ?? "Unable to download details.") }
            const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a")
            link.href = url; link.download = `${slug}-details-${date}.${format}`; link.click(); URL.revokeObjectURL(url)
        } catch (e) { setError(e instanceof Error ? e.message : "Unable to download details.") }
        finally { setBusy(false) }
    }
    return <div className="space-y-6">
        <section className="no-print rounded-lg border border-white/15 bg-neutral-950 p-5">
            <h2 className="text-2xl font-black">Booked Detail Sheets</h2><p className="mt-2 text-white/55">Generate a fresh lane list for any match day, including vacant lanes and remaining capacity.</p>
            <div className="mt-4 flex flex-wrap gap-3"><select value={date} onChange={(e) => { setDate(e.target.value); setSnapshot({ details: buildBookedDetails(registrations, config, e.target.value), generatedAt: new Date().toISOString() }) }} className="field max-w-56">{config.relayBooking.days.map((day) => <option key={day.date}>{day.date}</option>)}</select>
                <button type="button" disabled={busy} onClick={refresh} className="admin-button gold">Refresh snapshot</button><button type="button" disabled={busy} onClick={() => download("xlsx")} className="admin-button">Excel</button><button type="button" disabled={busy} onClick={() => download("pdf")} className="admin-button">PDF</button><button type="button" onClick={() => window.print()} className="admin-button">Print</button>
            </div>{error && <p className="mt-3 text-red-200">{error}</p>}
        </section>
        <section className="print-details booked-print-details bg-white p-4 text-black">
            {snapshot.details.map((detail) => <article key={`${detail.date}-${detail.relay.id}-${detail.pool}`} className="detail-sheet">
                <h2>{title}</h2><p className="detail-venue">{venue}</p>
                <div className="detail-meta-grid"><p>Relay {detail.relay.number} ({detail.relay.ruleSet}) · {detail.pool.toUpperCase()} LANES</p><p>{detail.date}</p><p>Reporting: {detail.relay.reportingTime} · Preparation: {detail.relay.preparationTime}</p><p>Match: {detail.relay.startTime}–{detail.relay.endTime}</p><p>Capacity: {detail.capacity} · Booked: {detail.booked} · Available: {detail.remaining}</p><p>Snapshot: {new Date(snapshot.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p></div>
                <table className="detail-table"><thead><tr><th>Lane</th><th>Shooter</th><th>Academy / Club</th><th>Categories</th><th>Payment</th></tr></thead><tbody>{Array.from({ length: detail.capacity }, (_, index) => {
                    const row = detail.rows.find((r) => r.lane === index + 1)
                    return <tr key={index}><td>{index + 1}</td><td>{row?.name ?? "Available"}</td><td>{row?.academy ?? ""}</td><td>{row?.categories ?? ""}</td><td>{row?.paymentStatus ?? ""}</td></tr>
                })}</tbody></table>
            </article>)}
        </section>
    </div>
}

"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { categorySortValue } from "@/lib/results"

type RecordedResult = {
    id: string
    date: string
    shooter: string
    academy: string
    categoryCode: string
    reportedMatch: string
    scores: (number | null)[]
    total: number | null
    innerTens: number
    seriesTwoUnderReview: boolean
}

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
const pageSize = 40

export function BharatCupRecordedResults({ rows }: { rows: RecordedResult[] }) {
    const router = useRouter()
    const [query, setQuery] = useState("")
    const [date, setDate] = useState("")
    const [match, setMatch] = useState("")
    const [page, setPage] = useState(0)
    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === "visible") router.refresh()
        }
        const timer = window.setInterval(refresh, 30_000)
        document.addEventListener("visibilitychange", refresh)
        return () => {
            window.clearInterval(timer)
            document.removeEventListener("visibilitychange", refresh)
        }
    }, [router])

    const dates = [...new Set(rows.map((row) => row.date))]
    const matches = [...new Set(rows.map((row) => row.categoryCode))].sort((a, b) => categorySortValue(a).localeCompare(categorySortValue(b)))
    const visible = rows.filter((row) => (!date || row.date === date) && (!match || row.categoryCode === match)
        && `${row.shooter} ${row.academy}`.toLowerCase().includes(query.trim().toLowerCase()))
    const currentPage = Math.min(page, Math.max(0, Math.ceil(visible.length / pageSize) - 1))
    const shown = visible.slice(currentPage * pageSize, (currentPage + 1) * pageSize)

    return (
        <>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <label className="text-sm font-semibold">
                    Search
                    <input type="search" placeholder="Shooter or academy" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} className="mt-1 w-full rounded-md border border-white/20 bg-neutral-950 px-3 py-2" />
                </label>
                <label className="text-sm font-semibold">
                    Match date
                    <select value={date} onChange={(event) => { setDate(event.target.value); setPage(0) }} className="mt-1 w-full rounded-md border border-white/20 bg-neutral-950 px-3 py-2">
                        <option value="">All dates</option>
                        {dates.map((value) => <option key={value} value={value}>{dateFormat.format(new Date(value))}</option>)}
                    </select>
                </label>
                <label className="text-sm font-semibold">
                    Match number
                    <select value={match} onChange={(event) => { setMatch(event.target.value); setPage(0) }} className="mt-1 w-full rounded-md border border-white/20 bg-neutral-950 px-3 py-2">
                        <option value="">All matches</option>
                        {matches.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                </label>
            </div>
            <p className="mb-3 text-sm text-white/65" aria-live="polite">
                {shown.length ? `${currentPage * pageSize + 1}–${currentPage * pageSize + shown.length} of ${visible.length} entries` : "No entries match these filters."}
            </p>
            {shown.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-white/15" tabIndex={0} role="region" aria-label="Recorded scores table">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/10 text-[#E5C558]">
                            <tr>{["Shooter", "Academy / Institution", "Date", "Match", "S1", "S2", "S3", "S4", "S5", "S6", "10x", "Total"].map((column) => <th key={column} scope="col" className="whitespace-nowrap px-3 py-3">{column}</th>)}</tr>
                        </thead>
                        <tbody>
                            {shown.map((row) => <tr key={row.id} className="border-t border-white/10 even:bg-white/[0.025]">
                                <th scope="row" className="px-3 py-3 font-semibold">{row.shooter}</th>
                                <td className="px-3 py-3">{row.academy}</td>
                                <td className="whitespace-nowrap px-3 py-3">{dateFormat.format(new Date(row.date))}</td>
                                <td className="whitespace-nowrap px-3 py-3">{row.reportedMatch}</td>
                                {row.scores.map((score, index) => <td key={index} className="whitespace-nowrap px-3 py-3 tabular-nums">
                                    {index === 1 && row.seriesTwoUnderReview ? <span className="text-amber-200">Under review</span> : score ?? "—"}
                                </td>)}
                                <td className="px-3 py-3 tabular-nums">{row.innerTens}</td>
                                <td className="whitespace-nowrap px-3 py-3 font-bold tabular-nums text-[#E5C558]">{row.total ?? "Pending"}</td>
                            </tr>)}
                        </tbody>
                    </table>
                </div>
            )}
            {visible.length > pageSize && <div className="mt-4 flex gap-3">
                <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="rounded-md border border-white/20 px-4 py-2 font-semibold disabled:opacity-40">Previous</button>
                <button type="button" disabled={(currentPage + 1) * pageSize >= visible.length} onClick={() => setPage(currentPage + 1)} className="rounded-md border border-white/20 px-4 py-2 font-semibold disabled:opacity-40">Next</button>
            </div>}
        </>
    )
}

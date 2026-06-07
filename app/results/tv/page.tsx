"use client"

import * as React from "react"
import Image from "next/image"
import { AlertTriangle, Clock3, Loader2, Trophy } from "lucide-react"

type ResultRow = {
    id: string
    rank: number | null
    shooterName: string
    academy: string
    eventTitle: string
    categoryCode: string
    innerTenCount: number
    displayTotal: string
}

type TopStudentGroup = {
    title: string
    rangeLabel: string
    rows: ResultRow[]
}

type ResultsPayload = {
    generatedAt: string
    summary: {
        entries: number
        scored: number
    }
    topStudents: TopStudentGroup[]
}

async function readResponseJson(response: Response) {
    const text = await response.text()
    if (!text) return {}

    try {
        return JSON.parse(text) as Record<string, unknown>
    } catch {
        return { error: text }
    }
}

function formatUpdatedAt(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "--:--"
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

function rankStyle(rank: number | null) {
    if (rank === 1) return "border-[#D4AF37]/80 bg-[#D4AF37]/18 text-[#FFE27A]"
    if (rank === 2) return "border-slate-200/55 bg-slate-200/12 text-white"
    if (rank === 3) return "border-amber-700/65 bg-amber-700/18 text-amber-100"
    return "border-white/12 bg-white/[0.045] text-white/82"
}

export default function TvResultsPage() {
    const [payload, setPayload] = React.useState<ResultsPayload | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [error, setError] = React.useState("")

    const loadResults = React.useCallback(async () => {
        try {
            const response = await fetch("/api/results", { cache: "no-store" })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to load results.")
            setPayload(data as unknown as ResultsPayload)
            setError("")
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load results.")
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        loadResults()
        const timer = window.setInterval(loadResults, 15000)
        return () => window.clearInterval(timer)
    }, [loadResults])

    const groups = payload?.topStudents ?? []
    const scoredPercent = payload && payload.summary.entries > 0
        ? Math.round((payload.summary.scored / payload.summary.entries) * 100)
        : 0

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-black text-white">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(212,175,55,0.14),transparent_34%),radial-gradient(circle_at_80%_8%,rgba(28,100,84,0.32),transparent_28vw),radial-gradient(circle_at_12%_84%,rgba(212,175,55,0.12),transparent_24vw)]" />
            <div className="relative flex h-screen flex-col px-[3vw] py-[2.4vh]">
                <header className="flex shrink-0 items-center justify-between gap-[2vw] border-b border-white/10 pb-[1.8vh]">
                    <div className="flex min-w-0 items-center gap-[1.6vw]">
                        <div className="flex h-[8.4vh] w-[15vw] items-center justify-center rounded-md border border-white/10 bg-white px-[1vw]">
                            <Image src="/salvo-logo.png" alt="Salvo Shooters Arena" width={320} height={128} priority className="max-h-[6.8vh] w-auto" />
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-[0.6vw] rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/12 px-[0.9vw] py-[0.5vh] text-[0.9vw] font-black uppercase text-[#D4AF37]">
                                <Trophy className="h-[1vw] w-[1vw]" />
                                36th Salvo Cup
                            </div>
                            <h1 className="mt-[0.8vh] text-[3.1vw] font-black leading-none tracking-normal">Top 10 Results</h1>
                        </div>
                    </div>

                    <div className="grid shrink-0 grid-cols-3 gap-[0.8vw] text-right">
                        <TvMetric label="Scored" value={`${scoredPercent}%`} />
                        <TvMetric label="Entries" value={payload?.summary.entries ?? 0} />
                        <TvMetric label="Updated" value={payload?.generatedAt ? formatUpdatedAt(payload.generatedAt) : "--:--"} />
                    </div>
                </header>

                {isLoading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="text-center">
                            <Loader2 className="mx-auto h-[4vw] w-[4vw] animate-spin text-[#D4AF37]" />
                            <p className="mt-[2vh] text-[1.5vw] font-bold text-white/60">Loading live results</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="max-w-[56vw] rounded-lg border border-red-300/25 bg-red-500/10 p-[2vw] text-center">
                            <AlertTriangle className="mx-auto h-[4vw] w-[4vw] text-red-200" />
                            <p className="mt-[1.4vh] text-[2vw] font-black text-red-100">Results unavailable</p>
                            <p className="mt-[0.8vh] text-[1.2vw] text-red-100/70">{error}</p>
                        </div>
                    </div>
                ) : (
                    <main className="grid min-h-0 flex-1 grid-cols-2 gap-[1.4vw] pt-[2vh]">
                        {groups.map((group) => (
                            <TvLeaderboard key={group.title} group={group} />
                        ))}
                    </main>
                )}

                <footer className="mt-[1.4vh] flex shrink-0 items-center justify-between border-t border-white/10 pt-[1.2vh] text-[1vw] font-bold text-white/45">
                    <span>Auto-refreshes every 15 seconds</span>
                    <span className="inline-flex items-center gap-[0.45vw]"><Clock3 className="h-[1vw] w-[1vw]" /> salvoshootersarena.com/results</span>
                </footer>
            </div>
        </div>
    )
}

function TvMetric({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="min-w-[8vw] rounded-md border border-white/10 bg-white/[0.045] px-[0.9vw] py-[1vh]">
            <p className="text-[0.72vw] font-black uppercase tracking-normal text-white/38">{label}</p>
            <p className="mt-[0.3vh] text-[1.55vw] font-black leading-none text-[#D4AF37]">{value}</p>
        </div>
    )
}

function TvLeaderboard({ group }: { group: TopStudentGroup }) {
    const rows = group.rows.slice(0, 10)

    return (
        <section className="min-h-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-950/88 shadow-2xl shadow-black/35">
            <div className="flex items-end justify-between gap-[1vw] border-b border-white/10 px-[1.2vw] py-[1.2vh]">
                <div>
                    <h2 className="text-[1.8vw] font-black leading-none text-[#D4AF37]">{group.title.replace(" Top Students", "")}</h2>
                    <p className="mt-[0.5vh] text-[0.9vw] font-bold text-white/42">{group.rangeLabel}</p>
                </div>
                <p className="text-[0.9vw] font-black uppercase text-white/38">{group.rows.length} scored</p>
            </div>

            <div className="grid grid-cols-[4.8vw_1fr_7.2vw_6.8vw] border-b border-white/10 px-[1vw] py-[0.7vh] text-[0.78vw] font-black uppercase text-white/38">
                <span>Rank</span>
                <span>Student</span>
                <span className="text-right">10x</span>
                <span className="text-right">Total</span>
            </div>

            <div className="divide-y divide-white/[0.055]">
                {rows.length ? rows.map((row) => (
                    <div key={row.id} className="grid h-[6.45vh] grid-cols-[4.8vw_1fr_7.2vw_6.8vw] items-center px-[1vw]">
                        <div>
                            <span className={`inline-flex h-[3.9vh] min-w-[3.4vw] items-center justify-center rounded-md border px-[0.55vw] text-[1.35vw] font-black ${rankStyle(row.rank)}`}>
                                {row.rank ? `#${row.rank}` : "-"}
                            </span>
                        </div>
                        <div className="min-w-0 pr-[1vw]">
                            <p className="truncate text-[1.35vw] font-black leading-tight text-white">{row.shooterName}</p>
                            <p className="mt-[0.25vh] truncate text-[0.82vw] font-semibold text-white/42">
                                {row.categoryCode} | {row.eventTitle} | {row.academy}
                            </p>
                        </div>
                        <p className="text-right text-[1.3vw] font-black text-white/82">{row.innerTenCount}</p>
                        <p className="text-right text-[1.7vw] font-black leading-none text-[#D4AF37]">{row.displayTotal}</p>
                    </div>
                )) : (
                    <div className="flex h-[64.5vh] items-center justify-center px-[2vw] text-center">
                        <p className="text-[1.3vw] font-bold text-white/45">No scored entries yet.</p>
                    </div>
                )}
            </div>
        </section>
    )
}

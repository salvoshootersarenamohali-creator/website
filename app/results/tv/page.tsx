"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { AlertTriangle, Clock3, Loader2, Trophy } from "lucide-react"
import { PublicCompetition } from "@/lib/competition"

type ResultRow = {
    id: string
    rank: number | null
    shooterName: string
    academy: string
    studentPhotoPath: string | null
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
    competition?: PublicCompetition
    generatedAt: string
    summary: {
        entries: number
        scored: number
    }
    topStudents: TopStudentGroup[]
}

function getCompetitionSlugFromPath(pathname: string) {
    const match = pathname.match(/^\/competitions\/([^/]+)\/results\/tv\/?$/)
    return match ? decodeURIComponent(match[1]) : null
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

function shortBoardTitle(title: string) {
    return title.replace(" Top Students", "")
}

function isTopThree(rank: number | null) {
    return typeof rank === "number" && rank >= 1 && rank <= 3
}

function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")
}

function TvTopRankPhoto({ row }: { row: ResultRow }) {
    if (!isTopThree(row.rank)) return null

    const className = "inline-flex h-[clamp(36px,5.2vh,58px)] w-[clamp(36px,5.2vh,58px)] shrink-0 overflow-hidden rounded-md border border-[#D4AF37]/55 bg-[#D4AF37]/14"
    if (row.studentPhotoPath) {
        return (
            <span className={className}>
                <Image src={row.studentPhotoPath} alt={`${row.shooterName} photo`} width={96} height={96} className="h-full w-full object-cover" />
            </span>
        )
    }

    return (
        <span className={`${className} items-center justify-center text-[clamp(14px,1.2vw,22px)] font-black uppercase text-[#FFE27A]`}>
            {initials(row.shooterName)}
        </span>
    )
}

export default function TvResultsPage() {
    const pathname = usePathname()
    const competitionSlug = getCompetitionSlugFromPath(pathname)
    const [payload, setPayload] = React.useState<ResultsPayload | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [error, setError] = React.useState("")
    const [activeIndex, setActiveIndex] = React.useState(0)

    const loadResults = React.useCallback(async () => {
        try {
            if (!competitionSlug) {
                const activeResponse = await fetch("/api/competitions/active", { cache: "no-store" })
                const activeData = await readResponseJson(activeResponse)
                const activeCompetition = (activeData as { competition?: PublicCompetition }).competition
                if (activeResponse.ok && activeCompetition?.slug) {
                    window.location.replace(`/competitions/${activeCompetition.slug}/results/tv`)
                    return
                }
            }
            const response = await fetch(competitionSlug ? `/api/competitions/${competitionSlug}/results` : "/api/results", { cache: "no-store" })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to load results.")
            setPayload(data as unknown as ResultsPayload)
            setError("")
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load results.")
        } finally {
            setIsLoading(false)
        }
    }, [competitionSlug])

    React.useEffect(() => {
        loadResults()
        const timer = window.setInterval(loadResults, 15000)
        return () => window.clearInterval(timer)
    }, [loadResults])

    const groups = payload?.topStudents ?? []
    const activeGroup = groups.length ? groups[activeIndex % groups.length] : null
    const scoredPercent = payload && payload.summary.entries > 0
        ? Math.round((payload.summary.scored / payload.summary.entries) * 100)
        : 0

    React.useEffect(() => {
        if (groups.length <= 1) return
        const timer = window.setInterval(() => {
            setActiveIndex((current) => (current + 1) % groups.length)
        }, 10000)
        return () => window.clearInterval(timer)
    }, [groups.length])

    React.useEffect(() => {
        if (activeIndex >= groups.length) setActiveIndex(0)
    }, [activeIndex, groups.length])

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-black text-white">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(212,175,55,0.16),transparent_32%),radial-gradient(circle_at_84%_8%,rgba(28,100,84,0.34),transparent_30rem),radial-gradient(circle_at_12%_86%,rgba(212,175,55,0.12),transparent_28rem)]" />
            <div className="relative flex h-[100svh] min-h-[520px] flex-col px-[clamp(18px,2.2vw,42px)] py-[clamp(12px,1.7vh,24px)]">
                <header className="flex shrink-0 items-center justify-between gap-5 border-b border-white/10 pb-[clamp(10px,1.4vh,18px)]">
                    <div className="flex min-w-0 items-center gap-[clamp(12px,1.5vw,26px)]">
                        <div className="flex h-[clamp(48px,7vh,78px)] w-[clamp(138px,13vw,220px)] items-center justify-center rounded-md border border-white/10 bg-white px-3">
                            <Image src="/salvo-logo.png" alt="Salvo Shooters Arena" width={320} height={128} priority className="max-h-[clamp(36px,5.6vh,62px)] w-auto" />
                        </div>
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/12 px-[clamp(10px,0.9vw,16px)] py-1 text-[clamp(11px,0.82vw,15px)] font-black uppercase text-[#D4AF37]">
                                <Trophy className="h-[clamp(13px,0.95vw,18px)] w-[clamp(13px,0.95vw,18px)]" />
                                {payload?.competition?.shortTitle ?? "Competition"}
                            </div>
                            <h1 className="mt-1 text-[clamp(30px,3vw,58px)] font-black leading-none tracking-normal">Top 10 Results</h1>
                        </div>
                    </div>

                    <div className="grid shrink-0 grid-cols-3 gap-[clamp(8px,0.8vw,14px)] text-right">
                        <TvMetric label="Scored" value={`${scoredPercent}%`} />
                        <TvMetric label="Entries" value={payload?.summary.entries ?? 0} />
                        <TvMetric label="Updated" value={payload?.generatedAt ? formatUpdatedAt(payload.generatedAt) : "--:--"} />
                    </div>
                </header>

                {isLoading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="text-center">
                            <Loader2 className="mx-auto h-[clamp(42px,4vw,72px)] w-[clamp(42px,4vw,72px)] animate-spin text-[#D4AF37]" />
                            <p className="mt-5 text-[clamp(18px,1.6vw,30px)] font-bold text-white/60">Loading live results</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="max-w-[780px] rounded-lg border border-red-300/25 bg-red-500/10 p-[clamp(22px,2vw,40px)] text-center">
                            <AlertTriangle className="mx-auto h-[clamp(42px,4vw,72px)] w-[clamp(42px,4vw,72px)] text-red-200" />
                            <p className="mt-4 text-[clamp(26px,2.4vw,46px)] font-black text-red-100">Results unavailable</p>
                            <p className="mt-3 text-[clamp(15px,1.15vw,22px)] text-red-100/70">{error}</p>
                        </div>
                    </div>
                ) : activeGroup ? (
                    <main className="flex min-h-0 flex-1 flex-col pt-[clamp(10px,1.5vh,18px)]">
                        <div className="mb-[clamp(10px,1.2vh,16px)] flex shrink-0 items-end justify-between gap-4">
                            <div className="min-w-0">
                                <h2 className="text-[clamp(34px,3.5vw,68px)] font-black leading-none text-[#D4AF37]">{shortBoardTitle(activeGroup.title)}</h2>
                                <p className="mt-1 text-[clamp(16px,1.35vw,26px)] font-bold text-white/45">{activeGroup.rangeLabel}</p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-[clamp(13px,1vw,18px)] font-black uppercase tracking-normal text-white/35">Board</p>
                                <p className="mt-1 text-[clamp(22px,2vw,38px)] font-black text-white">{(activeIndex % groups.length) + 1}/{groups.length}</p>
                            </div>
                        </div>

                        <TvLeaderboard group={activeGroup} />

                        <div className="mt-[clamp(10px,1.2vh,16px)] flex shrink-0 items-center justify-center gap-3">
                            {groups.map((group, index) => (
                                <div
                                    key={group.title}
                                    className={`h-[clamp(7px,0.7vh,10px)] rounded-full transition-all ${index === activeIndex % groups.length ? "w-[clamp(56px,5vw,90px)] bg-[#D4AF37]" : "w-[clamp(18px,1.6vw,28px)] bg-white/18"}`}
                                    aria-label={`${shortBoardTitle(group.title)} ${index === activeIndex % groups.length ? "active" : "inactive"}`}
                                />
                            ))}
                        </div>
                    </main>
                ) : (
                    <div className="flex flex-1 items-center justify-center text-center">
                        <p className="text-[clamp(22px,2vw,38px)] font-bold text-white/45">No leaderboard data yet.</p>
                    </div>
                )}

                <footer className="mt-[clamp(8px,1vh,14px)] flex shrink-0 items-center justify-between border-t border-white/10 pt-[clamp(8px,1vh,12px)] text-[clamp(12px,0.9vw,17px)] font-bold text-white/45">
                    <span>Auto-refreshes every 15 seconds | rotates every 10 seconds</span>
                    <span className="inline-flex items-center gap-2"><Clock3 className="h-[clamp(13px,0.95vw,18px)] w-[clamp(13px,0.95vw,18px)]" /> salvoshootersarena.com/competitions/{payload?.competition?.slug ?? "competition"}/results/tv</span>
                </footer>
            </div>
        </div>
    )
}

function TvMetric({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="min-w-[clamp(78px,7.4vw,126px)] rounded-md border border-white/10 bg-white/[0.045] px-[clamp(8px,0.8vw,14px)] py-[clamp(7px,0.9vh,12px)]">
            <p className="text-[clamp(9px,0.68vw,13px)] font-black uppercase tracking-normal text-white/38">{label}</p>
            <p className="mt-1 text-[clamp(18px,1.5vw,30px)] font-black leading-none text-[#D4AF37]">{value}</p>
        </div>
    )
}

function TvLeaderboard({ group }: { group: TopStudentGroup }) {
    const rows = group.rows.slice(0, 10)

    return (
        <section className="min-h-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-neutral-950/88 shadow-2xl shadow-black/35">
            <div className="grid grid-cols-[clamp(64px,7vw,118px)_1fr_clamp(76px,8vw,130px)_clamp(100px,9vw,158px)] border-b border-white/10 px-[clamp(14px,1.3vw,24px)] py-[clamp(8px,1vh,13px)] text-[clamp(11px,0.86vw,16px)] font-black uppercase text-white/38">
                <span>Rank</span>
                <span>Student</span>
                <span className="text-right">10x</span>
                <span className="text-right">Total</span>
            </div>

            <div className="divide-y divide-white/[0.055]">
                {rows.length ? rows.map((row) => (
                    <div
                        key={row.id}
                        className="grid h-[clamp(42px,6.35vh,70px)] grid-cols-[clamp(64px,7vw,118px)_1fr_clamp(76px,8vw,130px)_clamp(100px,9vw,158px)] items-center px-[clamp(14px,1.3vw,24px)]"
                    >
                        <div>
                            <span className={`inline-flex h-[clamp(30px,4.2vh,46px)] min-w-[clamp(48px,4.7vw,78px)] items-center justify-center rounded-md border px-2 text-[clamp(16px,1.5vw,28px)] font-black ${rankStyle(row.rank)}`}>
                                {row.rank ? `#${row.rank}` : "-"}
                            </span>
                        </div>
                        <div className="flex min-w-0 items-center gap-[clamp(10px,1vw,18px)] pr-4">
                            <TvTopRankPhoto row={row} />
                            <div className="min-w-0">
                                <p className="truncate text-[clamp(18px,1.75vw,34px)] font-black leading-tight text-white">{row.shooterName}</p>
                                <p className="mt-0.5 truncate text-[clamp(11px,0.9vw,17px)] font-semibold text-white/42">
                                    {row.categoryCode} | {row.eventTitle} | {row.academy}
                                </p>
                            </div>
                        </div>
                        <p className="text-right text-[clamp(18px,1.65vw,32px)] font-black text-white/82">{row.innerTenCount}</p>
                        <p className="text-right text-[clamp(24px,2.2vw,42px)] font-black leading-none text-[#D4AF37]">{row.displayTotal}</p>
                    </div>
                )) : (
                    <div className="flex h-full min-h-[300px] items-center justify-center px-8 text-center">
                        <p className="text-[clamp(22px,2vw,38px)] font-bold text-white/45">No scored entries yet.</p>
                    </div>
                )}
            </div>
        </section>
    )
}

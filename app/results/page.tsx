"use client"

import * as React from "react"
import { AlertCircle, BarChart3, CheckCircle2, Clock3, Loader2, Medal, RefreshCw, Search, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

type ResultRow = {
    id: string
    rank: number | null
    shooterName: string
    academy: string
    eventId: string
    eventTitle: string
    categoryCode: string
    categoryLabel: string
    ruleSet: "NR" | "ISSF"
    scored: boolean
    seriesScores: number[]
    innerTenCount: number
    totalScore: number | null
    displayTotal: string
}

type ResultCategory = {
    code: string
    label: string
    entryCount: number
    scoredCount: number
    rows: ResultRow[]
}

type ResultsPayload = {
    generatedAt: string
    summary: {
        categories: number
        entries: number
        scored: number
    }
    categories: ResultCategory[]
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
    if (Number.isNaN(date.getTime())) return "just now"
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

function rankClass(rank: number | null) {
    if (rank === 1) return "border-[#D4AF37]/60 bg-[#D4AF37]/12 text-[#F4D76A]"
    if (rank === 2) return "border-slate-300/45 bg-slate-300/10 text-slate-100"
    if (rank === 3) return "border-amber-700/55 bg-amber-700/14 text-amber-200"
    return "border-white/10 bg-white/[0.04] text-white/80"
}

function rankLabel(rank: number | null) {
    return rank ? `#${rank}` : "-"
}

function topRankIcon(rank: number | null) {
    if (!rank || rank > 3) return null
    return <Medal className="h-4 w-4" />
}

function seriesLabel(row: ResultRow, index: number) {
    const score = row.seriesScores[index]
    if (typeof score !== "number") return "-"
    return row.ruleSet === "NR" ? score.toFixed(0) : score.toFixed(1)
}

export default function ResultsPage() {
    const [payload, setPayload] = React.useState<ResultsPayload | null>(null)
    const [query, setQuery] = React.useState("")
    const [selectedCategory, setSelectedCategory] = React.useState("all")
    const [isLoading, setIsLoading] = React.useState(true)
    const [isRefreshing, setIsRefreshing] = React.useState(false)
    const [error, setError] = React.useState("")

    const loadResults = React.useCallback(async (isBackground = false) => {
        if (isBackground) setIsRefreshing(true)
        else setIsLoading(true)
        setError("")

        try {
            const response = await fetch("/api/results", { cache: "no-store" })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to load results.")
            setPayload(data as unknown as ResultsPayload)
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load results.")
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }, [])

    React.useEffect(() => {
        loadResults()
        const timer = window.setInterval(() => loadResults(true), 30000)
        return () => window.clearInterval(timer)
    }, [loadResults])

    const categories = React.useMemo(() => payload?.categories ?? [], [payload])
    const visibleCategories = React.useMemo(() => {
        const text = query.trim().toLowerCase()
        return categories
            .filter((category) => selectedCategory === "all" || category.code === selectedCategory)
            .map((category) => ({
                ...category,
                rows: text
                    ? category.rows.filter((row) => {
                        const haystack = `${row.shooterName} ${row.academy} ${row.eventTitle} ${row.categoryCode} ${row.categoryLabel}`.toLowerCase()
                        return haystack.includes(text)
                    })
                    : category.rows,
            }))
            .filter((category) => category.rows.length > 0 || !text)
    }, [categories, query, selectedCategory])

    const scoredPercent = payload && payload.summary.entries > 0
        ? Math.round((payload.summary.scored / payload.summary.entries) * 100)
        : 0

    return (
        <div className="min-h-screen bg-black text-white">
            <section className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(212,175,55,0.16),transparent_36%),radial-gradient(circle_at_80%_12%,rgba(24,91,78,0.28),transparent_30rem)] px-4 py-10 sm:py-12">
                <div className="container mx-auto">
                    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
                        <div>
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
                                <Trophy className="h-3.5 w-3.5" />
                                36th Salvo Cup
                            </div>
                            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                                Live Results
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
                                View your uploaded score and follow your category ranking as the scoreboard updates during the event.
                            </p>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/55 p-5 shadow-2xl shadow-black/30">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">Live status</p>
                                    <p className="mt-1 flex items-center gap-2 font-bold text-emerald-200">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Auto-refreshing
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => loadResults(true)}
                                    disabled={isRefreshing}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white transition hover:border-[#D4AF37]/60 hover:text-[#D4AF37] disabled:opacity-60"
                                    aria-label="Refresh results"
                                >
                                    {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <SummaryStat label="Categories" value={payload?.summary.categories ?? 0} />
                                <SummaryStat label="Entries" value={payload?.summary.entries ?? 0} />
                                <SummaryStat label="Scored" value={`${scoredPercent}%`} />
                            </div>
                            {payload?.generatedAt && (
                                <p className="mt-4 flex items-center gap-2 text-xs text-white/45">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    Last updated {formatUpdatedAt(payload.generatedAt)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-6">
                <div className="container mx-auto">
                    <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_280px]">
                        <label className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                className="field h-12 pl-10"
                                placeholder="Search shooter, academy, event, or category"
                            />
                        </label>
                        <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="field h-12">
                            <option value="all">All categories</option>
                            {categories.map((category) => (
                                <option key={category.code} value={category.code}>{category.code} - {category.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-7 flex gap-2 overflow-x-auto pb-1">
                        <button
                            type="button"
                            onClick={() => setSelectedCategory("all")}
                            className={cn(
                                "shrink-0 rounded-md border px-3 py-2 text-left text-sm transition",
                                selectedCategory === "all" ? "border-[#D4AF37] bg-[#D4AF37] text-black" : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/30"
                            )}
                        >
                            <span className="block font-bold">All</span>
                            <span className="block text-xs opacity-75">{payload?.summary.entries ?? 0} entries</span>
                        </button>
                        {categories.map((category) => (
                            <button
                                key={category.code}
                                type="button"
                                onClick={() => setSelectedCategory(category.code)}
                                className={cn(
                                    "max-w-64 shrink-0 rounded-md border px-3 py-2 text-left text-sm transition",
                                    selectedCategory === category.code ? "border-[#D4AF37] bg-[#D4AF37] text-black" : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/30"
                                )}
                            >
                                <span className="block font-bold">{category.code}</span>
                                <span className="block truncate text-xs opacity-75">{category.scoredCount}/{category.entryCount} scored</span>
                            </button>
                        ))}
                    </div>

                    {isLoading ? (
                        <div className="flex min-h-72 items-center justify-center rounded-lg border border-white/10 bg-neutral-950">
                            <div className="text-center">
                                <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#D4AF37]" />
                                <p className="mt-3 text-sm text-white/55">Loading live results...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-red-400/25 bg-red-500/10 p-6 text-red-100">
                            <AlertCircle className="mb-3 h-6 w-6" />
                            <p className="font-bold">Results are unavailable right now.</p>
                            <p className="mt-1 text-sm text-red-100/75">{error}</p>
                        </div>
                    ) : visibleCategories.length ? (
                        <div className="space-y-6">
                            {visibleCategories.map((category) => (
                                <CategoryResults key={category.code} category={category} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-white/10 bg-neutral-950 p-8 text-center">
                            <BarChart3 className="mx-auto h-8 w-8 text-white/35" />
                            <p className="mt-3 font-bold">No matching results found.</p>
                            <p className="mt-1 text-sm text-white/50">Try another name, academy, event, or category.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}

function SummaryStat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">{label}</p>
            <p className="mt-1 text-lg font-black text-[#D4AF37]">{value}</p>
        </div>
    )
}

function CategoryResults({ category }: { category: ResultCategory }) {
    return (
        <section className="overflow-hidden rounded-lg border border-white/10 bg-neutral-950">
            <div className="border-b border-white/10 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black text-[#D4AF37] sm:text-xl">{category.code} - {category.label}</h2>
                        <p className="mt-1 text-sm text-white/45">{category.scoredCount} scored of {category.entryCount} entries</p>
                    </div>
                    <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">Progress</p>
                        <p className="mt-1 font-black">{category.entryCount ? Math.round((category.scoredCount / category.entryCount) * 100) : 0}%</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 p-3 md:hidden">
                {category.rows.map((row) => (
                    <MobileResultCard key={row.id} row={row} />
                ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[920px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.16em] text-white/40">
                        <tr className="border-b border-white/10">
                            <th className="px-4 py-3">Rank</th>
                            <th className="px-4 py-3">Shooter</th>
                            <th className="px-4 py-3">Academy/Range</th>
                            <th className="px-4 py-3">Event</th>
                            <th className="px-4 py-3">Series</th>
                            <th className="px-4 py-3 text-right">10x</th>
                            <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {category.rows.map((row) => (
                            <tr key={row.id} className="border-b border-white/5 last:border-0">
                                <td className="px-4 py-3">
                                    <RankPill rank={row.rank} />
                                </td>
                                <td className="px-4 py-3 font-bold">{row.shooterName}</td>
                                <td className="px-4 py-3 text-white/65">{row.academy}</td>
                                <td className="px-4 py-3 text-white/65">{row.eventTitle}</td>
                                <td className="px-4 py-3">
                                    <SeriesStrip row={row} />
                                </td>
                                <td className="px-4 py-3 text-right font-bold">{row.scored ? row.innerTenCount : "-"}</td>
                                <td className="px-4 py-3 text-right text-lg font-black text-[#D4AF37]">{row.scored ? row.displayTotal : "-"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

function MobileResultCard({ row }: { row: ResultRow }) {
    return (
        <article className="rounded-md border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="break-words font-black">{row.shooterName}</p>
                    <p className="mt-1 break-words text-sm text-white/55">{row.academy}</p>
                </div>
                <RankPill rank={row.rank} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
                <MiniMetric label="Total" value={row.scored ? row.displayTotal : "-"} strong />
                <MiniMetric label="10x" value={row.scored ? row.innerTenCount : "-"} />
                <MiniMetric label="Status" value={row.scored ? "Scored" : "Pending"} />
            </div>

            <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-white/35">{row.eventTitle}</p>
                <SeriesStrip row={row} />
            </div>
        </article>
    )
}

function RankPill({ rank }: { rank: number | null }) {
    return (
        <span className={cn("inline-flex h-9 min-w-12 items-center justify-center gap-1 rounded-md border px-2 text-sm font-black", rankClass(rank))}>
            {topRankIcon(rank)}
            {rankLabel(rank)}
        </span>
    )
}

function MiniMetric({ label, value, strong }: { label: string; value: string | number; strong?: boolean }) {
    return (
        <div className="rounded-md border border-white/10 bg-black/25 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{label}</p>
            <p className={cn("mt-1 font-bold", strong && "text-[#D4AF37]")}>{value}</p>
        </div>
    )
}

function SeriesStrip({ row }: { row: ResultRow }) {
    if (!row.scored) return <p className="text-sm text-white/40">Score pending</p>

    return (
        <div className="flex max-w-full flex-wrap gap-1.5">
            {row.seriesScores.map((_, index) => (
                <span key={index} className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs font-semibold text-white/70">
                    S{index + 1}: {seriesLabel(row, index)}
                </span>
            ))}
        </div>
    )
}

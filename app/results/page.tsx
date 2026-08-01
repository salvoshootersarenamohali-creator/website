"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { AlertCircle, Award, BarChart3, CheckCircle2, Clock3, Download, Loader2, LockKeyhole, Medal, RefreshCw, Search, Trophy, Users } from "lucide-react"
import { getCompetitionEndBoundary, hasCompetitionEnded, PublicCompetition } from "@/lib/competition"
import type { MedalType, ParticipantCategory } from "@/lib/participants"
import { cn } from "@/lib/utils"

type ResultsTab = "regular" | "para" | "certificates"

type ResultRow = {
    id: string
    rank: number | null
    shooterName: string
    academy: string
    studentPhotoPath: string | null
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
    isPara: boolean
}

type ResultCategory = {
    code: string
    label: string
    entryCount: number
    scoredCount: number
    rows: ResultRow[]
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
        categories: number
        entries: number
        scored: number
        paraCategories: number
        paraEntries: number
        paraScored: number
    }
    categories: ResultCategory[]
    paraCategories: ResultCategory[]
    topStudents: TopStudentGroup[]
}

type CertificateDirectoryPayload = {
    competition: PublicCompetition
    generatedAt: string
    summary: {
        participants: number
        categories: number
        regularCategories: number
        paraCategories: number
    }
    categories: ParticipantCategory[]
    regularCategories: ParticipantCategory[]
    paraCategories: ParticipantCategory[]
}

function getCompetitionSlugFromPath(pathname: string) {
    const match = pathname.match(/^\/competitions\/([^/]+)\/results\/?$/)
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

function isTopThree(rank: number | null) {
    return typeof rank === "number" && rank >= 1 && rank <= 3
}

function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")
}

function TopRankPhoto({ row, size = "md" }: { row: ResultRow; size?: "sm" | "md" | "lg" }) {
    if (!isTopThree(row.rank)) return null

    const sizeClass = size === "lg" ? "h-16 w-16 text-lg" : size === "sm" ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm"
    const className = `${sizeClass} inline-flex shrink-0 overflow-hidden rounded-md border border-[#D4AF37]/45 bg-[#D4AF37]/12`

    if (row.studentPhotoPath) {
        return (
            <span className={className}>
                <Image src={row.studentPhotoPath} alt={`${row.shooterName} photo`} width={80} height={80} className="h-full w-full object-cover" />
            </span>
        )
    }

    return (
        <span className={`${className} inline-flex items-center justify-center font-black uppercase text-[#F4D76A]`}>
            {initials(row.shooterName)}
        </span>
    )
}

function StudentNameCell({ row, photoSize = "md" }: { row: ResultRow; photoSize?: "sm" | "md" | "lg" }) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <TopRankPhoto row={row} size={photoSize} />
            <span className="min-w-0 break-words font-bold">{row.shooterName}</span>
        </div>
    )
}

function seriesLabel(row: ResultRow, index: number) {
    const score = row.seriesScores[index]
    if (typeof score !== "number") return "-"
    return row.ruleSet === "NR" ? score.toFixed(0) : score.toFixed(1)
}

export default function ResultsPage() {
    const pathname = usePathname()
    const competitionSlug = getCompetitionSlugFromPath(pathname)
    const [payload, setPayload] = React.useState<ResultsPayload | null>(null)
    const [competition, setCompetition] = React.useState<PublicCompetition | null>(null)
    const [query, setQuery] = React.useState("")
    const [selectedCategory, setSelectedCategory] = React.useState("all")
    const [activeTab, setActiveTab] = React.useState<ResultsTab>("regular")
    const [isLoading, setIsLoading] = React.useState(true)
    const [isRefreshing, setIsRefreshing] = React.useState(false)
    const [error, setError] = React.useState("")
    const [certificatePayload, setCertificatePayload] = React.useState<CertificateDirectoryPayload | null>(null)
    const [certificateQuery, setCertificateQuery] = React.useState("")
    const [certificateCategory, setCertificateCategory] = React.useState("all")
    const [certificatesLoading, setCertificatesLoading] = React.useState(false)
    const [certificatesError, setCertificatesError] = React.useState("")

    const loadResults = React.useCallback(async (isBackground = false) => {
        if (isBackground) setIsRefreshing(true)
        else setIsLoading(true)
        setError("")

        try {
            if (!competitionSlug) {
                const activeResponse = await fetch("/api/competitions/active", { cache: "no-store" })
                const activeData = await readResponseJson(activeResponse)
                const activeCompetition = (activeData as { competition?: PublicCompetition }).competition
                if (activeResponse.ok && activeCompetition?.slug) {
                    window.location.replace(`/competitions/${activeCompetition.slug}/results`)
                    return
                }
            } else if (!isBackground) {
                const competitionResponse = await fetch(`/api/competitions/${competitionSlug}`, { cache: "no-store" })
                const competitionData = await readResponseJson(competitionResponse)
                const scopedCompetition = (competitionData as { competition?: PublicCompetition }).competition
                if (competitionResponse.ok && scopedCompetition) setCompetition(scopedCompetition)
            }
            const response = await fetch(competitionSlug ? `/api/competitions/${competitionSlug}/results` : "/api/results", { cache: "no-store" })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to load results.")
            const nextPayload = data as unknown as ResultsPayload
            setPayload(nextPayload)
            if (nextPayload.competition) setCompetition(nextPayload.competition)
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load results.")
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }, [competitionSlug])

    const certificatesAvailable = competition ? hasCompetitionEnded(competition.endDate) : false
    const certificateUnlockLabel = React.useMemo(() => {
        const boundary = competition ? getCompetitionEndBoundary(competition.endDate) : null
        if (!boundary) return "Available after the competition ends"
        return `Available ${boundary.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`
    }, [competition])

    const loadCertificates = React.useCallback(async () => {
        if (!competitionSlug || !certificatesAvailable || certificatePayload || certificatesLoading) return
        setCertificatesLoading(true)
        setCertificatesError("")
        try {
            const response = await fetch(`/api/competitions/${competitionSlug}/participants`, { cache: "no-store" })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to load participants.")
            setCertificatePayload(data as unknown as CertificateDirectoryPayload)
        } catch (loadError) {
            setCertificatesError(loadError instanceof Error ? loadError.message : "Unable to load participants.")
        } finally {
            setCertificatesLoading(false)
        }
    }, [certificatePayload, certificatesAvailable, certificatesLoading, competitionSlug])

    React.useEffect(() => {
        loadResults()
        const timer = window.setInterval(() => loadResults(true), 30000)
        return () => window.clearInterval(timer)
    }, [loadResults])

    React.useEffect(() => {
        if (activeTab === "certificates") loadCertificates()
    }, [activeTab, loadCertificates])

    const categories = React.useMemo(
        () => activeTab === "para" ? payload?.paraCategories ?? [] : payload?.categories ?? [],
        [activeTab, payload]
    )
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
    const topStudents = React.useMemo(() => payload?.topStudents ?? [], [payload])
    const activeSummary = React.useMemo(() => {
        if (!payload) return { categories: 0, entries: 0, scored: 0 }
        return activeTab === "para"
            ? { categories: payload.summary.paraCategories, entries: payload.summary.paraEntries, scored: payload.summary.paraScored }
            : { categories: payload.summary.categories, entries: payload.summary.entries, scored: payload.summary.scored }
    }, [activeTab, payload])

    React.useEffect(() => {
        setSelectedCategory("all")
    }, [activeTab])

    const scoredPercent = activeSummary.entries > 0
        ? Math.round((activeSummary.scored / activeSummary.entries) * 100)
        : 0
    const certificateSummary = certificatePayload?.summary

    return (
        <div className="min-h-screen bg-black text-white">
            <section className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(212,175,55,0.16),transparent_36%),radial-gradient(circle_at_80%_12%,rgba(24,91,78,0.28),transparent_30rem)] px-4 py-10 sm:py-12">
                <div className="container mx-auto">
                    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
                        <div>
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
                                <Trophy className="h-3.5 w-3.5" />
                                {competition?.shortTitle ?? "Competition"}
                            </div>
                            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                                {activeTab === "certificates" ? "Participants & Certificates" : "Live Results"}
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
                                {activeTab === "certificates"
                                    ? "Find your name in the final participant directory and download your official Salvo certificate."
                                    : "View your uploaded score and follow your category ranking as the scoreboard updates during the event."}
                            </p>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/55 p-5 shadow-2xl shadow-black/30">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">{activeTab === "certificates" ? "Certificate status" : "Live status"}</p>
                                    <p className="mt-1 flex items-center gap-2 font-bold text-emerald-200">
                                        {activeTab === "certificates" ? <Award className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                        {activeTab === "certificates" ? "Final directory" : "Auto-refreshing"}
                                    </p>
                                </div>
                                {activeTab === "certificates" ? (
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#D4AF37]">
                                        <Award className="h-4 w-4" />
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => loadResults(true)}
                                        disabled={isRefreshing}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white transition hover:border-[#D4AF37]/60 hover:text-[#D4AF37] disabled:opacity-60"
                                        aria-label="Refresh results"
                                    >
                                        {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {activeTab === "certificates" ? (
                                    <>
                                        <SummaryStat label="Participants" value={certificateSummary?.participants ?? "-"} />
                                        <SummaryStat label="Categories" value={certificateSummary?.categories ?? "-"} />
                                        <SummaryStat label="Status" value="Ready" />
                                    </>
                                ) : (
                                    <>
                                        <SummaryStat label="Categories" value={activeSummary.categories} />
                                        <SummaryStat label="Entries" value={activeSummary.entries} />
                                        <SummaryStat label="Scored" value={`${scoredPercent}%`} />
                                    </>
                                )}
                            </div>
                            {(activeTab === "certificates" ? certificatePayload?.generatedAt : payload?.generatedAt) && (
                                <p className="mt-4 flex items-center gap-2 text-xs text-white/45">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    Last updated {formatUpdatedAt((activeTab === "certificates" ? certificatePayload?.generatedAt : payload?.generatedAt) as string)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-6">
                <div className="container mx-auto">
                    <div className="mb-2 flex max-w-full overflow-x-auto rounded-lg border border-white/10 bg-neutral-950 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:inline-flex">
                        <ResultsTabButton
                            active={activeTab === "regular"}
                            label="Results"
                            count={payload?.summary.entries ?? 0}
                            onClick={() => setActiveTab("regular")}
                        />
                        <ResultsTabButton
                            active={activeTab === "para"}
                            label="Para Results"
                            count={payload?.summary.paraEntries ?? 0}
                            onClick={() => setActiveTab("para")}
                        />
                        <ResultsTabButton
                            active={activeTab === "certificates"}
                            label="Certificates"
                            count={certificatePayload?.summary.participants}
                            disabled={!certificatesAvailable}
                            title={certificatesAvailable ? "View participants and download certificates" : certificateUnlockLabel}
                            icon={certificatesAvailable ? <Award className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                            onClick={() => setActiveTab("certificates")}
                        />
                    </div>
                    {!certificatesAvailable && (
                        <p className="mb-5 flex items-center gap-2 text-xs font-semibold text-white/45">
                            <LockKeyhole className="h-3.5 w-3.5" />
                            Certificates unlock automatically after the competition ends. {certificateUnlockLabel}.
                        </p>
                    )}

                    {activeTab === "certificates" ? (
                        <CertificatesExperience
                            payload={certificatePayload}
                            query={certificateQuery}
                            selectedCategory={certificateCategory}
                            isLoading={certificatesLoading}
                            error={certificatesError}
                            onQueryChange={setCertificateQuery}
                            onCategoryChange={setCertificateCategory}
                            onRetry={loadCertificates}
                        />
                    ) : (
                        <>
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
                                    <span className="block text-xs opacity-75">{activeSummary.entries} entries</span>
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
                            ) : (
                                <div className="space-y-6">
                                    {activeTab === "regular" && <TopStudentsSection groups={topStudents} />}
                                    {visibleCategories.length ? (
                                        visibleCategories.map((category) => (
                                            <CategoryResults key={category.code} category={category} />
                                        ))
                                    ) : (
                                        <div className="rounded-lg border border-white/10 bg-neutral-950 p-8 text-center">
                                            <BarChart3 className="mx-auto h-8 w-8 text-white/35" />
                                            <p className="mt-3 font-bold">{activeTab === "para" && !categories.length ? "No para results available yet." : "No matching results found."}</p>
                                            <p className="mt-1 text-sm text-white/50">
                                                {activeTab === "para" && !categories.length ? "Para entries will appear here once they are marked and scored." : "Try another name, academy, event, or category."}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>
        </div>
    )
}

function ResultsTabButton({
    active,
    label,
    count,
    disabled = false,
    icon,
    onClick,
    title,
}: {
    active: boolean
    label: string
    count?: number
    disabled?: boolean
    icon?: React.ReactNode
    onClick: () => void
    title?: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={cn(
                "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md px-4 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                active ? "bg-[#D4AF37] text-black" : "text-white/65 hover:bg-white/[0.06] hover:text-white",
                disabled && "cursor-not-allowed border border-white/5 bg-white/[0.02] text-white/30 hover:bg-white/[0.02] hover:text-white/30"
            )}
        >
            {icon}
            {label}
            {typeof count === "number" && <span className="font-semibold opacity-75">({count})</span>}
        </button>
    )
}

function CertificatesExperience({
    payload,
    query,
    selectedCategory,
    isLoading,
    error,
    onQueryChange,
    onCategoryChange,
    onRetry,
}: {
    payload: CertificateDirectoryPayload | null
    query: string
    selectedCategory: string
    isLoading: boolean
    error: string
    onQueryChange: (value: string) => void
    onCategoryChange: (value: string) => void
    onRetry: () => void
}) {
    const filterCategories = React.useCallback((categories: ParticipantCategory[]) => {
        const searchText = query.trim().toLocaleLowerCase("en-IN")
        return categories
            .filter((category) => selectedCategory === "all" || category.key === selectedCategory)
            .map((category) => ({
                ...category,
                participants: searchText
                    ? category.participants.filter((participant) => participant.shooterName.toLocaleLowerCase("en-IN").includes(searchText))
                    : category.participants,
            }))
            .filter((category) => category.participants.length > 0)
    }, [query, selectedCategory])

    const regularCategories = React.useMemo(() => filterCategories(payload?.regularCategories ?? []), [filterCategories, payload])
    const paraCategories = React.useMemo(() => filterCategories(payload?.paraCategories ?? []), [filterCategories, payload])
    const visibleCount = [...regularCategories, ...paraCategories].reduce((total, category) => total + category.participants.length, 0)

    if (isLoading) {
        return (
            <div className="flex min-h-72 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.08),transparent_22rem),#080808]">
                <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#D4AF37]" />
                    <p className="mt-3 font-bold">Preparing the participant directory...</p>
                    <p className="mt-1 text-sm text-white/45">Checking final categories and certificate eligibility.</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-6 text-red-100">
                <AlertCircle className="mb-3 h-6 w-6" />
                <p className="font-black">Certificates are unavailable right now.</p>
                <p className="mt-1 text-sm text-red-100/75">{error}</p>
                <button type="button" onClick={onRetry} className="mt-4 inline-flex h-11 items-center justify-center rounded-md border border-red-200/30 px-4 font-bold transition hover:bg-red-200/10">
                    Try again
                </button>
            </div>
        )
    }

    if (!payload) return null

    return (
        <div>
            <section className="mb-6 overflow-hidden rounded-xl border border-[#D4AF37]/25 bg-[linear-gradient(135deg,rgba(212,175,55,0.15),rgba(9,49,42,0.2),rgba(255,255,255,0.025))] p-5 sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/35 bg-black/25 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#E5C558]">
                            <Award className="h-3.5 w-3.5" />
                            Official certificates
                        </div>
                        <h2 className="mt-3 text-2xl font-black sm:text-3xl">Find your name. Download your achievement.</h2>
                        <p className="mt-2 text-sm leading-relaxed text-white/60 sm:text-base">
                            Participants are listed in every scored category. Medal winners receive an achievement certificate; all other eligible shooters receive a participation certificate.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:min-w-[300px]">
                        <DirectoryStat icon={<Users className="h-4 w-4" />} label="Participants" value={payload.summary.participants} />
                        <DirectoryStat icon={<Trophy className="h-4 w-4" />} label="Categories" value={payload.summary.categories} />
                    </div>
                </div>
            </section>

            <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_320px]">
                <label className="relative">
                    <span className="sr-only">Search participant name</span>
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <input
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        className="field h-12 pl-10"
                        placeholder="Search your name"
                        autoComplete="off"
                    />
                </label>
                <label>
                    <span className="sr-only">Filter certificate category</span>
                    <select value={selectedCategory} onChange={(event) => onCategoryChange(event.target.value)} className="field h-12">
                        <option value="all">All certificate categories</option>
                        {payload.categories.map((category) => (
                            <option key={category.key} value={category.key}>
                                {category.isPara ? "Para - " : ""}{category.code} - {category.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="mb-7 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Certificate category shortcuts">
                <button
                    type="button"
                    onClick={() => onCategoryChange("all")}
                    className={cn(
                        "shrink-0 rounded-md border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]",
                        selectedCategory === "all" ? "border-[#D4AF37] bg-[#D4AF37] text-black" : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/30"
                    )}
                >
                    <span className="block font-black">All categories</span>
                    <span className="block text-xs opacity-75">{payload.summary.participants} unique participants</span>
                </button>
                {payload.categories.map((category) => (
                    <button
                        key={category.key}
                        type="button"
                        onClick={() => onCategoryChange(category.key)}
                        className={cn(
                            "max-w-64 shrink-0 rounded-md border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]",
                            selectedCategory === category.key ? "border-[#D4AF37] bg-[#D4AF37] text-black" : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/30"
                        )}
                    >
                        <span className="block font-black">{category.isPara ? "Para - " : ""}{category.code}</span>
                        <span className="block truncate text-xs opacity-75">{category.participantCount} {category.participantCount === 1 ? "participant" : "participants"}</span>
                    </button>
                ))}
            </div>

            {visibleCount ? (
                <div className="space-y-8">
                    {regularCategories.length > 0 && (
                        <DirectoryGroup title="Regular Categories" description="Final scored entries organized by competition category." categories={regularCategories} />
                    )}
                    {paraCategories.length > 0 && (
                        <DirectoryGroup title="Para Categories" description="Final para entries with independent category rankings." categories={paraCategories} para />
                    )}
                </div>
            ) : (
                <div className="rounded-xl border border-white/10 bg-neutral-950 p-10 text-center">
                    <Users className="mx-auto h-9 w-9 text-white/30" />
                    <p className="mt-4 text-lg font-black">{payload.summary.participants ? "No matching participant found." : "No certificates are available yet."}</p>
                    <p className="mt-2 text-sm text-white/50">
                        {payload.summary.participants ? "Check the spelling or choose another category." : "A participant appears here after at least one complete score is uploaded."}
                    </p>
                </div>
            )}
        </div>
    )
}

function DirectoryStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="rounded-lg border border-white/10 bg-black/30 p-4">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{icon}{label}</p>
            <p className="mt-2 text-2xl font-black text-[#E5C558]">{value}</p>
        </div>
    )
}

function DirectoryGroup({ title, description, categories, para = false }: { title: string; description: string; categories: ParticipantCategory[]; para?: boolean }) {
    return (
        <section>
            <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                    <p className={cn("text-xs font-black uppercase tracking-[0.18em]", para ? "text-cyan-200" : "text-[#D4AF37]")}>{title}</p>
                    <p className="mt-1 text-sm text-white/45">{description}</p>
                </div>
                <span className="shrink-0 text-xs font-bold text-white/35">{categories.length} {categories.length === 1 ? "category" : "categories"}</span>
            </div>
            <div className="space-y-5">
                {categories.map((category) => <ParticipantCategorySection key={category.key} category={category} />)}
            </div>
        </section>
    )
}

function ParticipantCategorySection({ category }: { category: ParticipantCategory }) {
    return (
        <section className="overflow-hidden rounded-xl border border-white/10 bg-neutral-950 shadow-xl shadow-black/10">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        {category.isPara && <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">Para</span>}
                        <h3 className="text-lg font-black text-[#E5C558] sm:text-xl">{category.code} - {category.label}</h3>
                    </div>
                    <p className="mt-1 text-sm text-white/45">{category.participants.length} certificate-ready {category.participants.length === 1 ? "participant" : "participants"}</p>
                </div>
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/55">Alphabetical list</span>
            </div>

            <div className="grid gap-3 p-3 md:hidden">
                {category.participants.map((participant) => (
                    <article key={`${category.key}:${participant.registrationId}`} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="break-words font-black">{participant.shooterName}</p>
                                <p className="mt-1 break-words text-sm text-white/50">{participant.academy}</p>
                            </div>
                            <MedalBadge medal={participant.categoryEntry.medal} position={participant.categoryEntry.positionLabel} />
                        </div>
                        <p className="mt-4 text-xs leading-relaxed text-white/45">{participant.categoryEntry.eventTitle} - {participant.entries.length} scored {participant.entries.length === 1 ? "category" : "categories"}</p>
                        <CertificateDownloadButton url={participant.certificateUrl} participantName={participant.shooterName} fullWidth />
                    </article>
                ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.15em] text-white/35">
                        <tr className="border-b border-white/10">
                            <th className="px-5 py-3">Participant</th>
                            <th className="px-5 py-3">Academy/Range</th>
                            <th className="px-5 py-3">Recognition</th>
                            <th className="px-5 py-3">Certificate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {category.participants.map((participant) => (
                            <tr key={`${category.key}:${participant.registrationId}`} className="border-b border-white/5 last:border-0 hover:bg-white/[0.025]">
                                <td className="px-5 py-4">
                                    <p className="font-black">{participant.shooterName}</p>
                                    <p className="mt-1 text-xs text-white/40">{participant.entries.length} scored {participant.entries.length === 1 ? "category" : "categories"}</p>
                                </td>
                                <td className="px-5 py-4 text-white/60">{participant.academy}</td>
                                <td className="px-5 py-4"><MedalBadge medal={participant.categoryEntry.medal} position={participant.categoryEntry.positionLabel} /></td>
                                <td className="px-5 py-4"><CertificateDownloadButton url={participant.certificateUrl} participantName={participant.shooterName} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

function MedalBadge({ medal, position }: { medal: MedalType | null; position: string }) {
    const label = medal ? `${medal[0].toUpperCase()}${medal.slice(1)} / ${position}` : "Participant"
    return (
        <span className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black",
            medal === "gold" && "border-[#D4AF37]/45 bg-[#D4AF37]/12 text-[#F4D76A]",
            medal === "silver" && "border-slate-300/35 bg-slate-300/10 text-slate-100",
            medal === "bronze" && "border-amber-700/45 bg-amber-700/14 text-amber-200",
            !medal && "border-emerald-300/20 bg-emerald-400/[0.07] text-emerald-100"
        )}>
            {medal ? <Medal className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {label}
        </span>
    )
}

function CertificateDownloadButton({ url, participantName, fullWidth = false }: { url: string; participantName: string; fullWidth?: boolean }) {
    const [isDownloading, setIsDownloading] = React.useState(false)
    const [downloadError, setDownloadError] = React.useState("")

    const downloadCertificate = async () => {
        setIsDownloading(true)
        setDownloadError("")
        try {
            const response = await fetch(url, { cache: "no-store" })
            if (!response.ok) {
                const data = await readResponseJson(response)
                throw new Error(typeof data.error === "string" ? data.error : "Unable to download certificate.")
            }
            const blob = await response.blob()
            const objectUrl = window.URL.createObjectURL(blob)
            const disposition = response.headers.get("content-disposition") ?? ""
            const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "salvo-certificate.pdf"
            const link = document.createElement("a")
            link.href = objectUrl
            link.download = filename
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(objectUrl)
        } catch (error) {
            setDownloadError(error instanceof Error ? error.message : "Unable to download certificate.")
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <div className={cn(fullWidth && "mt-4 w-full")}>
            <button
                type="button"
                onClick={downloadCertificate}
                disabled={isDownloading}
                className={cn(
                    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#D4AF37] px-4 text-sm font-black text-black transition hover:bg-[#E5C558] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4D76A] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-wait disabled:opacity-60",
                    fullWidth && "w-full"
                )}
                aria-label={`Download ${participantName}'s certificate as PDF`}
            >
                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isDownloading ? "Preparing PDF..." : "Download PDF"}
            </button>
            {downloadError && <p role="alert" className="mt-2 max-w-64 text-xs text-red-200">{downloadError}</p>}
        </div>
    )
}

function TopStudentsSection({ groups }: { groups: TopStudentGroup[] }) {
    if (!groups.length) return null

    return (
        <section className="rounded-lg border border-[#D4AF37]/25 bg-[linear-gradient(135deg,rgba(212,175,55,0.12),rgba(255,255,255,0.025))] p-4 sm:p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                        <Trophy className="h-3.5 w-3.5" />
                        Top Students
                    </div>
                    <h2 className="mt-3 text-2xl font-black">Combined Leaderboards</h2>
                    <p className="mt-1 text-sm text-white/55">Highest scored students across the combined pistol and rifle category ranges.</p>
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                {groups.map((group) => (
                    <TopStudentsPanel key={group.title} group={group} />
                ))}
            </div>
        </section>
    )
}

function TopStudentsPanel({ group }: { group: TopStudentGroup }) {
    const topRows = group.rows.slice(0, 10)

    return (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/35">
            <div className="border-b border-white/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="font-black text-[#D4AF37]">{group.title}</h3>
                        <p className="mt-1 text-xs text-white/45">{group.rangeLabel}</p>
                    </div>
                    <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">Scored</p>
                        <p className="mt-1 font-black">{group.rows.length}</p>
                    </div>
                </div>
            </div>

            {topRows.length ? (
                <div>
                    <div className="grid gap-3 p-3 md:hidden">
                        {topRows.map((row) => (
                            <MobileResultCard key={row.id} row={row} />
                        ))}
                    </div>
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="text-xs uppercase tracking-[0.16em] text-white/40">
                                <tr className="border-b border-white/10">
                                    <th className="px-4 py-3">Rank</th>
                                    <th className="px-4 py-3">Student</th>
                                    <th className="px-4 py-3">Academy/Range</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3 text-right">10x</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topRows.map((row) => (
                                    <tr key={row.id} className="border-b border-white/5 last:border-0">
                                        <td className="px-4 py-3"><RankPill rank={row.rank} /></td>
                                        <td className="px-4 py-3"><StudentNameCell row={row} photoSize="sm" /></td>
                                        <td className="px-4 py-3 text-white/65">{row.academy}</td>
                                        <td className="px-4 py-3 text-white/65">
                                            <span className="font-bold text-white/85">{row.categoryCode}</span>
                                            <span className="ml-2">{row.eventTitle}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold">{row.innerTenCount}</td>
                                        <td className="px-4 py-3 text-right text-lg font-black text-[#D4AF37]">{row.displayTotal}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <p className="p-6 text-sm text-white/50">No scored entries found for this combined category range.</p>
            )}
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
                                <td className="px-4 py-3"><StudentNameCell row={row} photoSize="sm" /></td>
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
                <div className="flex min-w-0 items-start gap-3">
                    <TopRankPhoto row={row} />
                    <div className="min-w-0">
                        <p className="break-words font-black">{row.shooterName}</p>
                        <p className="mt-1 break-words text-sm text-white/55">{row.academy}</p>
                    </div>
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

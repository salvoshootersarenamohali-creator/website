"use client"

import type { RosterRow, loadRegistrationSummary } from "@/lib/admin-roster"
import * as React from "react"
import Image from "@/components/CompetitionImage"
import { usePathname, useRouter } from "next/navigation"
import { Accessibility, BarChart3, CalendarDays, Download, FileSpreadsheet, Loader2, Lock, Medal, MessageCircle, Pencil, Printer, RefreshCw, Search, Trash2, Trophy, Upload, Users, X } from "lucide-react"
import {
    CategoryOption,
    CompetitionConfig,
    Discipline,
    Gender,
    PaymentMode,
    PublicCompetition,
    SelectedEntry,
    defaultCompetitionConfig,
    formatCurrency,
    getAgeFromDobYear,
    getEligibleCategories,
    getEntryFee,
    getEventById,
    getScoringSeriesCount,
    getScoringFormat,
    isValidSeriesTotal,
    isOnlinePaymentMode,
    normalizeCompetitionConfig,
    LITTLE_CHAMP_ENTRY_FEE,
} from "@/lib/competition"
import {
    categorySortValue,
    formatScore,
    formatResultTotal,
    getStageTotals,
    getRuleSet,
    isEntryScored,
    isTopResultCategory,
    rankRows,
} from "@/lib/results"
import { getPaymentReferenceError, toProperCase } from "@/lib/registration-validation"
import { getRegistrationParaState } from "@/lib/para-registration"
import { RelaySelector } from "@/components/RelaySelector"
import dynamic from "next/dynamic"
import { MiniCount } from "@/components/admin/MiniCount"
import { readResponseJson, scopedAdminPath, paymentModeLabel, type AdminEntry, type AdminRegistration, type AdminTeamEntry, type PaymentStatus, type RegistrationPaymentStatus } from "@/lib/admin-desk"
import { ScoreSeries } from "@/components/ScoreSeries"
import { BHARAT_CUP_SLUG, UNRECORDED_PAYMENT } from "@/lib/bharat-cup"
import { cardMatchCode } from "@/lib/competitor-card"

const TeamEntriesView = dynamic(() => import("@/components/admin/TeamEntriesView"))
const DetailsView = dynamic(() => import("@/components/admin/DetailsView"))
const BookedDetailsView = dynamic(() => import("@/components/BookedDetailsView").then(module => module.BookedDetailsView))

type AdminView = "breakdowns" | "stats" | "registrations" | "team-entries" | "results" | "top-students" | "details"

type ResultRow = {
    registration: AdminRegistration
    entry: AdminEntry
    rank: number | null
}

type DuplicateGroup = {
    registration: AdminRegistration
    entries: AdminEntry[]
}

type CombinedLeaderboard = {
    title: string
    rangeLabel: string
    rows: ResultRow[]
}

const coachNames = ["piyush", "anshul", "ayush", "yogesh", "vansh", "kamal", "rahul"]
const canUseDemoData = process.env.NODE_ENV !== "production"
const FALLBACK_COMPETITION_SLUG = "36th-salvo-cup"
const ADMIN_SESSION_PIN_KEY = "salvo-admin-pin"

function getAdminCompetitionSlug(pathname: string) {
    const match = pathname.match(/^\/admin\/competitions\/([^/]+)\/?$/)
    if (match) return decodeURIComponent(match[1])
    if (pathname === "/admin/salvo-cup-36") return FALLBACK_COMPETITION_SLUG
    return FALLBACK_COMPETITION_SLUG
}

function dateOnly(value: string | null) {
    return value?.slice(0, 10) ?? ""
}

function registrationRelayLabel(registration: Pick<AdminRegistration, "preferredDate" | "preferredSlot">) {
    return registration.preferredDate ? `${dateOnly(registration.preferredDate)} | ${registration.preferredSlot}` : "Relay unrecorded"
}

function paymentBadgeClass(status: RegistrationPaymentStatus) {
    if (status === "Paid") return "bg-emerald-500/15 text-emerald-200"
    if (status === "Sponsored") return "bg-sky-500/15 text-sky-200"
    if (status === UNRECORDED_PAYMENT) return "bg-white/10 text-white/65"
    return "bg-amber-500/15 text-amber-200"
}

function formatPaymentAmount(registration: AdminRegistration) {
    if (registration.paymentStatus === UNRECORDED_PAYMENT) return "Payment unrecorded"
    return `${formatCurrency(registration.amount)} (${paymentModeLabel(registration.paymentMode)} - ${registration.paymentStatus})`
}

function entryKey(entry: Pick<AdminEntry, "eventId" | "categoryCode"> | SelectedEntry) {
    return `${entry.eventId}:${entry.categoryCode}`
}

function isValidInnerTenText(value: string, max: number) {
    const text = value.trim()
    const count = Number(text)
    return Boolean(text) && /^\d{1,3}$/.test(text) && Number.isInteger(count) && count >= 0 && count <= max
}

function normalizeWhatsAppPhone(phone: string) {
    const digits = phone.replace(/\D/g, "")
    if (digits.length === 10) return `91${digits}`
    if (digits.length >= 11 && digits.length <= 15) return digits
    return ""
}

function buildWhatsAppScoreUrl(registration: Pick<AdminRegistration, "name" | "phone">, entry: AdminEntry, resultsUrl: string) {
    const phone = normalizeWhatsAppPhone(registration.phone)
    if (!phone || !isEntryScored(entry)) return ""

    const format = getScoringFormat(getRuleSet(entry), entry)
    const stages = getStageTotals(entry).map((stage) => `${stage.label}: ${stage.total} / ${stage.maxScore}.`)
    const message = [
        `Hi ${registration.name}, your score for ${entry.categoryCode} - ${entry.categoryLabel} has been uploaded.`,
        ...stages,
        `Total: ${formatResultTotal(entry)}${format.usesInnerTens ? `, 10x: ${entry.innerTenCount}` : ""}.`,
        `View your live category ranking here: ${resultsUrl}`,
    ].join(" ")

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

function academyLabel(value: string) {
    return value.trim() || "Unassigned Range"
}

function getDuplicateGroups(registrations: AdminRegistration[]) {
    const groups: DuplicateGroup[] = []

    registrations.forEach((registration) => {
        const entryGroups = new Map<string, AdminEntry[]>()
        registration.entries.forEach((entry) => {
            const key = `${entry.eventId}:${entry.categoryCode}`
            entryGroups.set(key, [...(entryGroups.get(key) ?? []), entry])
        })

        entryGroups.forEach((entries) => {
            if (entries.length > 1) groups.push({ registration, entries })
        })
    })

    return groups
}

function buildDemoEntry(index: number, entry: Pick<AdminEntry, "eventId" | "eventTitle" | "discipline" | "ruleSet" | "categoryCode" | "categoryLabel" | "fee">): AdminEntry {
    const ruleSet = entry.ruleSet === "ISSF" ? "ISSF" : "NR"
    const seriesCount = getScoringSeriesCount(ruleSet, entry)
    const seriesScores = Array.from({ length: seriesCount }, (_, seriesIndex) => {
        const pattern = (seriesIndex * 7 + index * 3) % 11
        return ruleSet === "ISSF" ? Number((95.6 + pattern * 0.9).toFixed(1)) : 88 + pattern
    })
    const seriesInnerTenCounts = Array.from({ length: seriesCount }, (_, seriesIndex) => (seriesIndex + index) % 5)

    return {
        ...entry,
        id: `demo-entry-${index}-${entry.categoryCode}`,
        shotScores: null,
        seriesScores,
        seriesInnerTenCounts,
        innerTenCount: seriesInnerTenCounts.reduce((sum, count) => sum + count, 0),
        totalScore: Number(seriesScores.reduce((sum, score) => sum + score, 0).toFixed(ruleSet === "ISSF" ? 1 : 0)),
        isPara: index % 5 === 0,
    }
}

function buildDemoRegistrations(): AdminRegistration[] {
    const academies = ["Salvo Shooters Arena", "Delhi Rifle Club", "North Range Academy", "Target Point Club", "Precision Shooters"]
    const students = [
        ["Aarav Mehta", "male", "2008-04-18", "Paid"],
        ["Siya Kapoor", "female", "2010-08-22", "Pending"],
        ["Kabir Singh", "male", "2005-01-14", "Paid"],
        ["Ananya Rao", "female", "2012-11-07", "Sponsored"],
        ["Vivaan Sharma", "male", "1998-06-02", "Paid"],
        ["Ira Malhotra", "female", "2007-09-19", "Paid"],
        ["Reyansh Gupta", "male", "2014-03-11", "Pending"],
        ["Myra Bansal", "female", "2009-12-30", "Paid"],
        ["Arjun Nair", "male", "1984-02-05", "Sponsored"],
        ["Tara Sethi", "female", "2006-07-16", "Paid"],
        ["Dev Khanna", "male", "2011-05-09", "Pending"],
        ["Nisha Verma", "female", "1995-10-24", "Paid"],
    ] as const
    const entryTemplates = [
        { eventId: "issf-air-rifle", eventTitle: "ISSF Air Rifle", discipline: "rifle", ruleSet: "ISSF", categoryCode: "R-05", categoryLabel: "ISSF Air Rifle Youth Men", fee: 1000 },
        { eventId: "nr-air-rifle", eventTitle: "NR Air Rifle", discipline: "rifle", ruleSet: "NR", categoryCode: "R-15", categoryLabel: "NR Air Rifle Youth Men", fee: 1000 },
        { eventId: "issf-air-pistol", eventTitle: "ISSF Air Pistol", discipline: "pistol", ruleSet: "ISSF", categoryCode: "S-03", categoryLabel: "ISSF Air Pistol Junior Men", fee: 1000 },
        { eventId: "nr-air-pistol", eventTitle: "NR Air Pistol", discipline: "pistol", ruleSet: "NR", categoryCode: "S-17", categoryLabel: "NR Air Pistol Sub Youth Men", fee: 1000 },
        { eventId: "nr-air-rifle", eventTitle: "NR Air Rifle", discipline: "rifle", ruleSet: "NR", categoryCode: "R-21", categoryLabel: "NR Air Rifle Sitting Under 12 Little Champ Girls", fee: LITTLE_CHAMP_ENTRY_FEE },
    ] satisfies Pick<AdminEntry, "eventId" | "eventTitle" | "discipline" | "ruleSet" | "categoryCode" | "categoryLabel" | "fee">[]

    return students.map(([name, gender, dateOfBirth, paymentStatus], index) => {
        const entries = [
            buildDemoEntry(index * 2, entryTemplates[index % entryTemplates.length]),
            ...(index % 3 === 0 ? [buildDemoEntry(index * 2 + 1, entryTemplates[(index + 1) % entryTemplates.length])] : []),
        ]

        return {
            id: `demo-registration-${index}`,
            isService: false,
            name,
            academy: academies[index % academies.length],
            coachName: null,
            motherName: null,
            fatherName: null,
            gender,
            dateOfBirth: `${dateOfBirth}T00:00:00.000Z`,
            phone: `90000000${String(index).padStart(2, "0")}`,
            address: null,
            preferredDate: `2026-06-0${(index % 3) + 5}T00:00:00.000Z`,
            preferredSlot: ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 5:00 PM"][index % 3],
            paymentMode: index % 2 === 0 ? "upi" : "cash",
            paymentStatus,
            paymentConfirmedBy: paymentStatus === "Pending" ? null : "demo",
            paymentConfirmedAt: paymentStatus === "Pending" ? null : "2026-06-03T10:00:00.000Z",
            amount: entries.reduce((sum, entry) => sum + entry.fee, 0),
            utrNumber: index % 2 === 0 ? `1234567890${String(index).padStart(2, "0")}` : null,
            screenshotPath: null,
            studentPhotoPath: null,
            birthCertificatePath: null,
            aadhaarCardPath: null,
            documents: [],
            createdAt: `2026-06-03T10:${String(index).padStart(2, "0")}:00.000Z`,
            entries,
        }
    })
}

export default function SalvoCupAdminPage() {
    const pathname = usePathname()
    const router = useRouter()
    const competitionSlug = getAdminCompetitionSlug(pathname)
    const [competition, setCompetition] = React.useState<PublicCompetition | null>(null)
    const [pin, setPin] = React.useState("")
    const [activePin, setActivePin] = React.useState("")
    const [registrations, setRegistrations] = React.useState<AdminRegistration[]>([])
    const [teamEntries, setTeamEntries] = React.useState<AdminTeamEntry[]>([])
    const [view, setView] = React.useState<AdminView>("stats")
    const [selectedCategories, setSelectedCategories] = React.useState<string[]>([])
    const [summary, setSummary] = React.useState<Awaited<ReturnType<typeof loadRegistrationSummary>> | null>(null)
    const [reload, setReload] = React.useState(0)
    const [busy, setBusy] = React.useState(false)
    const [error, setError] = React.useState("")
    const competitionConfig = competition?.config ?? defaultCompetitionConfig
    const competitionTitle = competition?.title ?? "Competition"
    const filePrefix = competition?.slug ?? competitionSlug


    React.useEffect(() => {
        if (pathname === "/admin/salvo-cup-36") {
            router.replace(`/admin/competitions/${FALLBACK_COMPETITION_SLUG}`)
        }
    }, [pathname, router])

    const categoryOptions = React.useMemo(() => {
        const categories = new Map<string, string>()
        registrations.forEach((registration) => {
            registration.entries.forEach((entry) => {
                categories.set(entry.categoryCode, entry.categoryLabel)
            })
        })

        return Array.from(categories, ([code, label]) => ({ code, label }))
            .sort((a, b) => categorySortValue(a.code).localeCompare(categorySortValue(b.code)))
    }, [registrations])

    React.useEffect(() => {
        setSelectedCategories((current) => {
            const availableCodes = categoryOptions.map((category) => category.code)
            const validCurrent = current.filter((code) => availableCodes.includes(code))
            if (validCurrent.length) return validCurrent
            return availableCodes
        })
    }, [categoryOptions])

    const loadRegistrations = React.useCallback(async (adminPin = activePin, signal?: AbortSignal) => {
        if (!adminPin) return
        setBusy(true)
        setError("")
        try {
            const summaryOnly = view === "stats" || view === "registrations"
            const response = await fetch(scopedAdminPath(competitionSlug, "/registrations" + (summaryOnly ? "?view=summary" : "")), { signal, headers: { "x-admin-pin": adminPin } })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to load registrations.")
            if (signal?.aborted) return
            if (data.summary) setSummary(data.summary as Awaited<ReturnType<typeof loadRegistrationSummary>>)
            if (data.competition && typeof data.competition === "object") {
                const loaded = data.competition as PublicCompetition
                setCompetition({ ...loaded, config: normalizeCompetitionConfig(loaded.config) })
            }
            const nextRegistrations = Array.isArray(data.registrations) ? data.registrations as AdminRegistration[] : []
            setRegistrations(nextRegistrations)

        } catch (loadError) {
            if (signal?.aborted) return
            const message = loadError instanceof Error ? loadError.message : "Unable to load registrations."
            if (canUseDemoData) {
                setRegistrations(buildDemoRegistrations())
                setSummary(null)
                setError(`${message} Showing demo data so the admin graphs can be previewed.`)
            } else {
                setError(message)
            }
        } finally {
            if (!signal?.aborted) setBusy(false)
        }
    }, [activePin, competitionSlug, view])

    const loadTeamEntries = React.useCallback(async (adminPin = activePin) => {
        if (!adminPin) return
        try {
            const response = await fetch(scopedAdminPath(competitionSlug, "/team-entries"), { headers: { "x-admin-pin": adminPin }, cache: "no-store" })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to load team entries.")
            setTeamEntries(Array.isArray(data.teamEntries) ? data.teamEntries as AdminTeamEntry[] : [])
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load team entries.")
        }
    }, [activePin, competitionSlug])

    React.useEffect(() => {
        const stored = window.sessionStorage.getItem(ADMIN_SESSION_PIN_KEY)
        if (stored) { setPin(stored); setActivePin(stored) }
    }, [])
    const rosterNeedsCompetition = view === "registrations" && competition?.slug !== competitionSlug
    React.useEffect(() => {
        if (!activePin) return
        const controller = new AbortController()
        if (view !== "registrations" || rosterNeedsCompetition) void loadRegistrations(activePin, controller.signal)
        if (view === "team-entries") void loadTeamEntries(activePin)
        return () => controller.abort()
    }, [activePin, view, reload, loadRegistrations, loadTeamEntries, rosterNeedsCompetition])

    const login = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        window.sessionStorage.setItem(ADMIN_SESSION_PIN_KEY, pin)
        setActivePin(pin)
    }

    const exportWorkbook = async () => {
        setError("")
        const response = await fetch(scopedAdminPath(competitionSlug, "/export"), { headers: { "x-admin-pin": activePin } })
        if (!response.ok) {
            const data = await readResponseJson(response)
            setError(typeof data.error === "string" ? data.error : "Export failed.")
            return
        }
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${filePrefix}-registrations.xlsx`
        link.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="min-h-screen bg-black px-4 py-10 text-white">
            <div className="container mx-auto">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
                            <Trophy className="h-4 w-4" />
                            Coach Desk
                        </p>
                        <h1 className="mt-2 text-4xl font-black">{competitionTitle} Admin</h1>
                    </div>
                    {activePin && (
                        <div className="flex gap-3">
                            <button onClick={() => setReload(value => value + 1)} className="admin-button">
                                <RefreshCw className="h-4 w-4" />
                                Refresh
                            </button>
                            <button onClick={exportWorkbook} className="admin-button gold">
                                <Download className="h-4 w-4" />
                                Excel
                            </button>
                        </div>
                    )}
                </div>

                {!activePin ? (
                    <form onSubmit={login} className="mx-auto max-w-md rounded-lg border border-white/10 bg-neutral-950 p-6">
                        <Lock className="mb-4 h-9 w-9 text-[#D4AF37]" />
                        <h2 className="mb-2 text-2xl font-black">Enter Admin PIN</h2>
                        <p className="mb-5 text-sm text-white/55">This keeps the admin desk out of casual public view while the event system is being launched quickly.</p>
                        <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" className="field" placeholder="Admin PIN" />
                        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
                        <button className="mt-5 h-11 w-full rounded-md bg-[#D4AF37] font-bold text-black">Open Admin</button>
                    </form>
                ) : (
                    <div>
                        <div className="mb-5 flex flex-wrap gap-2">
                            <button onClick={() => setView("stats")} className={`admin-button ${(view === "stats" || view === "breakdowns") ? "gold" : ""}`}>
                                <BarChart3 className="h-4 w-4" />
                                Stats
                            </button>
                            <button onClick={() => setView("registrations")} className={`admin-button ${view === "registrations" ? "gold" : ""}`}>
                                <Users className="h-4 w-4" />
                                Registrations
                            </button>
                            {competitionConfig.teamEntriesEnabled && (
                                <button onClick={() => setView("team-entries")} className={`admin-button ${view === "team-entries" ? "gold" : ""}`}>
                                    <Users className="h-4 w-4" />
                                    Team Entries
                                </button>
                            )}
                            <button onClick={() => setView("results")} className={`admin-button ${view === "results" ? "gold" : ""}`}>
                                <Medal className="h-4 w-4" />
                                Results
                            </button>
                            <button onClick={() => setView("top-students")} className={`admin-button ${view === "top-students" ? "gold" : ""}`}>
                                <Trophy className="h-4 w-4" />
                                Top Students
                            </button>
                            <button onClick={() => setView("details")} className={`admin-button ${view === "details" ? "gold" : ""}`}>
                                <CalendarDays className="h-4 w-4" />
                                Details
                            </button>
                        </div>

                        {error && <p className="mb-4 rounded-md border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

                        {view === "stats" && summary ? (
                            <div className="space-y-5">
                                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                                    <Stat label="Registrations" value={String(summary.registrations)} />
                                    <Stat label="Total Entries" value={String(summary.entries)} />
                                    <Stat label="Paid" value={String(summary.paid)} />
                                    <Stat label="Pending" value={String(summary.pending)} />
                                    <Stat label="Sponsored" value={String(summary.sponsored)} />
                                    <Stat label="Collected" value={formatCurrency(summary.collected)} />
                                </section>
                                <button className="admin-button" onClick={() => setView("breakdowns")}>View detailed statistics</button>
                            </div>
                        ) : busy && view !== "registrations" ? <p role="status">Loading competition data…</p>
                        : view === "stats" || view === "breakdowns" ? (
                            <StatsView registrations={registrations} adminPin={activePin} competitionSlug={competitionSlug} onChanged={() => loadRegistrations()} />
                        ) : view === "team-entries" && competitionConfig.teamEntriesEnabled ? (
                            <TeamEntriesView
                                registrations={registrations}
                                teamEntries={teamEntries}
                                adminPin={activePin}
                                competitionSlug={competitionSlug}
                                teamEntryFee={competitionConfig.teamEntryFee}
                                onChanged={() => loadTeamEntries()}
                            />
                        ) : view === "results" ? (
                            <ResultsView
                                registrations={registrations}
                                categoryOptions={categoryOptions}
                                selectedCategories={selectedCategories}
                                onSelectedCategoriesChange={setSelectedCategories}
                                adminPin={activePin}
                                competitionSlug={competitionSlug}
                            />
                        ) : view === "top-students" ? (
                            <TopStudentsView registrations={registrations} />
                        ) : view === "details" ? (
                            competitionConfig.relayBooking.enabled ? <BookedDetailsView registrations={registrations} config={competitionConfig} title={competitionTitle} venue={competition?.venue ?? ""} slug={competitionSlug} adminPin={activePin} /> : <DetailsView registrations={registrations} adminPin={activePin} competitionSlug={competitionSlug} competitionTitle={competitionTitle} config={competitionConfig} />
                        ) : (
                            competition && <RegistrationRoster key={competitionSlug} competition={competition} activePin={activePin} reload={reload} />
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function RegistrationRoster({ competition, activePin, reload }: { competition: PublicCompetition; activePin: string; reload: number }) {
    const competitionConfig = competition.config, competitionTitle = competition.title, competitionSlug = competition.slug
    const [roster, setRoster] = React.useState<{ rows: RosterRow[]; page: number; pages: number; total: number }>({ rows: [], page: 1, pages: 1, total: 0 })
    const [page, setPage] = React.useState(1)
    const [query, setQuery] = React.useState("")
    const [filter, setFilter] = React.useState("all")
    const [registrationDateFilter, setRegistrationDateFilter] = React.useState("all")
    const [selectedId, setSelectedId] = React.useState("")
    const [selected, setSelected] = React.useState<AdminRegistration | null>(null)
    const [revision, setRevision] = React.useState(0)
    const [isLoading, setLoading] = React.useState(true)
    const [error, setError] = React.useState("")
    const url = scopedAdminPath(competitionSlug, "/registrations")
    const [savingService, setSavingService] = React.useState<Set<string>>(() => new Set())
    async function saveService(row: RosterRow) {
        setSavingService(current => new Set(current).add(row.id))
        setError("")
        try {
            const response = await fetch(url + "/" + encodeURIComponent(row.id) + "/service", {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "x-admin-pin": activePin },
                body: JSON.stringify({ isService: !row.isService }),
            })
            const data = await readResponseJson(response)
            const { isService } = data
            if (!response.ok || typeof isService !== "boolean") throw new Error(typeof data.error === "string" ? data.error : "Unable to save service status.")
            setRoster(current => ({ ...current, rows: current.rows.map(old => old.id === row.id ? { ...old, isService } : old) }))
            setSelected(current => current?.id === row.id ? { ...current, isService } : current)
            setRevision(current => current + 1)
        } catch (error) {
            setError(error instanceof Error ? error.message : "Unable to save service status.")
        } finally {
            setSavingService(current => {
                const next = new Set(current)
                next.delete(row.id)
                return next
            })
        }
    }
    React.useEffect(() => {
        const controller = new AbortController()
        const params = new URLSearchParams({ view: "roster", page: String(page), q: query, filter, date: registrationDateFilter })
        const timer = window.setTimeout(async () => {
            setLoading(true)
            setError("")
            try {
                const response = await fetch(url + "?" + params, { headers: { "x-admin-pin": activePin }, signal: controller.signal })
                const data = await response.json()
                if (!response.ok) throw new Error(data.error)
                if (controller.signal.aborted) return
                setRoster(data)
                setSelectedId(id => data.rows.some((row: RosterRow) => row.id === id) ? id : data.rows[0]?.id ?? "")
            } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load roster.") }
            finally { if (!controller.signal.aborted) setLoading(false) }
        }, query ? 180 : 0)
        return () => { clearTimeout(timer); controller.abort() }
    }, [activePin, url, page, query, filter, registrationDateFilter, reload, revision])
    React.useEffect(() => {
        if (!selectedId) return
        const controller = new AbortController()
        async function load() {
            try {
                const response = await fetch(url + "?view=detail&id=" + encodeURIComponent(selectedId), { headers: { "x-admin-pin": activePin }, signal: controller.signal })
                const data = await response.json()
                if (!response.ok) throw new Error(data.error)
                if (!controller.signal.aborted) setSelected(data.registration)
            } catch (e) { if (!controller.signal.aborted) { setSelected(null); setError(e instanceof Error ? e.message : "Unable to load registration.") } }
        }
        void load()
        return () => controller.abort()
    }, [activePin, url, selectedId, revision, reload])
    function applyScore(entry: AdminEntry) {
        setSelected(current => current && ({ ...current, entries: current.entries.map(old => old.id === entry.id ? { ...old, ...entry } : old) }))
    }
    function applyPayment(row: AdminRegistration) {
        setSelected(current => current?.id === row.id ? { ...current, paymentStatus: row.paymentStatus, paymentMode: row.paymentMode,
            utrNumber: row.utrNumber, paymentConfirmedBy: row.paymentConfirmedBy, paymentConfirmedAt: row.paymentConfirmedAt } : current)
        if (["Pending", "Sponsored", "Paid"].includes(filter)) setRevision(n => n + 1)
        else setRoster(current => ({ ...current, rows: current.rows.map(old => old.id === row.id ? { ...old, paymentStatus: row.paymentStatus } : old) }))
    }
    return <>{error && <p role="alert" className="text-red-300">{error}</p>}
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
        <section className="min-w-0 rounded-lg border border-white/10 bg-neutral-950 p-5">
            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px_220px]">
                <label className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} className="field pl-10" placeholder="Search name, range, phone..." />
                </label>
                <select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1) }} className="field">
                    <option value="all">All</option>
                    <option value="Paid">Paid</option>
                    <option value="Sponsored">Sponsored</option>
                    <option value="Pending">Pending</option>
                    <option value="ISSF">ISSF</option>
                    <option value="NR">NR</option>
                    <option value="pistol">Pistol</option>
                    <option value="rifle">Rifle</option>
                </select>
                <select value={registrationDateFilter} onChange={(event) => { setRegistrationDateFilter(event.target.value); setPage(1) }} className="field">
                    <option value="all">All Competition Dates</option>
                    {competitionConfig.slotOptions.map((slot) => (
                        <option key={slot.date} value={slot.date}>{slot.label}</option>
                    ))}
                </select>
            </div>

            {isLoading ? (
                <div className="flex h-52 items-center justify-center text-white/50">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            ) : (
                <div className="max-h-[680px] space-y-3 overflow-auto pr-1">
                    {roster.rows.map((registration) => (
                        <div
                            key={registration.id}
                            className={`flex flex-wrap items-start gap-2 rounded-md border p-4 ${selectedId === registration.id ? "border-[#D4AF37] bg-[#D4AF37]/10" : "border-white/10 bg-white/[0.03] hover:border-white/30"}`}
                        >
                          <button type="button" onClick={() => setSelectedId(registration.id)} className="min-w-44 flex-1 text-left">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-bold">{registration.name}</p>
                                    <p className="text-sm text-white/55">{registration.academy}</p>
                                    {registration.coachName && <p className="text-xs text-white/45">Coach: {registration.coachName}</p>}
                                </div>
                                <span className={`rounded-full px-2 py-1 text-xs font-bold ${paymentBadgeClass(registration.paymentStatus as RegistrationPaymentStatus)}`}>
                                    {registration.paymentStatus}
                                </span>
                            </div>
                            <p className="mt-2 text-xs text-white/45">{registrationRelayLabel(registration)}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <p className="text-sm text-[#D4AF37]">{formatCurrency(registration.amount)} | {registration.entryCount} entries</p>
                                {!registration.hasPhoto && (
                                    <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-0.5 text-xs font-bold text-amber-100">
                                        Photo missing
                                    </span>
                                )}
                            </div>
                          </button>
                          <button type="button" role="switch" aria-checked={registration.isService}
                              aria-label={`Service status for ${registration.name}`} disabled={savingService.has(registration.id)}
                              onClick={() => saveService(registration)}
                              className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-bold disabled:opacity-50 ${registration.isService ? "border-[#D4AF37] text-[#D4AF37]" : "border-white/20 text-white/65"}`}>
                              Service {registration.isService ? "on" : "off"}
                          </button>
                        </div>
                    ))}
                </div>
            )}
            <div className="mt-4 flex items-center justify-between">
                <button className="admin-button" disabled={roster.page <= 1} onClick={() => setPage(roster.page - 1)}>Previous</button>
                <span>{roster.total} registrations · Page {roster.page} of {roster.pages}</span>
                <button className="admin-button" disabled={roster.page >= roster.pages} onClick={() => setPage(roster.page + 1)}>Next</button>
            </div>
        </section>

        <section className="min-w-0 rounded-lg border border-white/10 bg-neutral-950 p-5">
            {selected && selected.id === selectedId ? (
                <RegistrationDetail key={selected.id} registration={selected} savingService={savingService.has(selected.id)} onScore={applyScore} onPayment={applyPayment} adminPin={activePin} competitionSlug={competitionSlug} competitionTitle={competitionTitle} config={competitionConfig} onChanged={() => setRevision(n => n + 1)} />
            ) : (
                <p className="text-white/50">{selectedId ? "Loading registration…" : "No registrations found."}</p>
            )}
        </section>
    </div>
    </>
}

function StatsView({ registrations, adminPin, competitionSlug, onChanged }: { registrations: AdminRegistration[]; adminPin: string; competitionSlug: string; onChanged: () => void }) {
    const [cleanupState, setCleanupState] = React.useState<"idle" | "saving">("idle")
    const [cleanupMessage, setCleanupMessage] = React.useState("")
    const duplicateGroups = React.useMemo(() => getDuplicateGroups(registrations), [registrations])
    const entries = registrations.flatMap((registration) => registration.entries)
    const totalEntries = entries.length
    const paidRegistrations = registrations.filter((registration) => registration.paymentStatus === "Paid")
    const pendingRegistrations = registrations.filter((registration) => registration.paymentStatus === "Pending")
    const sponsoredRegistrations = registrations.filter((registration) => registration.paymentStatus === "Sponsored")
    const scoredEntries = entries.filter(isEntryScored).length
    const collectedAmount = paidRegistrations.reduce((sum, registration) => sum + registration.amount, 0)
    const expectedAmount = registrations.reduce((sum, registration) => sum + registration.amount, 0)
    const rangeRows = React.useMemo(() => buildRangeRows(registrations), [registrations])
    const categoryRows = React.useMemo(() => buildEntryRows(entries, (entry) => `${entry.categoryCode} - ${entry.categoryLabel}`), [entries])
    const slotRows = React.useMemo(() => buildRegistrationRows(registrations, registrationRelayLabel), [registrations])
    const ruleRows = React.useMemo(() => buildEntryRows(entries, (entry) => entry.ruleSet), [entries])
    const disciplineRows = React.useMemo(() => buildEntryRows(entries, (entry) => entry.discipline), [entries])

    const cleanupDuplicates = async () => {
        setCleanupState("saving")
        setCleanupMessage("")
        try {
            const response = await fetch(scopedAdminPath(competitionSlug, "/entries/duplicates"), {
                method: "POST",
                headers: { "x-admin-pin": adminPin },
            })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to delete duplicates.")
            setCleanupMessage(`${typeof data.deletedCount === "number" ? data.deletedCount : 0} duplicate entries deleted.`)
            onChanged()
        } catch (cleanupError) {
            setCleanupMessage(cleanupError instanceof Error ? cleanupError.message : "Unable to delete duplicates.")
        } finally {
            setCleanupState("idle")
        }
    }

    return (
        <div className="space-y-6">
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <Stat label="Registrations" value={String(registrations.length)} />
                <Stat label="Total Entries" value={String(totalEntries)} />
                <Stat label="Paid" value={String(paidRegistrations.length)} />
                <Stat label="Pending" value={String(pendingRegistrations.length)} />
                <Stat label="Sponsored" value={String(sponsoredRegistrations.length)} />
                <Stat label="Collected" value={formatCurrency(collectedAmount)} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-lg border border-white/10 bg-neutral-950 p-5">
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-black">Range-Wise Students</h2>
                            <p className="mt-1 text-sm text-white/50">Grouped by the existing academy/range value.</p>
                        </div>
                        <div className="text-right text-sm text-white/55">
                            <p>{scoredEntries} scored</p>
                            <p>{totalEntries - scoredEntries} unscored</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {rangeRows.map((row) => (
                            <details key={row.name} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
                                <summary className="cursor-pointer list-none">
                                    <div className="grid gap-3 md:grid-cols-[1fr_120px_120px_120px] md:items-center">
                                        <div>
                                            <p className="font-bold text-[#D4AF37]">{row.name}</p>
                                            <p className="mt-1 text-sm text-white/50">{row.students} students | {row.entries} entries | {formatCurrency(row.collected)} collected</p>
                                        </div>
                                        <MiniCount label="Paid" value={row.paid} />
                                        <MiniCount label="Pending" value={row.pending} />
                                        <MiniCount label="Sponsored" value={row.sponsored} />
                                    </div>
                                    <Bar value={row.entries} max={rangeRows[0]?.entries ?? 1} />
                                </summary>
                                <div className="mt-4 overflow-x-auto">
                                    <table className="w-full min-w-[680px] text-left text-sm">
                                        <thead className="text-xs uppercase tracking-[0.16em] text-white/40">
                                            <tr className="border-b border-white/10">
                                                <th className="py-2 pr-3">Student</th>
                                                <th className="py-2 pr-3">Phone</th>
                                                <th className="py-2 pr-3">Date/Slot</th>
                                                <th className="py-2 pr-3">Payment</th>
                                                <th className="py-2 text-right">Entries</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {row.registrations.map((registration) => (
                                                <tr key={registration.id} className="border-b border-white/5 last:border-0">
                                                    <td className="py-2 pr-3 font-bold">{registration.name}</td>
                                                    <td className="py-2 pr-3 text-white/65">{registration.phone}</td>
                                                    <td className="py-2 pr-3 text-white/65">{registrationRelayLabel(registration)}</td>
                                                    <td className="py-2 pr-3 text-white/65">{registration.paymentStatus}</td>
                                                    <td className="py-2 text-right text-[#D4AF37]">{registration.entries.length}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </details>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <ChartPanel title="Entries by Category" rows={categoryRows.slice(0, 10)} />
                    <ChartPanel title="Date and Slot Load" rows={slotRows} />
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
                        <ChartPanel title="Rule Set" rows={ruleRows} />
                        <ChartPanel title="Discipline" rows={disciplineRows} />
                    </div>
                </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-neutral-950 p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black">Duplicate Entries</h2>
                        <p className="mt-1 text-sm text-white/50">Exact repeated entries inside the same registration are listed here.</p>
                    </div>
                    <button onClick={cleanupDuplicates} disabled={!duplicateGroups.length || cleanupState === "saving"} className="admin-button gold disabled:opacity-60">
                        {cleanupState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Delete Duplicates
                    </button>
                </div>
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                    <Stat label="Expected Amount" value={formatCurrency(expectedAmount)} />
                    <Stat label="Duplicate Groups" value={String(duplicateGroups.length)} />
                    <Stat label="Duplicate Extras" value={String(duplicateGroups.reduce((sum, group) => sum + group.entries.length - 1, 0))} />
                </div>
                {cleanupMessage && <p className="mb-4 rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm text-white/70">{cleanupMessage}</p>}
                {duplicateGroups.length ? (
                    <div className="space-y-3">
                        {duplicateGroups.map((group) => (
                            <div key={`${group.registration.id}-${group.entries[0].eventId}-${group.entries[0].categoryCode}`} className="rounded-md border border-amber-400/20 bg-amber-400/[0.06] p-4">
                                <p className="font-bold text-amber-100">{group.registration.name}</p>
                                <p className="mt-1 text-sm text-white/60">{group.entries[0].categoryCode} - {group.entries[0].categoryLabel}</p>
                                <p className="mt-1 text-xs text-white/45">{group.entries.length - 1} extra duplicate entries will be removed; the oldest entry stays.</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="rounded-md border border-white/10 bg-white/[0.03] p-6 text-white/50">No exact duplicate entries found.</p>
                )}
            </section>
        </div>
    )
}

function ResultsView({
    registrations,
    categoryOptions,
    selectedCategories,
    onSelectedCategoriesChange,
    adminPin,
    competitionSlug,
}: {
    registrations: AdminRegistration[]
    categoryOptions: { code: string; label: string }[]
    selectedCategories: string[]
    onSelectedCategoriesChange: (categories: string[]) => void
    adminPin: string
    competitionSlug: string
}) {
    const [downloadState, setDownloadState] = React.useState<"idle" | "saving">("idle")
    const [message, setMessage] = React.useState("")
    const selectedSet = React.useMemo(() => new Set(selectedCategories), [selectedCategories])
    const groupedResults = React.useMemo(() => {
        const groups = new Map<string, { label: string; rows: Omit<ResultRow, "rank">[] }>()

        registrations.forEach((registration) => {
            registration.entries.forEach((entry) => {
                if (!selectedSet.has(entry.categoryCode)) return
                const group = groups.get(entry.categoryCode) ?? { label: entry.categoryLabel, rows: [] }
                group.rows.push({ registration, entry })
                groups.set(entry.categoryCode, group)
            })
        })

        return Array.from(groups, ([code, group]) => ({
            code,
            label: group.label,
            rows: rankRows(group.rows),
        })).sort((a, b) => categorySortValue(a.code).localeCompare(categorySortValue(b.code)))
    }, [registrations, selectedSet])

    const toggleCategory = (code: string) => {
        onSelectedCategoriesChange(
            selectedSet.has(code)
                ? selectedCategories.filter((category) => category !== code)
                : [...selectedCategories, code]
        )
    }

    const downloadCategoryResults = async () => {
        setDownloadState("saving")
        setMessage("")
        try {
            const response = await fetch(scopedAdminPath(competitionSlug, "/results/export"), { headers: { "x-admin-pin": adminPin } })
            if (!response.ok) {
                const data = await readResponseJson(response)
                throw new Error(typeof data.error === "string" ? data.error : "Category results export failed.")
            }

            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `${competitionSlug}-category-results.xlsx`
            link.click()
            URL.revokeObjectURL(url)
        } catch (downloadError) {
            setMessage(downloadError instanceof Error ? downloadError.message : "Category results export failed.")
        } finally {
            setDownloadState("idle")
        }
    }

    return (
        <section className="rounded-lg border border-white/10 bg-neutral-950 p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black">Category Results</h2>
                    <p className="mt-1 text-sm text-white/50">Ranks use total, then 10x where counted, then series totals from last series backward.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={downloadCategoryResults} disabled={downloadState === "saving"} className="admin-button disabled:opacity-50">
                        {downloadState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                        Excel
                    </button>
                    <button onClick={() => onSelectedCategoriesChange(categoryOptions.map((category) => category.code))} className="admin-button">
                        Select All
                    </button>
                    <button onClick={() => onSelectedCategoriesChange([])} className="admin-button">
                        Clear
                    </button>
                </div>
            </div>

            {message && <p className="mb-4 rounded-md border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{message}</p>}

            <div className="mb-6 flex max-h-44 flex-wrap gap-2 overflow-auto rounded-md border border-white/10 bg-black/25 p-3">
                {categoryOptions.map((category) => (
                    <button
                        key={category.code}
                        onClick={() => toggleCategory(category.code)}
                        className={`rounded-md border px-3 py-2 text-left text-sm transition ${selectedSet.has(category.code) ? "border-[#D4AF37] bg-[#D4AF37] text-black" : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/30"}`}
                    >
                        <span className="block font-bold">{category.code}</span>
                        <span className="block max-w-52 truncate text-xs">{category.label}</span>
                    </button>
                ))}
            </div>

            <div className="space-y-5">
                {groupedResults.length ? groupedResults.map((category) => (
                    <div key={category.code} className="rounded-md border border-white/10 bg-white/[0.03]">
                        <div className="border-b border-white/10 p-4">
                            <h3 className="font-black text-[#D4AF37]">{category.code} - {category.label}</h3>
                            <p className="mt-1 text-xs text-white/45">{category.rows.length} entries</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[820px] text-left text-sm">
                                <thead className="text-xs uppercase tracking-[0.16em] text-white/40">
                                    <tr className="border-b border-white/10">
                                        <th className="px-4 py-3">Rank</th>
                                        <th className="px-4 py-3">Shooter</th>
                                        <th className="px-4 py-3">Academy/Range</th>
                                        <th className="px-4 py-3">Event</th>
                                        <th className="px-4 py-3">Series</th>
                                        {category.rows.some((row) => getScoringFormat(getRuleSet(row.entry), row.entry).usesInnerTens) && <th className="px-4 py-3 text-right">10x</th>}
                                        <th className="px-4 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {category.rows.map((row) => (
                                        <tr key={row.entry.id} className="border-b border-white/5 last:border-0">
                                            <td className="px-4 py-3 font-bold">{row.rank ?? "-"}</td>
                                            <td className="px-4 py-3">{row.registration.name}</td>
                                            <td className="px-4 py-3 text-white/65">{row.registration.academy}</td>
                                            <td className="px-4 py-3 text-white/65">{row.entry.eventTitle}</td>
                                            <td className="px-4 py-3"><ScoreSeries entry={row.entry} /></td>
                                            {category.rows.some((item) => getScoringFormat(getRuleSet(item.entry), item.entry).usesInnerTens) && <td className="px-4 py-3 text-right font-bold">{getScoringFormat(getRuleSet(row.entry), row.entry).usesInnerTens && isEntryScored(row.entry) ? row.entry.innerTenCount : "-"}</td>}
                                            <td className="px-4 py-3 text-right text-lg font-black text-[#D4AF37]">{formatResultTotal(row.entry)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )) : (
                    <p className="rounded-md border border-white/10 bg-white/[0.03] p-6 text-white/50">Select at least one category to view results.</p>
                )}
            </div>
        </section>
    )
}

function TopStudentsView({ registrations }: { registrations: AdminRegistration[] }) {
    const leaderboards = React.useMemo<CombinedLeaderboard[]>(() => {
        const buildLeaderboard = (title: string, rangeLabel: string, prefix: "S" | "R", min: number, max: number) => {
            const rows = registrations.flatMap((registration) =>
                registration.entries
                    .filter((entry) => isTopResultCategory(entry, prefix, min, max))
                    .filter(isEntryScored)
                    .map((entry) => ({ registration, entry }))
            )

            return {
                title,
                rangeLabel,
                rows: rankRows(rows),
            }
        }

        return [
            buildLeaderboard("ISSF Pistol Top Students", "Combined S-01 to S-10", "S", 1, 10),
            buildLeaderboard("ISSF Rifle Top Students", "Combined R-01 to R-08", "R", 1, 8),
            buildLeaderboard("NR Pistol Top Students", "Combined S-11 to S-24", "S", 11, 24),
            buildLeaderboard("NR Rifle Top Students", "Combined R-11 to R-24", "R", 11, 24),
        ]
    }, [registrations])

    return (
        <section className="rounded-lg border border-white/10 bg-neutral-950 p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black">Top Students</h2>
                    <p className="mt-1 text-sm text-white/50">Combined ranked lists for scored ISSF and NR pistol/rifle category ranges.</p>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                {leaderboards.map((leaderboard) => (
                    <CombinedLeaderboardPanel key={leaderboard.title} leaderboard={leaderboard} />
                ))}
            </div>
        </section>
    )
}

function CombinedLeaderboardPanel({ leaderboard }: { leaderboard: CombinedLeaderboard }) {
    return (
        <div className="overflow-hidden rounded-md border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="font-black text-[#D4AF37]">{leaderboard.title}</h3>
                        <p className="mt-1 text-xs text-white/45">{leaderboard.rangeLabel}</p>
                    </div>
                    <div className="rounded-md border border-white/10 bg-black/25 px-3 py-2 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">Scored</p>
                        <p className="mt-1 font-black">{leaderboard.rows.length}</p>
                    </div>
                </div>
            </div>

            {leaderboard.rows.length ? (
                <div className="overflow-x-auto">
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
                            {leaderboard.rows.map((row) => (
                                <tr key={row.entry.id} className="border-b border-white/5 last:border-0">
                                    <td className="px-4 py-3 font-bold">{row.rank ?? "-"}</td>
                                    <td className="px-4 py-3 font-bold">{row.registration.name}</td>
                                    <td className="px-4 py-3 text-white/65">{row.registration.academy}</td>
                                    <td className="px-4 py-3 text-white/65">
                                        <span className="font-bold text-white/85">{row.entry.categoryCode}</span>
                                        <span className="ml-2">{row.entry.eventTitle}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold">{row.entry.innerTenCount}</td>
                                    <td className="px-4 py-3 text-right text-lg font-black text-[#D4AF37]">{formatScore(row.entry.totalScore, getRuleSet(row.entry))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="p-6 text-sm text-white/50">No scored entries found for this combined category range.</p>
            )}
        </div>
    )
}

function RegistrationDetail({
    registration,
    savingService,
    adminPin,
    competitionSlug,
    competitionTitle,
    config,
    onChanged, onScore, onPayment,
}: {
    registration: AdminRegistration
    savingService: boolean
    adminPin: string
    competitionSlug: string
    competitionTitle: string
    config: CompetitionConfig
    onScore: (entry: AdminEntry) => void
    onPayment: (row: AdminRegistration) => void
    onChanged: () => void
}) {
    const [deleting, setDeleting] = React.useState(false)
    const [deleteError, setDeleteError] = React.useState("")
    const [editing, setEditing] = React.useState(false)
    const [markingPara, setMarkingPara] = React.useState(false)
    const [paraError, setParaError] = React.useState("")
    const paraState = getRegistrationParaState(registration.entries)
    const isParaShooter = paraState === "para"
    const hasParaEntries = paraState !== "regular"
    const registrationDocuments = registration.documents.length
        ? registration.documents
        : [
            registration.birthCertificatePath ? { id: "legacy-birth-certificate", documentKey: "birth-certificate", label: "Date of Birth Certificate", path: registration.birthCertificatePath, mimeType: "application/octet-stream" } : null,
            registration.aadhaarCardPath ? { id: "legacy-aadhaar-card", documentKey: "aadhaar-card", label: "Aadhaar Card Copy", path: registration.aadhaarCardPath, mimeType: "application/octet-stream" } : null,
        ].filter((document): document is NonNullable<typeof document> => document !== null)

    React.useEffect(() => {
        setDeleting(false)
        setDeleteError("")
        setEditing(false)
        setMarkingPara(false)
        setParaError("")
    }, [registration.id])

    const deleteRegistration = async () => {
        const entryText = registration.entries.length === 1 ? "1 entry" : `${registration.entries.length} entries`
        const confirmed = window.confirm(`Delete this person and all their entries from the database?\n\nThis removes ${registration.name} and ${entryText}.`)
        if (!confirmed) return

        setDeleting(true)
        setDeleteError("")
        try {
            const response = await fetch(scopedAdminPath(competitionSlug, `/registrations/${registration.id}`), {
                method: "DELETE",
                headers: { "x-admin-pin": adminPin },
            })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to delete registration.")
            onChanged()
        } catch (deleteError) {
            setDeleteError(deleteError instanceof Error ? deleteError.message : "Unable to delete registration.")
        } finally {
            setDeleting(false)
        }
    }

    const togglePara = async () => {
        const nextIsPara = !isParaShooter
        const policyText = config.paraEntryMode === "sponsored"
            ? "all entry fees will become Rs. 0 and the registration will be marked Sponsored"
            : `every entry will use the ${formatCurrency(config.paraEntryFee)} para fee`
        const message = nextIsPara
            ? `Mark ${registration.name} and all ${registration.entries.length} entries as para? ${policyText}.`
            : `Remove para status from ${registration.name}? All entries will return to the competition's current standard fees.`
        if (!window.confirm(message)) return

        setMarkingPara(true)
        setParaError("")
        try {
            const response = await fetch(scopedAdminPath(competitionSlug, `/registrations/${registration.id}/para`), {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
                body: JSON.stringify({ isPara: nextIsPara }),
            })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to update para shooter status.")
            onChanged()
        } catch (updateError) {
            setParaError(updateError instanceof Error ? updateError.message : "Unable to update para shooter status.")
        } finally {
            setMarkingPara(false)
        }
    }

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-3xl font-black">{registration.name}</h2>
                        {hasParaEntries && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/35 bg-sky-400/10 px-2 py-1 text-xs font-bold text-sky-100">
                                <Accessibility className="h-3.5 w-3.5" />
                                {isParaShooter ? "Para Shooter" : "Mixed Para Status"}
                            </span>
                        )}
                    </div>
                    <p className="text-white/55">{registration.academy} | {registration.phone}</p>
                    {registration.coachName && <p className="mt-1 text-sm text-white/55">Coach: {registration.coachName}</p>}
                    <p className="mt-2 text-sm text-white/45">{registrationRelayLabel(registration)}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                    <button onClick={() => setEditing((current) => !current)} className="admin-button">
                        {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        {editing ? "Close Edit" : "Edit"}
                    </button>
                    <button
                        onClick={togglePara}
                        disabled={markingPara || deleting}
                        className={`admin-button disabled:opacity-60 ${isParaShooter ? "border-sky-300/45 bg-sky-400/15 text-sky-100" : ""}`}
                    >
                        {markingPara ? <Loader2 className="h-4 w-4 animate-spin" /> : <Accessibility className="h-4 w-4" />}
                        {isParaShooter ? "Remove Para Status" : "Mark Shooter Para"}
                    </button>
                    <button
                        onClick={deleteRegistration}
                        disabled={deleting}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-4 font-bold text-red-200 transition hover:border-red-300 disabled:opacity-60"
                    >
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Delete Person
                    </button>
                    <button disabled={savingService} onClick={() => window.print()} className="admin-button gold disabled:opacity-50">
                        <Printer className="h-4 w-4" />
                        Print Card
                    </button>
                </div>
            </div>
            {(deleteError || paraError) && <p className="mb-6 text-sm text-red-300">{deleteError || paraError}</p>}

            {editing && (
                <RegistrationEditForm
                    registration={registration}
                    adminPin={adminPin}
                    competitionSlug={competitionSlug}
                    config={config}
                    onCancel={() => setEditing(false)}
                    onChanged={() => {
                        setEditing(false)
                        onChanged()
                    }}
                />
            )}

            <div className="mb-6 grid gap-3 md:grid-cols-4">
                <Stat label="Amount" value={formatCurrency(registration.amount)} />
                <Stat label="Payment" value={registration.paymentMode ? `${paymentModeLabel(registration.paymentMode)} / ${registration.paymentStatus}` : UNRECORDED_PAYMENT} />
                <Stat label="Payment Reference" value={registration.utrNumber ?? "-"} />
                <Stat label="Confirmed By" value={registration.paymentConfirmedBy ?? "-"} />
            </div>
            {(config.requiresGuardianDetails || config.requiresAddress) && (
                <div className="mb-6 grid gap-3 md:grid-cols-3">
                    {config.requiresGuardianDetails && <Stat label="Mother" value={registration.motherName ?? "-"} />}
                    {config.requiresGuardianDetails && <Stat label="Father" value={registration.fatherName ?? "-"} />}
                    {config.requiresAddress && <Stat label="Address" value={registration.address ?? "-"} />}
                </div>
            )}

            {registration.paymentConfirmedAt && (
                <p className="mb-6 text-sm text-white/45">Payment confirmed on {dateOnly(registration.paymentConfirmedAt)}.</p>
            )}

            <StudentPhotoUpload registration={registration} adminPin={adminPin} competitionSlug={competitionSlug} onChanged={onChanged} />

            {registration.screenshotPath && (
                <a href={registration.screenshotPath} target="_blank" rel="noreferrer" className="mb-6 inline-block text-sm font-bold text-[#D4AF37] underline">
                    View payment screenshot
                </a>
            )}
            {registrationDocuments.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-3">
                    {registrationDocuments.map((document) => (
                        <a key={document.id} href={document.path} target="_blank" rel="noreferrer" className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-[#D4AF37] underline">
                            View {document.label}
                        </a>
                    ))}
                </div>
            )}

            {registration.paymentStatus === "Pending" && (
                <PaymentConfirmation onPayment={onPayment} registrationId={registration.id} adminPin={adminPin} competitionSlug={competitionSlug} />
            )}

            <div className="mb-6 rounded-md border border-red-400/20 bg-red-500/[0.06] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="font-bold text-red-100">Registration Action</p>
                        <p className="mt-1 text-sm text-white/50">Delete this person from registrations, cards, and results.</p>
                    </div>
                    <button
                        onClick={deleteRegistration}
                        disabled={deleting}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-red-400/30 bg-red-500/15 px-4 font-bold text-red-100 transition hover:border-red-300 disabled:opacity-60"
                    >
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Delete Person
                    </button>
                </div>
            </div>

            <div className="mb-8 space-y-4">
                {registration.entries.map((entry) => (
                    <ScoreRow onScore={onScore} key={entry.id} registration={registration} entry={entry} adminPin={adminPin} competitionSlug={competitionSlug} onChanged={onChanged} />
                ))}
            </div>

            <div className="overflow-x-auto print:overflow-visible">
                <div className="print-card salvo-competitor-card bg-white text-black">
                    <div className="salvo-print-header">
                        <div className="salvo-print-logo-frame">
                            <Image src="/salvo-logo.png" alt="Salvo Shooters Arena" width={260} height={104} className="salvo-print-logo" />
                        </div>
                        <h2>{competitionTitle} Shooting Championship</h2>
                        <h3>COMPETITOR CARD</h3>
                    </div>
                    <PrintableCard registration={registration} variant="competitor" />
                    <div className="salvo-section-divider" />
                    <PrintableCard registration={registration} variant="office" />
                </div>
            </div>
        </div>
    )
}

function StudentPhotoUpload({
    registration,
    adminPin,
    competitionSlug,
    onChanged,
}: {
    registration: Pick<AdminRegistration, "id" | "name" | "studentPhotoPath">
    adminPin: string
    competitionSlug: string
    onChanged: () => void
}) {
    const [file, setFile] = React.useState<File | null>(null)
    const [isUploading, setIsUploading] = React.useState(false)
    const [message, setMessage] = React.useState("")

    React.useEffect(() => {
        setFile(null)
        setMessage("")
        setIsUploading(false)
    }, [registration.id])

    const upload = async () => {
        setMessage("")
        if (!file) {
            setMessage("Choose a student photo first.")
            return
        }

        const body = new FormData()
        body.append("studentPhoto", file)
        setIsUploading(true)
        try {
            const response = await fetch(scopedAdminPath(competitionSlug, `/registrations/${registration.id}/photo`), {
                method: "PATCH",
                headers: { "x-admin-pin": adminPin },
                body,
            })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to upload student photo.")
            setFile(null)
            setMessage("Photo uploaded.")
            onChanged()
        } catch (uploadError) {
            setMessage(uploadError instanceof Error ? uploadError.message : "Unable to upload student photo.")
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="mb-6 rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/35">
                    {registration.studentPhotoPath ? (
                        <Image src={registration.studentPhotoPath} alt={`${registration.name} photo`} width={120} height={120} className="h-full w-full object-cover" />
                    ) : (
                        <span className="px-2 text-center text-xs font-bold uppercase tracking-[0.14em] text-white/35">Photo missing</span>
                    )}
                </div>
                <div className="min-w-[240px] flex-1">
                    <div className="mb-3">
                        <p className="font-bold text-white">{registration.studentPhotoPath ? "Student Photo" : "Student Photo Missing"}</p>
                        <p className="mt-1 text-sm text-white/50">Upload or replace the photo shown for top-3 public results.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                            className="field file:text-white"
                        />
                        <button type="button" onClick={upload} disabled={isUploading} className="admin-button gold disabled:opacity-60">
                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {isUploading ? "Uploading..." : registration.studentPhotoPath ? "Replace Photo" : "Upload Photo"}
                        </button>
                    </div>
                    {message && <p className="mt-3 text-sm text-white/60">{message}</p>}
                </div>
            </div>
        </div>
    )
}

type RegistrationEditFormState = {
    name: string
    academy: string
    coachName: string
    motherName: string
    fatherName: string
    gender: "" | Gender
    dateOfBirth: string
    phone: string
    address: string
    preferredDate: string
    preferredSlot: string
    paymentMode: PaymentMode | ""
    paymentStatus: RegistrationPaymentStatus
    utrNumber: string
}

function RegistrationEditForm({
    registration,
    adminPin,
    competitionSlug,
    config,
    onCancel,
    onChanged,
}: {
    registration: AdminRegistration
    adminPin: string
    competitionSlug: string
    config: CompetitionConfig
    onCancel: () => void
    onChanged: () => void
}) {
    const bharatCup = competitionSlug === BHARAT_CUP_SLUG
    const [form, setForm] = React.useState<RegistrationEditFormState>(() => ({
        name: registration.name,
        academy: registration.academy,
        coachName: registration.coachName ?? "",
        motherName: registration.motherName ?? "",
        fatherName: registration.fatherName ?? "",
        gender: registration.gender === "male" || registration.gender === "female" ? registration.gender : "",
        dateOfBirth: dateOnly(registration.dateOfBirth),
        phone: registration.phone,
        address: registration.address ?? "",
        preferredDate: dateOnly(registration.preferredDate),
        preferredSlot: registration.preferredSlot,
        paymentMode: registration.paymentMode,
        paymentStatus: registration.paymentStatus,
        utrNumber: registration.utrNumber ?? "",
    }))
    const [entries, setEntries] = React.useState<SelectedEntry[]>(() => registration.entries.map((entry) => ({
        eventId: entry.eventId,
        categoryCode: entry.categoryCode,
    })))
    const [selectionStartedWith, setSelectionStartedWith] = React.useState<"NR" | "ISSF" | null>(() => {
        const firstEvent = getEventById(registration.entries[0]?.eventId ?? "", config)
        return firstEvent?.ruleSet ?? null
    })
    const [saving, setSaving] = React.useState(false)
    const [error, setError] = React.useState("")
    const registrationIsParaShooter = registration.entries.length > 0 && registration.entries.every((entry) => entry.isPara)
    const [relayRefresh, setRelayRefresh] = React.useState(0)

    const age = form.dateOfBirth ? getAgeFromDobYear(form.dateOfBirth, config.competitionYear) : null
    const selectedEvents = entries.map((entry) => getEventById(entry.eventId, config)).filter(Boolean)
    const selectedDiscipline = selectedEvents[0]?.discipline
    const bookedDate = dateOnly(registration.preferredDate)
    const bookedDay = config.slotOptions.find((day) => day.date === bookedDate)
    const availableDays = config.slotOptions.filter((day) => day.slots.length > 0 || day.date === bookedDate)
    const availableSlots = config.slotOptions.find((day) => day.date === form.preferredDate)?.slots ?? []
    const selectedSlots = form.preferredDate === bookedDate && !availableSlots.includes(registration.preferredSlot)
        ? [registration.preferredSlot, ...availableSlots]
        : availableSlots
    const categoriesByEvent = React.useMemo(() => {
        const map = new Map<string, CategoryOption[]>()
        for (const event of config.events) {
            map.set(event.id, age !== null && form.gender ? getEligibleCategories(event, age, form.gender, config) : [])
        }
        return map
    }, [age, config, form.gender])
    const invalidEntries = entries.filter((entry) => {
        if (bharatCup && registration.entries.some((saved) => saved.bharatCupResult && entryKey(saved) === entryKey(entry))) return false
        const categories = categoriesByEvent.get(entry.eventId) ?? []
        return !categories.some((category) => category.code === entry.categoryCode)
    })
    const removedScoredEntries = registration.entries.filter((entry) =>
        !entries.some((selectedEntry) => entryKey(selectedEntry) === entryKey(entry)) && isEntryScored(entry)
    )
    const isSelectedEntryPara = (entry: SelectedEntry) => {
        const existingEntry = registration.entries.find((candidate) => entryKey(candidate) === entryKey(entry))
        return existingEntry?.isPara ?? registrationIsParaShooter
    }
    const amount = entries.reduce((sum, entry) => {
        const categories = categoriesByEvent.get(entry.eventId) ?? []
        const category = categories.find((item) => item.code === entry.categoryCode)
        return sum + (category ? getEntryFee(category, config, isSelectedEntryPara(entry)) : 0)
    }, 0)
    const isOnlinePaid = isOnlinePaymentMode(form.paymentMode) && form.paymentStatus === "Paid"

    React.useEffect(() => {
        if (!config.relayBooking.enabled && !selectedSlots.includes(form.preferredSlot)) {
            setForm((current) => ({ ...current, preferredSlot: selectedSlots[0] ?? "" }))
        }
    }, [config.relayBooking.enabled, form.preferredSlot, selectedSlots])

    const isEntrySelected = (eventId: string, categoryCode: string) =>
        entries.some((entry) => entry.eventId === eventId && entry.categoryCode === categoryCode)

    const canUseEvent = (eventId: string) => {
        const event = getEventById(eventId, config)
        if (!event) return false
        if (selectedDiscipline && event.discipline !== selectedDiscipline) return false
        if (!config.relayBooking.enabled && selectionStartedWith === "ISSF" && event.ruleSet === "NR") return false
        return true
    }

    const toggleEntry = (eventId: string, categoryCode: string) => {
        setError("")
        const event = getEventById(eventId, config)
        if (!event || !canUseEvent(eventId)) return

        setEntries((current) => {
            const exists = current.some((entry) => entry.eventId === eventId && entry.categoryCode === categoryCode)
            if (exists) {
                const next = current.filter((entry) => !(entry.eventId === eventId && entry.categoryCode === categoryCode))
                if (!next.length) setSelectionStartedWith(null)
                return next
            }
            if (!current.length) setSelectionStartedWith(event.ruleSet)
            return [...current, { eventId, categoryCode }]
        })
    }

    const save = async (allowScoredEntryRemoval = false) => {
        setError("")
        if (!form.gender && !bharatCup) {
            setError("Select gender before saving.")
            return
        }
        if (!entries.length) {
            setError("Select at least one event category.")
            return
        }
        if (!form.preferredSlot && (!bharatCup || form.preferredDate)) { setError("Select an available relay."); return }
        if (invalidEntries.length) {
            setError("Remove or replace categories that are no longer eligible for this shooter.")
            return
        }
        const referenceError = isOnlinePaid ? getPaymentReferenceError(form.paymentMode, form.utrNumber) : null
        if (referenceError) {
            setError(referenceError)
            return
        }
        if (removedScoredEntries.length && !allowScoredEntryRemoval) {
            const labels = removedScoredEntries.map((entry) => `${entry.categoryCode} - ${entry.categoryLabel}`).join("\n")
            const confirmed = window.confirm(`This edit will permanently delete scored entries:\n\n${labels}\n\nContinue?`)
            if (!confirmed) return
            await save(true)
            return
        }

        setSaving(true)
        try {
            const response = await fetch(scopedAdminPath(competitionSlug, `/registrations/${registration.id}`), {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
                body: JSON.stringify({ ...form, entries, allowScoredEntryRemoval }),
            })
            const data = await readResponseJson(response)
            if (response.status === 409 && data.scoredEntryRemovalRequired === true) {
                const confirmed = window.confirm("This edit removes entries that already have scores. Continue and delete those scores?")
                if (confirmed) await save(true)
                return
            }
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to update registration.")
            onChanged()
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Unable to update registration.")
        } finally {
            setRelayRefresh((value) => value + 1)
            setSaving(false)
        }
    }

    return (
        <div className="mb-6 rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/[0.06] p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="font-bold text-[#E5C558]">Edit Registration</p>
                    <p className="mt-1 text-sm text-white/55">Changes update cards, exports, stats, details, and result views after save.</p>
                </div>
                <p className="text-right text-sm font-bold text-[#D4AF37]">{formatCurrency(amount)}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <label>
                    <span className="mb-2 block text-sm font-semibold text-white/70">Full Name</span>
                    <input value={form.name} onChange={(event) => setForm({ ...form, name: toProperCase(event.target.value) })} className="field" />
                </label>
                <label>
                    <span className="mb-2 block text-sm font-semibold text-white/70">Academy</span>
                    <input value={form.academy} onChange={(event) => setForm({ ...form, academy: toProperCase(event.target.value) })} className="field" />
                </label>
                {(config.requiresCoachName || registration.coachName) && (
                    <label>
                        <span className="mb-2 block text-sm font-semibold text-white/70">Coach Name</span>
                        <input value={form.coachName} onChange={(event) => setForm({ ...form, coachName: toProperCase(event.target.value) })} className="field" />
                    </label>
                )}
                {config.requiresGuardianDetails && (
                    <>
                        <label>
                            <span className="mb-2 block text-sm font-semibold text-white/70">Mother&apos;s Name</span>
                            <input value={form.motherName} onChange={(event) => setForm({ ...form, motherName: toProperCase(event.target.value) })} className="field" />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm font-semibold text-white/70">Father&apos;s Name</span>
                            <input value={form.fatherName} onChange={(event) => setForm({ ...form, fatherName: toProperCase(event.target.value) })} className="field" />
                        </label>
                    </>
                )}
                <label>
                    <span className="mb-2 block text-sm font-semibold text-white/70">Gender</span>
                    <select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as "" | Gender })} className="field">
                        <option value="">Select gender</option>
                        <option value="male">Male / Boy</option>
                        <option value="female">Female / Girl</option>
                    </select>
                </label>
                <label>
                    <span className="mb-2 block text-sm font-semibold text-white/70">Date of Birth</span>
                    <input type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} className="field" />
                </label>
                <label>
                    <span className="mb-2 block text-sm font-semibold text-white/70">Phone</span>
                    <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="field" />
                </label>
                {config.requiresAddress && (
                    <label className="md:col-span-2">
                        <span className="mb-2 block text-sm font-semibold text-white/70">Address</span>
                        <textarea value={form.address} onChange={(event) => setForm({ ...form, address: toProperCase(event.target.value) })} className="field min-h-24" />
                    </label>
                )}
                {config.relayBooking.enabled ? <div className="md:col-span-2"><RelaySelector competition={{ slug: competitionSlug, config } as PublicCompetition} entries={entries} gender={form.gender} dateOfBirth={form.dateOfBirth} date={form.preferredDate} slot={form.preferredSlot} currentBooking={registration.relayBooking} refreshKey={relayRefresh} onChange={(preferredDate, preferredSlot) => setForm((current) => ({ ...current, preferredDate, preferredSlot }))} /></div> : <><label>
                    <span className="mb-2 block text-sm font-semibold text-white/70">Competition Date</span>
                    <select value={form.preferredDate} onChange={(event) => {
                        const preferredDate = event.target.value
                        const slots = availableDays.find((day) => day.date === preferredDate)?.slots ?? []
                        const preferredSlot = preferredDate === bookedDate ? registration.preferredSlot : slots.includes(form.preferredSlot) ? form.preferredSlot : ""
                        setForm({ ...form, preferredDate, preferredSlot })
                    }} className="field">
                        {!bookedDay && <option value={bookedDate}>{bookedDate || "Unrecorded"}</option>}
                        {availableDays.map((day) => <option key={day.date} value={day.date}>{day.label}</option>)}
                    </select>
                </label>
                <label>
                    <span className="mb-2 block text-sm font-semibold text-white/70">Time Slot</span>
                    <select value={form.preferredSlot} onChange={(event) => setForm({ ...form, preferredSlot: event.target.value })} className="field">
                        <option value="">Select a time slot</option>
                        {selectedSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                    </select>
                </label></>}
                <label>
                    <span className="mb-2 block text-sm font-semibold text-white/70">Payment Mode</span>
                    <select value={form.paymentMode} onChange={(event) => setForm({ ...form, paymentMode: event.target.value as PaymentMode | "", utrNumber: "" })} className="field">
                        {bharatCup && <option value="">Unrecorded</option>}
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="neft">NEFT</option>
                        <option value="imps">IMPS</option>
                        <option value="rtgs">RTGS</option>
                    </select>
                </label>
                <label>
                    <span className="mb-2 block text-sm font-semibold text-white/70">Payment Status</span>
                    <select value={form.paymentStatus} onChange={(event) => setForm({ ...form, paymentStatus: event.target.value as RegistrationPaymentStatus })} className="field">
                        {bharatCup && <option value={UNRECORDED_PAYMENT}>Unrecorded</option>}
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Sponsored">Sponsored</option>
                    </select>
                </label>
                {isOnlinePaid && (
                    <label>
                        <span className="mb-2 block text-sm font-semibold text-white/70">{form.paymentMode === "upi" ? "12-digit UTR" : "Transaction Reference / UTR"}</span>
                        <input
                            value={form.utrNumber}
                            onChange={(event) => setForm({ ...form, utrNumber: form.paymentMode === "upi" ? event.target.value.replace(/\D/g, "").slice(0, 12) : event.target.value.slice(0, 64) })}
                            className="field"
                            inputMode={form.paymentMode === "upi" ? "numeric" : "text"}
                        />
                    </label>
                )}
            </div>

            <div className="mt-5 space-y-4">
                {bharatCup && registration.entries.some((entry) => entry.bharatCupResult) && (
                    <p className="text-sm text-white/65">Imported matches: {registration.entries.filter((entry) => entry.bharatCupResult).map((entry) => entry.categoryCode).join(", ")}</p>
                )}
                {config.events.map((event) => {
                    const categories = categoriesByEvent.get(event.id) ?? []
                    const disabled = !canUseEvent(event.id)
                    return (
                        <div key={event.id} className={`rounded-md border p-4 ${disabled ? "border-white/5 bg-black/20 opacity-45" : "border-white/10 bg-black/25"}`}>
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                <p className="font-bold">{event.title}</p>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37]">{event.ruleSet} {event.discipline}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {!form.gender || age === null ? (
                                    <p className="text-sm text-white/45">Enter gender and date of birth to unlock eligible categories.</p>
                                ) : categories.length ? categories.map((category) => (
                                    <button
                                        key={category.code}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => toggleEntry(event.id, category.code)}
                                        className={`rounded-md border px-3 py-2 text-left text-sm transition ${isEntrySelected(event.id, category.code) ? "border-[#D4AF37] bg-[#D4AF37] text-black" : "border-white/10 bg-black/30 text-white/75 hover:border-[#D4AF37]/60"}`}
                                    >
                                        <span className="block font-bold">{category.code}</span>
                                        <span className="text-xs">{category.label.replace(event.title, "").trim()}</span>
                                        <span className="mt-1 block text-xs font-bold">
                                            {formatCurrency(getEntryFee(category, config, isSelectedEntryPara({ eventId: event.id, categoryCode: category.code })))}
                                        </span>
                                    </button>
                                )) : (
                                    <p className="text-sm text-white/45">No eligible categories for this event.</p>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {invalidEntries.length > 0 && (
                <p className="mt-4 rounded-md border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                    Some selected categories are no longer eligible after the current gender or DOB change.
                </p>
            )}
            {removedScoredEntries.length > 0 && (
                <p className="mt-4 rounded-md border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
                    Saving will remove {removedScoredEntries.length} scored entry{removedScoredEntries.length === 1 ? "" : "ies"} after confirmation.
                </p>
            )}
            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

            <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={() => save()} disabled={saving} className="admin-button gold disabled:opacity-60">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                    {saving ? "Saving..." : "Save Changes"}
                </button>
                <button onClick={onCancel} disabled={saving} className="admin-button disabled:opacity-60">
                    <X className="h-4 w-4" />
                    Cancel
                </button>
            </div>
        </div>
    )
}

function PaymentConfirmation({ registrationId, adminPin, competitionSlug, onPayment }: { registrationId: string; adminPin: string; competitionSlug: string; onPayment: (row: AdminRegistration) => void }) {
    const [coachName, setCoachName] = React.useState(coachNames[0])
    const [coachCode, setCoachCode] = React.useState("")
    const [paymentMode, setPaymentMode] = React.useState<PaymentMode>("cash")
    const [utrNumber, setUtrNumber] = React.useState("")
    const [savingStatus, setSavingStatus] = React.useState<PaymentStatus | "">("")
    const [error, setError] = React.useState("")
    const isOnline = isOnlinePaymentMode(paymentMode)
    const canSubmit = Boolean(coachCode) && (!isOnline || !getPaymentReferenceError(paymentMode, utrNumber))

    const updatePayment = async (paymentStatus: Exclude<PaymentStatus, "Pending">) => {
        setSavingStatus(paymentStatus)
        setError("")
        try {
            const response = await fetch(scopedAdminPath(competitionSlug, `/registrations/${registrationId}/payment`), {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
                body: JSON.stringify({ coachName, coachCode, paymentStatus, paymentMode, utrNumber }),
            })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to update payment status.")
            setCoachCode("")
            setUtrNumber("")
            onPayment(data.registration as AdminRegistration)
        } catch (updateError) {
            setError(updateError instanceof Error ? updateError.message : "Unable to update payment status.")
        } finally {
            setSavingStatus("")
        }
    }

    return (
        <div className="mb-6 rounded-md border border-amber-400/20 bg-amber-400/[0.06] p-4">
            <div className="mb-3">
                <p className="font-bold text-amber-100">Pending Payment Action</p>
                <p className="mt-1 text-sm text-white/50">Select the method, confirm your coach code, and mark this payment.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-[160px_160px_1fr]">
                <select value={coachName} onChange={(event) => setCoachName(event.target.value)} className="field">
                    {coachNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
                <select value={paymentMode} onChange={(event) => { setPaymentMode(event.target.value as PaymentMode); setUtrNumber("") }} className="field">
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="neft">NEFT</option>
                    <option value="imps">IMPS</option>
                    <option value="rtgs">RTGS</option>
                </select>
                <input
                    value={coachCode}
                    onChange={(event) => setCoachCode(event.target.value)}
                    type="password"
                    className="field"
                    placeholder="Coach code"
                />
                {isOnline && (
                    <input
                        value={utrNumber}
                        onChange={(event) => setUtrNumber(paymentMode === "upi" ? event.target.value.replace(/\D/g, "").slice(0, 12) : event.target.value.slice(0, 64))}
                        className="field md:col-span-3"
                        inputMode={paymentMode === "upi" ? "numeric" : "text"}
                        placeholder={paymentMode === "upi" ? "12-digit UTR number" : "Transaction reference / UTR"}
                    />
                )}
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
                <button
                    onClick={() => updatePayment("Paid")}
                    disabled={Boolean(savingStatus) || !canSubmit}
                    className="h-11 rounded-md bg-emerald-500 px-4 font-bold text-black disabled:opacity-60"
                >
                    {savingStatus === "Paid" ? "Saving..." : "Mark Paid"}
                </button>
                {!isOnline && (
                    <button
                        onClick={() => updatePayment("Sponsored")}
                        disabled={Boolean(savingStatus) || !canSubmit}
                        className="h-11 rounded-md bg-sky-400 px-4 font-bold text-black disabled:opacity-60"
                    >
                        {savingStatus === "Sponsored" ? "Saving..." : "Mark Sponsored"}
                    </button>
                )}
            </div>
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        </div>
    )
}

function ScoreRow({
    registration,
    entry,
    adminPin,
    competitionSlug,
    onChanged, onScore,
}: {
    registration: Pick<AdminRegistration, "name" | "phone">
    entry: AdminEntry
    adminPin: string
    competitionSlug: string
    onScore: (entry: AdminEntry) => void
    onChanged: () => void
}) {
    const ruleSet = getRuleSet(entry)
    const format = getScoringFormat(ruleSet, entry)
    const seriesCount = format.seriesCount
    const initialSeriesScores = Array.isArray(entry.seriesScores) ? entry.seriesScores : []
    const savedScore = isEntryScored(entry)
    const incompatibleScore = format.isCustomFormat && !savedScore && (initialSeriesScores.length > 0 || entry.totalScore !== null)
    const maxInnerTenCount = seriesCount * format.shotsPerSeries
    const [seriesScores, setSeriesScores] = React.useState<string[]>(Array.from({ length: seriesCount }, (_, index) => incompatibleScore ? "" : String(initialSeriesScores[index] ?? "")))
    const [innerTenCount, setInnerTenCount] = React.useState(savedScore || entry.bharatCupResult ? String(entry.innerTenCount) : "")
    const [saving, setSaving] = React.useState(false)
    const [deleting, setDeleting] = React.useState(false)
    const [error, setError] = React.useState("")
    const parsedSeriesScores = seriesScores.map((score) => Number(score))
    const validSeriesScores = parsedSeriesScores.filter((score, index) => isValidSeriesTotal(seriesScores[index], format) && Number.isFinite(score))
    const validInnerTenCount = !format.usesInnerTens || isValidInnerTenText(innerTenCount, maxInnerTenCount)
    const invalidSeriesScoreIndexes = seriesScores
        .map((score, index) => ({ score, index }))
        .filter(({ score }) => score.trim() && !isValidSeriesTotal(score, format))
        .map(({ index }) => index)
    const invalidInnerTenCount = innerTenCount.trim() && !validInnerTenCount
    const liveTotal = Number(validSeriesScores.reduce((sum, score) => sum + score, 0).toFixed(format.decimalPlaces))
    const liveInnerTens = validInnerTenCount ? Number(innerTenCount) : entry.innerTenCount
    const complete = validSeriesScores.length === seriesCount && validInnerTenCount
    const resultsUrl = typeof window === "undefined" ? `/competitions/${competitionSlug}/results` : `${window.location.origin}/competitions/${competitionSlug}/results`
    const whatsappUrl = buildWhatsAppScoreUrl(registration, entry, resultsUrl)

    React.useEffect(() => {
        const currentSeriesScores = Array.isArray(entry.seriesScores) ? entry.seriesScores : []
        setSeriesScores(Array.from({ length: seriesCount }, (_, index) => incompatibleScore ? "" : String(currentSeriesScores[index] ?? "")))
        setInnerTenCount(savedScore || entry.bharatCupResult ? String(entry.innerTenCount) : "")
        setError("")
    }, [entry.id, entry.seriesScores, entry.innerTenCount, entry.bharatCupResult, savedScore, seriesCount, incompatibleScore])

    const updateSeriesScore = (index: number, value: string) => {
        const next = [...seriesScores]
        next[index] = value.trim()
        setSeriesScores(next)
        setError("")
    }

    const save = async () => {
        if (!complete) {
            const totalText = `0 to ${format.maxSeriesScore} ${format.decimalPlaces ? "with at most one decimal" : "as whole numbers"}`
            const invalidScore = invalidSeriesScoreIndexes[0]
            if (invalidScore !== undefined) {
                setError(`Series ${invalidScore + 1} total must be ${totalText}.`)
            } else if (invalidInnerTenCount) {
                setError(`Total 10x must be a whole number from 0 to ${maxInnerTenCount}.`)
            } else {
                setError(`Enter all ${seriesCount} series totals (${totalText})${format.usesInnerTens ? ` and total 10x from 0 to ${maxInnerTenCount}` : ""}.`)
            }
            return
        }

        setSaving(true)
        setError("")
        try {
            const response = await fetch(scopedAdminPath(competitionSlug, `/entries/${entry.id}/score`), {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
                body: JSON.stringify({ seriesScores, ...(format.usesInnerTens ? { innerTenCount } : {}) }),
            })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to save score.")
            onScore(data.entry as AdminEntry)
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Unable to save score.")
        } finally {
            setSaving(false)
        }
    }

    const deleteEntry = async () => {
        const confirmed = window.confirm(`Delete this person and all their entries from the database?\n\nThis removes ${entry.categoryCode} - ${entry.categoryLabel} and any other entries under the same registration.`)
        if (!confirmed) return

        setDeleting(true)
        setError("")
        try {
            const response = await fetch(scopedAdminPath(competitionSlug, `/entries/${entry.id}/score`), {
                method: "DELETE",
                headers: { "x-admin-pin": adminPin },
            })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to delete registration.")
            onChanged()
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "Unable to delete registration.")
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold">{entry.categoryCode} - {entry.categoryLabel}</p>
                        {entry.isPara && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/35 bg-sky-400/10 px-2 py-0.5 text-xs font-bold text-sky-100">
                                <Accessibility className="h-3.5 w-3.5" />
                                Para
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-white/45">{entry.ruleSet} | {seriesCount} series × {format.shotsPerSeries} shots | enter series totals{format.usesInnerTens ? " and total 10x" : ""}</p>
                </div>
                <div className="flex flex-wrap items-start justify-end gap-2">
                    <div className={`grid ${format.usesInnerTens ? "grid-cols-3" : "grid-cols-2"} gap-2 text-right`}>
                        <MiniCount label="Total" value={format.isCustomFormat ? `${formatScore(liveTotal, ruleSet, entry)} / ${format.maxTotalScore}` : complete ? formatScore(liveTotal, ruleSet, entry) : formatScore(entry.totalScore, ruleSet, entry)} />
                        {format.usesInnerTens && <MiniCount label="10x" value={complete ? liveInnerTens : entry.innerTenCount} />}
                        <MiniCount label="Scores" value={`${validSeriesScores.length}/${seriesCount}`} />
                    </div>
                    <button
                        onClick={deleteEntry}
                        disabled={saving || deleting}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 text-sm font-bold text-red-200 transition hover:border-red-300 disabled:opacity-60"
                    >
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Delete Person
                    </button>
                    {savedScore && (
                        whatsappUrl ? (
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 text-sm font-bold text-emerald-100 transition hover:border-emerald-300"
                            >
                                <MessageCircle className="h-4 w-4" />
                                Send WhatsApp
                            </a>
                        ) : (
                            <span className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-white/35">
                                WhatsApp unavailable
                            </span>
                        )
                    )}
                </div>
            </div>

            {entry.bharatCupResult?.flaggedSeriesTwo != null && typeof initialSeriesScores[1] !== "number" && (
                <p className="mb-4 rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                    Series 2 is under review. The workbook lists {entry.bharatCupResult.flaggedSeriesTwo} and a total of {entry.totalScore}.
                </p>
            )}
            {incompatibleScore && <p className="mb-4 rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">The saved score does not match this event’s format. Re-enter all series to update it.</p>}
            {format.usesInnerTens && <div className="mb-4 rounded-md border border-white/10 bg-black/25 p-3">
                <label>
                    <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-white/45">Total 10x in match</span>
                    <input
                        value={innerTenCount}
                        onChange={(event) => setInnerTenCount(event.target.value.trim())}
                        className={`field max-w-xs px-3 py-2 text-center ${invalidInnerTenCount ? "border-red-400 text-red-200" : ""}`}
                        inputMode="numeric"
                        placeholder="0"
                    />
                </label>
            </div>}

            <div className="space-y-4">
                {(format.stages.length ? format.stages : [{ label: "", startIndex: 0, seriesCount, maxScore: format.maxTotalScore }]).map((stage) => {
                    const subtotal = seriesScores.slice(stage.startIndex, stage.startIndex + stage.seriesCount)
                        .reduce((sum, score) => sum + (isValidSeriesTotal(score, format) ? Number(score) : 0), 0)
                    return <fieldset key={stage.label} className="min-w-0 rounded-md border border-white/10 bg-black/25 p-3">
                        {stage.label && <legend className="px-2 font-bold text-[#D4AF37]">{stage.label} — {subtotal} / {stage.maxScore}</legend>}
                        <div className={`grid gap-3 ${stage.seriesCount % 3 === 0 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                            {Array.from({ length: stage.seriesCount }, (_, index) => {
                                const seriesIndex = stage.startIndex + index
                                return <label key={seriesIndex} className="min-w-0">
                                    <span className="mb-1 block text-xs font-bold text-white/60">{stage.label ? `${stage.label} ` : ""}Series {index + 1}{format.isCustomFormat ? ` / ${format.maxSeriesScore}` : ""}</span>
                                    <input
                                        aria-label={`${stage.label ? `${stage.label} ` : ""}Series ${index + 1}`}
                                        value={seriesScores[seriesIndex]}
                                        onChange={(event) => updateSeriesScore(seriesIndex, event.target.value)}
                                        className={`field w-full min-w-0 px-3 py-2 text-center ${invalidSeriesScoreIndexes.includes(seriesIndex) ? "border-red-400 text-red-200" : ""}`}
                                        inputMode={format.decimalPlaces ? "decimal" : "numeric"}
                                        placeholder={format.decimalPlaces ? "103.4" : format.maxSeriesScore === 50 ? "45" : "95"}
                                    />
                                </label>
                            })}
                        </div>
                    </fieldset>
                })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
                <button onClick={save} disabled={saving || deleting} className="h-11 rounded-md bg-[#D4AF37] px-4 font-bold text-black disabled:opacity-60">
                    {saving ? "Saving..." : "Save Score"}
                </button>
                {error ? (
                    <p className="text-sm text-red-300">{error}</p>
                ) : (
                    <p className="text-sm text-white/45">{complete ? "Ready for ranking." : `Complete all series totals${format.usesInnerTens ? " and total 10x" : ""} to rank this entry.`}</p>
                )}
            </div>
        </div>
    )
}

function buildRangeRows(registrations: AdminRegistration[]) {
    const rows = new Map<string, {
        name: string
        students: number
        entries: number
        paid: number
        pending: number
        sponsored: number
        collected: number
        registrations: AdminRegistration[]
    }>()

    registrations.forEach((registration) => {
        const name = academyLabel(registration.academy)
        const row = rows.get(name) ?? {
            name,
            students: 0,
            entries: 0,
            paid: 0,
            pending: 0,
            sponsored: 0,
            collected: 0,
            registrations: [],
        }

        row.students += 1
        row.entries += registration.entries.length
        row.paid += registration.paymentStatus === "Paid" ? 1 : 0
        row.pending += registration.paymentStatus === "Pending" ? 1 : 0
        row.sponsored += registration.paymentStatus === "Sponsored" ? 1 : 0
        row.collected += registration.paymentStatus === "Paid" ? registration.amount : 0
        row.registrations.push(registration)
        rows.set(name, row)
    })

    return Array.from(rows.values()).sort((a, b) => b.entries - a.entries || a.name.localeCompare(b.name))
}

function buildEntryRows(entries: AdminEntry[], getName: (entry: AdminEntry) => string) {
    const rows = new Map<string, number>()
    entries.forEach((entry) => {
        const name = getName(entry)
        rows.set(name, (rows.get(name) ?? 0) + 1)
    })
    return Array.from(rows, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
}

function buildRegistrationRows(registrations: AdminRegistration[], getName: (registration: AdminRegistration) => string) {
    const rows = new Map<string, number>()
    registrations.forEach((registration) => {
        const name = getName(registration)
        rows.set(name, (rows.get(name) ?? 0) + 1)
    })
    return Array.from(rows, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
}

function ChartPanel({ title, rows }: { title: string; rows: { name: string; value: number }[] }) {
    const max = rows[0]?.value ?? 1

    return (
        <div className="rounded-lg border border-white/10 bg-neutral-950 p-5">
            <h2 className="mb-4 text-xl font-black">{title}</h2>
            <div className="space-y-3">
                {rows.length ? rows.map((row) => (
                    <div key={row.name}>
                        <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                            <p className="truncate text-white/75">{row.name}</p>
                            <p className="font-bold text-[#D4AF37]">{row.value}</p>
                        </div>
                        <Bar value={row.value} max={max} />
                    </div>
                )) : (
                    <p className="text-sm text-white/50">No data yet.</p>
                )}
            </div>
        </div>
    )
}

function Bar({ value, max }: { value: number; max: number }) {
    const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0
    return (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#D4AF37]" style={{ width: `${width}%` }} />
        </div>
    )
}

function PrintableCard({ registration, variant }: { registration: AdminRegistration; variant: "competitor" | "office" }) {
    const eventRows = registration.entries.map(entry => `${cardMatchCode(entry.categoryCode, registration.isService)} - ${entry.categoryLabel}`)
    while (eventRows.length < 3) eventRows.push("")

    return (
        <section className="salvo-print-section">
            <Image src="/salvo-logo.png" alt="" width={430} height={172} className="salvo-print-watermark" aria-hidden="true" />
            <div className="salvo-section-title-row">
                {variant === "office" ? <h4>FOR OFFICE USE ONLY</h4> : <span />}
                <p><span>Date:</span> {dateOnly(registration.preferredDate) || "Unrecorded"}</p>
            </div>
            <div className="salvo-print-fields">
                <CardLine label="1. Name" value={registration.name} />
                <CardLine label="2. Club Name" value={registration.academy} />
                {registration.coachName && <CardLine label="2a. Coach Name" value={registration.coachName} />}
                <CardLine label="3. Contact" value={registration.phone} />
                <div className="salvo-category-row">
                    <p>4. Category/Event:</p>
                    <div className="salvo-category-lines">
                        {eventRows.map((value, index) => (
                            <div key={index} className="salvo-category-line">
                                <span>{String.fromCharCode(97 + index)})</span>
                                <p>{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <CardLine label="6. Amount Paid" value={formatPaymentAmount(registration)} compact />
            </div>
            <div className={`salvo-signatures ${variant === "office" ? "salvo-signatures-office" : ""}`}>
                <p>Official Signature</p>
                {variant === "competitor" && <p>Shooter Signature</p>}
            </div>
        </section>
    )
}

function CardLine({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
    return (
        <div className={`salvo-field-line ${compact ? "salvo-field-line-compact" : ""}`}>
            <p>{label}:</p>
            <span>{value}</span>
        </div>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-white/35">{label}</p>
            <p className="mt-1 font-bold">{value}</p>
        </div>
    )
}

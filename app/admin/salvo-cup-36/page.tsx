"use client"

import * as React from "react"
import Image from "next/image"
import { Download, Loader2, Lock, Medal, Printer, RefreshCw, Search, Trophy, Users } from "lucide-react"
import { formatCurrency, getSeriesCount } from "@/lib/competition"

type PaymentStatus = "Pending" | "Paid" | "Sponsored"
type PaymentMode = "cash" | "upi"

type AdminEntry = {
    id: string
    eventTitle: string
    discipline: string
    ruleSet: string
    categoryCode: string
    categoryLabel: string
    fee: number
    seriesScores: number[] | null
    totalScore: number | null
}

type AdminRegistration = {
    id: string
    name: string
    academy: string
    gender: string
    dateOfBirth: string
    phone: string
    preferredDate: string
    preferredSlot: string
    paymentMode: PaymentMode
    paymentStatus: PaymentStatus
    paymentConfirmedBy: string | null
    paymentConfirmedAt: string | null
    amount: number
    utrNumber: string | null
    screenshotPath: string | null
    createdAt: string
    entries: AdminEntry[]
}

type AdminView = "registrations" | "results"

type ResultRow = {
    registration: AdminRegistration
    entry: AdminEntry
}

const coachNames = ["piyush", "anshul", "ayush", "yogesh", "vansh", "kamal", "rahul"]

function dateOnly(value: string) {
    return value.slice(0, 10)
}

function categorySortValue(code: string) {
    const match = code.match(/^([A-Za-z]+)-(\d+)$/)
    return match ? `${match[1]}-${match[2].padStart(4, "0")}` : code
}

function paymentBadgeClass(status: PaymentStatus) {
    if (status === "Paid") return "bg-emerald-500/15 text-emerald-200"
    if (status === "Sponsored") return "bg-sky-500/15 text-sky-200"
    return "bg-amber-500/15 text-amber-200"
}

function formatPaymentAmount(registration: AdminRegistration) {
    return `${formatCurrency(registration.amount)} (${registration.paymentStatus})`
}

export default function SalvoCupAdminPage() {
    const [pin, setPin] = React.useState("")
    const [activePin, setActivePin] = React.useState("")
    const [registrations, setRegistrations] = React.useState<AdminRegistration[]>([])
    const [selectedId, setSelectedId] = React.useState("")
    const [query, setQuery] = React.useState("")
    const [filter, setFilter] = React.useState("all")
    const [view, setView] = React.useState<AdminView>("registrations")
    const [selectedCategories, setSelectedCategories] = React.useState<string[]>([])
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState("")

    const selected = registrations.find((registration) => registration.id === selectedId) ?? registrations[0]

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

    const filtered = registrations.filter((registration) => {
        const haystack = `${registration.name} ${registration.academy} ${registration.phone} ${registration.entries.map((entry) => `${entry.eventTitle} ${entry.categoryCode}`).join(" ")}`.toLowerCase()
        const matchesQuery = haystack.includes(query.toLowerCase())
        const matchesFilter = filter === "all" || registration.paymentStatus === filter || registration.entries.some((entry) => entry.ruleSet === filter || entry.discipline === filter)
        return matchesQuery && matchesFilter
    })

    React.useEffect(() => {
        setSelectedCategories((current) => {
            const availableCodes = categoryOptions.map((category) => category.code)
            const validCurrent = current.filter((code) => availableCodes.includes(code))
            if (validCurrent.length) return validCurrent
            return availableCodes
        })
    }, [categoryOptions])

    const loadRegistrations = React.useCallback(async (adminPin = activePin) => {
        if (!adminPin) return
        setIsLoading(true)
        setError("")
        try {
            const response = await fetch("/api/admin/registrations", { headers: { "x-admin-pin": adminPin } })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error ?? "Unable to load registrations.")
            setRegistrations(data.registrations)
            setSelectedId((current) => current || data.registrations[0]?.id || "")
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load registrations.")
        } finally {
            setIsLoading(false)
        }
    }, [activePin])

    const login = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setActivePin(pin)
        await loadRegistrations(pin)
    }

    const exportWorkbook = async () => {
        setError("")
        const response = await fetch("/api/admin/export", { headers: { "x-admin-pin": activePin } })
        if (!response.ok) {
            const data = await response.json()
            setError(data.error ?? "Export failed.")
            return
        }
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = "36th-salvo-cup-registrations.xlsx"
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
                        <h1 className="mt-2 text-4xl font-black">36th Salvo Cup Admin</h1>
                    </div>
                    {activePin && (
                        <div className="flex gap-3">
                            <button onClick={() => loadRegistrations()} className="admin-button">
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
                            <button
                                onClick={() => setView("registrations")}
                                className={`admin-button ${view === "registrations" ? "gold" : ""}`}
                            >
                                <Users className="h-4 w-4" />
                                Registrations
                            </button>
                            <button
                                onClick={() => setView("results")}
                                className={`admin-button ${view === "results" ? "gold" : ""}`}
                            >
                                <Medal className="h-4 w-4" />
                                Results
                            </button>
                        </div>

                        {view === "results" ? (
                            <ResultsView
                                registrations={registrations}
                                categoryOptions={categoryOptions}
                                selectedCategories={selectedCategories}
                                onSelectedCategoriesChange={setSelectedCategories}
                            />
                        ) : (
                    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
                        <section className="rounded-lg border border-white/10 bg-neutral-950 p-5">
                            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px]">
                                <label className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                                    <input value={query} onChange={(event) => setQuery(event.target.value)} className="field pl-10" placeholder="Search name, academy, phone..." />
                                </label>
                                <select value={filter} onChange={(event) => setFilter(event.target.value)} className="field">
                                    <option value="all">All</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Sponsored">Sponsored</option>
                                    <option value="Pending">Pending</option>
                                    <option value="ISSF">ISSF</option>
                                    <option value="NR">NR</option>
                                    <option value="pistol">Pistol</option>
                                    <option value="rifle">Rifle</option>
                                </select>
                            </div>

                            {isLoading ? (
                                <div className="flex h-52 items-center justify-center text-white/50">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : (
                                <div className="max-h-[680px] space-y-3 overflow-auto pr-1">
                                    {filtered.map((registration) => (
                                        <button
                                            key={registration.id}
                                            onClick={() => setSelectedId(registration.id)}
                                            className={`w-full rounded-md border p-4 text-left transition ${selected?.id === registration.id ? "border-[#D4AF37] bg-[#D4AF37]/10" : "border-white/10 bg-white/[0.03] hover:border-white/30"}`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-bold">{registration.name}</p>
                                                    <p className="text-sm text-white/55">{registration.academy}</p>
                                                </div>
                                                <span className={`rounded-full px-2 py-1 text-xs font-bold ${paymentBadgeClass(registration.paymentStatus)}`}>
                                                    {registration.paymentStatus}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-xs text-white/45">{dateOnly(registration.preferredDate)} | {registration.preferredSlot}</p>
                                            <p className="mt-2 text-sm text-[#D4AF37]">{formatCurrency(registration.amount)} | {registration.entries.length} entries</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="rounded-lg border border-white/10 bg-neutral-950 p-5">
                            {selected ? (
                                <RegistrationDetail registration={selected} adminPin={activePin} onChanged={() => loadRegistrations()} />
                            ) : (
                                <p className="text-white/50">No registrations found.</p>
                            )}
                        </section>
                    </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function ResultsView({
    registrations,
    categoryOptions,
    selectedCategories,
    onSelectedCategoriesChange,
}: {
    registrations: AdminRegistration[]
    categoryOptions: { code: string; label: string }[]
    selectedCategories: string[]
    onSelectedCategoriesChange: (categories: string[]) => void
}) {
    const selectedSet = React.useMemo(() => new Set(selectedCategories), [selectedCategories])
    const groupedResults = React.useMemo(() => {
        const groups = new Map<string, { label: string; rows: ResultRow[] }>()

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
            rows: group.rows.sort((a, b) => {
                const aScored = a.entry.totalScore !== null
                const bScored = b.entry.totalScore !== null
                if (aScored !== bScored) return aScored ? -1 : 1
                if (a.entry.totalScore !== b.entry.totalScore) return (b.entry.totalScore ?? 0) - (a.entry.totalScore ?? 0)
                return a.registration.name.localeCompare(b.registration.name)
            }),
        })).sort((a, b) => categorySortValue(a.code).localeCompare(categorySortValue(b.code)))
    }, [registrations, selectedSet])

    const toggleCategory = (code: string) => {
        onSelectedCategoriesChange(
            selectedSet.has(code)
                ? selectedCategories.filter((category) => category !== code)
                : [...selectedCategories, code]
        )
    }

    return (
        <section className="rounded-lg border border-white/10 bg-neutral-950 p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black">Category Results</h2>
                    <p className="mt-1 text-sm text-white/50">Categories are shown in ascending order. Scores rank highest to lowest.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => onSelectedCategoriesChange(categoryOptions.map((category) => category.code))} className="admin-button">
                        Select All
                    </button>
                    <button onClick={() => onSelectedCategoriesChange([])} className="admin-button">
                        Clear
                    </button>
                </div>
            </div>

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
                            <table className="w-full min-w-[720px] text-left text-sm">
                                <thead className="text-xs uppercase tracking-[0.16em] text-white/40">
                                    <tr className="border-b border-white/10">
                                        <th className="px-4 py-3">Rank</th>
                                        <th className="px-4 py-3">Shooter</th>
                                        <th className="px-4 py-3">Academy</th>
                                        <th className="px-4 py-3">Event</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {category.rows.map((row, index) => (
                                        <tr key={row.entry.id} className="border-b border-white/5 last:border-0">
                                            <td className="px-4 py-3 font-bold">{row.entry.totalScore === null ? "-" : index + 1}</td>
                                            <td className="px-4 py-3">{row.registration.name}</td>
                                            <td className="px-4 py-3 text-white/65">{row.registration.academy}</td>
                                            <td className="px-4 py-3 text-white/65">{row.entry.eventTitle}</td>
                                            <td className="px-4 py-3 text-right text-lg font-black text-[#D4AF37]">{row.entry.totalScore ?? "-"}</td>
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

function RegistrationDetail({ registration, adminPin, onChanged }: { registration: AdminRegistration; adminPin: string; onChanged: () => void }) {
    return (
        <div>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black">{registration.name}</h2>
                    <p className="text-white/55">{registration.academy} | {registration.phone}</p>
                    <p className="mt-2 text-sm text-white/45">{dateOnly(registration.preferredDate)} | {registration.preferredSlot}</p>
                </div>
                <button onClick={() => window.print()} className="admin-button gold">
                    <Printer className="h-4 w-4" />
                    Print Card
                </button>
            </div>

            <div className="mb-6 grid gap-3 md:grid-cols-4">
                <Stat label="Amount" value={formatCurrency(registration.amount)} />
                <Stat label="Payment" value={`${registration.paymentMode} / ${registration.paymentStatus}`} />
                <Stat label="UTR" value={registration.utrNumber ?? "-"} />
                <Stat label="Confirmed By" value={registration.paymentConfirmedBy ?? "-"} />
            </div>

            {registration.paymentConfirmedAt && (
                <p className="mb-6 text-sm text-white/45">Payment confirmed on {dateOnly(registration.paymentConfirmedAt)}.</p>
            )}

            {registration.screenshotPath && (
                <a href={registration.screenshotPath} target="_blank" rel="noreferrer" className="mb-6 inline-block text-sm font-bold text-[#D4AF37] underline">
                    View payment screenshot
                </a>
            )}

            {registration.paymentStatus === "Pending" && (
                <PaymentConfirmation registrationId={registration.id} adminPin={adminPin} onChanged={onChanged} />
            )}

            <div className="mb-8 space-y-4">
                {registration.entries.map((entry) => (
                    <ScoreRow key={entry.id} entry={entry} adminPin={adminPin} onChanged={onChanged} />
                ))}
            </div>

            <div className="print-card salvo-competitor-card bg-white text-black">
                <div className="salvo-print-header">
                    <div className="salvo-print-logo-frame">
                        <Image src="/salvo-logo.png" alt="Salvo Shooters Arena" width={260} height={104} className="salvo-print-logo" />
                    </div>
                    <h2>36th Salvo Cup Shooting Championship</h2>
                    <h3>COMPETITOR CARD</h3>
                </div>
                <PrintableCard registration={registration} variant="competitor" />
                <div className="salvo-section-divider" />
                <PrintableCard registration={registration} variant="office" />
            </div>
        </div>
    )
}

function PaymentConfirmation({ registrationId, adminPin, onChanged }: { registrationId: string; adminPin: string; onChanged: () => void }) {
    const [coachName, setCoachName] = React.useState(coachNames[0])
    const [coachCode, setCoachCode] = React.useState("")
    const [paymentMode, setPaymentMode] = React.useState<PaymentMode>("cash")
    const [utrNumber, setUtrNumber] = React.useState("")
    const [savingStatus, setSavingStatus] = React.useState<PaymentStatus | "">("")
    const [error, setError] = React.useState("")
    const isOnline = paymentMode === "upi"
    const canSubmit = Boolean(coachCode) && (!isOnline || /^\d{12}$/.test(utrNumber))

    const updatePayment = async (paymentStatus: Exclude<PaymentStatus, "Pending">) => {
        setSavingStatus(paymentStatus)
        setError("")
        try {
            const response = await fetch(`/api/admin/registrations/${registrationId}/payment`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
                body: JSON.stringify({ coachName, coachCode, paymentStatus, paymentMode, utrNumber }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error ?? "Unable to update payment status.")
            setCoachCode("")
            setUtrNumber("")
            onChanged()
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
                <select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as PaymentMode)} className="field">
                    <option value="cash">Cash</option>
                    <option value="upi">Online</option>
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
                        onChange={(event) => setUtrNumber(event.target.value.replace(/\D/g, "").slice(0, 12))}
                        className="field md:col-span-3"
                        inputMode="numeric"
                        placeholder="12-digit UTR number"
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

function ScoreRow({ entry, adminPin, onChanged }: { entry: AdminEntry; adminPin: string; onChanged: () => void }) {
    const count = getSeriesCount(entry.ruleSet === "ISSF" ? "ISSF" : "NR")
    const initialScores = Array.isArray(entry.seriesScores) ? entry.seriesScores : []
    const [scores, setScores] = React.useState<string[]>(Array.from({ length: count }, (_, index) => String(initialScores[index] ?? "")))
    const [saving, setSaving] = React.useState(false)

    React.useEffect(() => {
        const currentScores = Array.isArray(entry.seriesScores) ? entry.seriesScores : []
        setScores(Array.from({ length: count }, (_, index) => String(currentScores[index] ?? "")))
    }, [count, entry.id, entry.seriesScores])

    const save = async () => {
        setSaving(true)
        await fetch(`/api/admin/entries/${entry.id}/score`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
            body: JSON.stringify({ scores }),
        })
        setSaving(false)
        onChanged()
    }

    return (
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="font-bold">{entry.categoryCode} - {entry.categoryLabel}</p>
                    <p className="text-sm text-white/45">{entry.ruleSet} | {count} series</p>
                </div>
                <p className="text-xl font-black text-[#D4AF37]">{entry.totalScore ?? scores.reduce((sum, score) => sum + (Number(score) || 0), 0)}</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
                {scores.map((score, index) => (
                    <label key={index} className="w-20">
                        <span className="mb-1 block text-xs text-white/45">S{index + 1}</span>
                        <input value={score} onChange={(event) => {
                            const next = [...scores]
                            next[index] = event.target.value
                            setScores(next)
                        }} className="field" inputMode="numeric" />
                    </label>
                ))}
                <button onClick={save} disabled={saving} className="h-11 rounded-md bg-[#D4AF37] px-4 font-bold text-black disabled:opacity-60">
                    {saving ? "Saving..." : "Save"}
                </button>
            </div>
        </div>
    )
}

function PrintableCard({ registration, variant }: { registration: AdminRegistration; variant: "competitor" | "office" }) {
    const eventRows = [
        registration.entries[0] ? `${registration.entries[0].categoryCode} - ${registration.entries[0].categoryLabel}` : "",
        registration.entries[1] ? `${registration.entries[1].categoryCode} - ${registration.entries[1].categoryLabel}` : "",
        registration.entries[2] ? `${registration.entries[2].categoryCode} - ${registration.entries[2].categoryLabel}` : "",
    ]

    return (
        <section className="salvo-print-section">
            <Image src="/salvo-logo.png" alt="" width={430} height={172} className="salvo-print-watermark" aria-hidden="true" />
            <div className="salvo-section-title-row">
                {variant === "office" ? <h4>FOR OFFICE USE ONLY</h4> : <span />}
                <p><span>Date:</span> {dateOnly(registration.preferredDate)}</p>
            </div>
            <div className="salvo-print-fields">
                <CardLine label="1. Name" value={registration.name} />
                <CardLine label="2. Club Name" value={registration.academy} />
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

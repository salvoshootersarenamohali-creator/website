"use client"

import * as React from "react"
import Image from "next/image"
import { Download, Loader2, Lock, Printer, RefreshCw, Search, Trophy } from "lucide-react"
import { formatCurrency, getSeriesCount } from "@/lib/competition"

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
    paymentMode: string
    paymentStatus: string
    amount: number
    utrNumber: string | null
    screenshotPath: string | null
    createdAt: string
    entries: AdminEntry[]
}

function dateOnly(value: string) {
    return value.slice(0, 10)
}

export default function SalvoCupAdminPage() {
    const [pin, setPin] = React.useState("")
    const [activePin, setActivePin] = React.useState("")
    const [registrations, setRegistrations] = React.useState<AdminRegistration[]>([])
    const [selectedId, setSelectedId] = React.useState("")
    const [query, setQuery] = React.useState("")
    const [filter, setFilter] = React.useState("all")
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState("")

    const selected = registrations.find((registration) => registration.id === selectedId) ?? registrations[0]

    const filtered = registrations.filter((registration) => {
        const haystack = `${registration.name} ${registration.academy} ${registration.phone} ${registration.entries.map((entry) => `${entry.eventTitle} ${entry.categoryCode}`).join(" ")}`.toLowerCase()
        const matchesQuery = haystack.includes(query.toLowerCase())
        const matchesFilter = filter === "all" || registration.paymentStatus === filter || registration.entries.some((entry) => entry.ruleSet === filter || entry.discipline === filter)
        return matchesQuery && matchesFilter
    })

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
                                                <span className={`rounded-full px-2 py-1 text-xs font-bold ${registration.paymentStatus === "Paid" ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"}`}>
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
        </div>
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
                <Stat label="Entries" value={String(registration.entries.length)} />
            </div>

            {registration.screenshotPath && (
                <a href={registration.screenshotPath} target="_blank" rel="noreferrer" className="mb-6 inline-block text-sm font-bold text-[#D4AF37] underline">
                    View payment screenshot
                </a>
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

function ScoreRow({ entry, adminPin, onChanged }: { entry: AdminEntry; adminPin: string; onChanged: () => void }) {
    const count = getSeriesCount(entry.ruleSet === "ISSF" ? "ISSF" : "NR")
    const existing = Array.isArray(entry.seriesScores) ? entry.seriesScores : []
    const [scores, setScores] = React.useState<string[]>(Array.from({ length: count }, (_, index) => String(existing[index] ?? "")))
    const [saving, setSaving] = React.useState(false)

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
                <CardLine label="6. Amount Paid" value={`${formatCurrency(registration.amount)} (${registration.paymentMode === "cash" ? "Cash - Pending" : "Online - Paid"})`} compact />
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

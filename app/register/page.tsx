"use client"

import * as React from "react"
import Image from "next/image"
import { CalendarDays, CheckCircle2, CreditCard, Download, IndianRupee, Loader2, Medal, Printer, Trophy } from "lucide-react"
import {
    CategoryOption,
    ENTRY_FEE,
    Gender,
    PaymentMode,
    SelectedEntry,
    buildCategoryLabel,
    competitionEvents,
    formatCurrency,
    getAgeFromDobYear,
    getEligibleCategories,
    getEventById,
    slotOptions,
} from "@/lib/competition"

type SavedEntry = {
    id: string
    eventTitle: string
    categoryCode: string
    categoryLabel: string
    fee: number
}

type SavedRegistration = {
    id: string
    name: string
    academy: string
    phone: string
    preferredDate: string
    preferredSlot: string
    paymentMode: string
    paymentStatus: string
    amount: number
    entries: SavedEntry[]
}

const initialForm = {
    name: "",
    academy: "",
    gender: "" as "" | Gender,
    dateOfBirth: "",
    phone: "",
    preferredDate: "2026-06-05",
    preferredSlot: "8:00 AM - 11:00 AM",
    paymentMode: "upi" as PaymentMode,
    utrNumber: "",
}

function formatDateLabel(value: string) {
    const option = slotOptions.find((slot) => slot.date === value)
    return option?.label ?? value
}

export default function RegisterPage() {
    const [form, setForm] = React.useState(initialForm)
    const [entries, setEntries] = React.useState<SelectedEntry[]>([])
    const [paymentScreenshot, setPaymentScreenshot] = React.useState<File | null>(null)
    const [error, setError] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [registration, setRegistration] = React.useState<SavedRegistration | null>(null)
    const [selectionStartedWith, setSelectionStartedWith] = React.useState<"NR" | "ISSF" | null>(null)

    const age = form.dateOfBirth ? getAgeFromDobYear(form.dateOfBirth) : null
    const amount = entries.length * ENTRY_FEE
    const selectedEvents = entries.map((entry) => getEventById(entry.eventId)).filter(Boolean)
    const selectedDiscipline = selectedEvents[0]?.discipline

    const selectedSlots = React.useMemo(
        () => slotOptions.find((slot) => slot.date === form.preferredDate)?.slots ?? [],
        [form.preferredDate]
    )

    React.useEffect(() => {
        if (!selectedSlots.includes(form.preferredSlot)) {
            setForm((current) => ({ ...current, preferredSlot: selectedSlots[0] ?? "" }))
        }
    }, [form.preferredDate, form.preferredSlot, selectedSlots])

    const categoriesByEvent = React.useMemo(() => {
        const map = new Map<string, CategoryOption[]>()
        for (const event of competitionEvents) {
            map.set(event.id, age !== null && form.gender ? getEligibleCategories(event, age, form.gender) : [])
        }
        return map
    }, [age, form.gender])

    const isEntrySelected = (eventId: string, categoryCode: string) =>
        entries.some((entry) => entry.eventId === eventId && entry.categoryCode === categoryCode)

    const canUseEvent = (eventId: string) => {
        const event = getEventById(eventId)
        if (!event) return false
        if (selectedDiscipline && event.discipline !== selectedDiscipline) return false
        if (selectionStartedWith === "ISSF" && event.ruleSet === "NR") return false
        return true
    }

    const toggleEntry = (eventId: string, categoryCode: string) => {
        setError("")
        const event = getEventById(eventId)
        if (!event) return

        if (!canUseEvent(eventId)) {
            setError("Choose one discipline only. NR shooters can add ISSF, but ISSF-only selections cannot add NR.")
            return
        }

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

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError("")

        if (!form.gender) {
            setError("Please select gender so the match category can be assigned correctly.")
            return
        }
        if (!entries.length) {
            setError("Please select at least one event category.")
            return
        }
        if (form.paymentMode === "upi" && !/^\d{12}$/.test(form.utrNumber)) {
            setError("Please enter a 12-digit UTR/UPI reference number.")
            return
        }

        const body = new FormData()
        Object.entries(form).forEach(([key, value]) => body.append(key, value))
        body.append("entries", JSON.stringify(entries))
        if (paymentScreenshot) body.append("paymentScreenshot", paymentScreenshot)

        setIsSubmitting(true)
        try {
            const response = await fetch("/api/registrations", { method: "POST", body })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error ?? "Registration failed.")
            setRegistration(data.registration)
            window.scrollTo({ top: 0, behavior: "smooth" })
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Registration failed.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <section className="relative overflow-hidden border-b border-white/10 px-4 py-16 md:py-20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,0.2),transparent_28rem),radial-gradient(circle_at_85%_10%,rgba(31,143,118,0.18),transparent_26rem)]" />
                <div className="container relative z-10 mx-auto grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                    <div>
                        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#E5C558]">
                            <Trophy className="h-4 w-4" />
                            36th Salvo Cup
                        </p>
                        <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
                            Register for the 36th Salvo Cup
                        </h1>
                        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
                            Three days of precision shooting at Salvo Shooters Arena. Select your event categories, choose a relay slot, complete payment, and generate your competitor card.
                        </p>
                        <div className="mt-8 grid gap-3 sm:grid-cols-3">
                            {["5 June", "6 June", "7 June"].map((date) => (
                                <div key={date} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                                    <CalendarDays className="mb-3 h-5 w-5 text-[#D4AF37]" />
                                    <p className="text-xl font-bold">{date}</p>
                                    <p className="text-sm text-white/55">2026</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-lg border border-[#D4AF37]/30 bg-neutral-950/80 p-5 shadow-2xl shadow-[#D4AF37]/10">
                        <Image
                            src="/competition-range.JPG"
                            alt="Shooters at Salvo range"
                            width={760}
                            height={520}
                            className="h-80 w-full rounded-md object-cover"
                            priority
                        />
                    </div>
                </div>
            </section>

            <main className="container mx-auto px-4 py-12">
                {registration ? (
                    <CompetitorCard registration={registration} onNew={() => {
                        setRegistration(null)
                        setEntries([])
                        setSelectionStartedWith(null)
                        setForm(initialForm)
                        setPaymentScreenshot(null)
                    }} />
                ) : (
                    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[0.95fr_1.4fr]">
                        <section className="space-y-6">
                            <Panel title="Shooter Details">
                                <Field label="Full Name" required>
                                    <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="field" />
                                </Field>
                                <Field label="Shooting Academy" required>
                                    <input required value={form.academy} onChange={(event) => setForm({ ...form, academy: event.target.value })} className="field" />
                                </Field>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label="Gender" required>
                                        <select required value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as Gender })} className="field">
                                            <option value="">Select gender</option>
                                            <option value="male">Male / Boy</option>
                                            <option value="female">Female / Girl</option>
                                        </select>
                                    </Field>
                                    <Field label="Date of Birth" required>
                                        <input required type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} className="field" />
                                    </Field>
                                </div>
                                <Field label="Phone Number" required>
                                    <input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="field" />
                                </Field>
                                {age !== null && (
                                    <p className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
                                        Category age for this competition: <span className="font-bold text-[#D4AF37]">{age}</span>
                                    </p>
                                )}
                            </Panel>

                            <Panel title="Preferred Relay">
                                <Field label="Competition Date" required>
                                    <select required value={form.preferredDate} onChange={(event) => setForm({ ...form, preferredDate: event.target.value })} className="field">
                                        {slotOptions.map((day) => <option key={day.date} value={day.date}>{day.label}</option>)}
                                    </select>
                                </Field>
                                <Field label="Time Slot" required>
                                    <select required value={form.preferredSlot} onChange={(event) => setForm({ ...form, preferredSlot: event.target.value })} className="field">
                                        {selectedSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                                    </select>
                                </Field>
                            </Panel>

                            <Panel title="Payment">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {(["upi", "cash"] as PaymentMode[]).map((mode) => (
                                        <button
                                            type="button"
                                            key={mode}
                                            onClick={() => setForm({ ...form, paymentMode: mode })}
                                            className={`rounded-md border px-4 py-3 text-left transition ${form.paymentMode === mode ? "border-[#D4AF37] bg-[#D4AF37]/15 text-[#E5C558]" : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/30"}`}
                                        >
                                            <CreditCard className="mb-2 h-5 w-5" />
                                            <span className="font-bold uppercase">{mode === "upi" ? "UPI / Online" : "Cash"}</span>
                                            <span className="mt-1 block text-xs text-white/55">{mode === "cash" ? "Marked pending" : "Requires UTR"}</span>
                                        </button>
                                    ))}
                                </div>

                                {form.paymentMode === "upi" && (
                                    <div className="mt-5 grid gap-5 sm:grid-cols-[180px_1fr]">
                                        <div className="rounded-md border border-white/10 bg-white p-3">
                                            <Image src="/upi-scanner.png" alt="UPI payment QR scanner" width={180} height={220} className="h-auto w-full" />
                                        </div>
                                        <div className="space-y-4">
                                            <Field label="12-digit UTR / UPI Reference" required>
                                                <input required inputMode="numeric" maxLength={12} value={form.utrNumber} onChange={(event) => setForm({ ...form, utrNumber: event.target.value.replace(/\D/g, "") })} className="field" />
                                            </Field>
                                            <Field label="Payment Screenshot (optional)">
                                                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setPaymentScreenshot(event.target.files?.[0] ?? null)} className="field file:text-white" />
                                            </Field>
                                        </div>
                                    </div>
                                )}
                            </Panel>
                        </section>

                        <section className="space-y-6">
                            <Panel title="Select Event Categories">
                                <div className="mb-5 rounded-md border border-[#D4AF37]/25 bg-[#D4AF37]/10 p-4 text-sm text-white/75">
                                    Select every event-category you want to compete in. Each selected category adds {formatCurrency(ENTRY_FEE)}.
                                </div>
                                <div className="grid gap-5">
                                    {competitionEvents.map((event) => {
                                        const categories = categoriesByEvent.get(event.id) ?? []
                                        const disabled = !canUseEvent(event.id)
                                        return (
                                            <div key={event.id} className={`rounded-lg border p-5 ${disabled ? "border-white/5 bg-white/[0.02] opacity-45" : "border-white/10 bg-white/[0.04]"}`}>
                                                <div className="flex flex-wrap items-start justify-between gap-4">
                                                    <div>
                                                        <p className="text-xl font-black">{event.title}</p>
                                                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-[#D4AF37]">{event.ruleSet} {event.discipline}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {event.prizes.map((prize, index) => (
                                                            <span key={prize} className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold text-[#E5C558]">
                                                                {index + 1}: Rs. {prize.toLocaleString("en-IN")}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="mt-5 flex flex-wrap gap-2">
                                                    {!form.gender || age === null ? (
                                                        <p className="text-sm text-white/45">Enter gender and date of birth to unlock eligible categories.</p>
                                                    ) : categories.length ? (
                                                        categories.map((category) => (
                                                            <button
                                                                key={category.code}
                                                                type="button"
                                                                disabled={disabled}
                                                                onClick={() => toggleEntry(event.id, category.code)}
                                                                className={`rounded-md border px-3 py-2 text-left text-sm transition ${isEntrySelected(event.id, category.code) ? "border-[#D4AF37] bg-[#D4AF37] text-black" : "border-white/10 bg-black/30 text-white/75 hover:border-[#D4AF37]/60 hover:text-white"}`}
                                                            >
                                                                <span className="block font-bold">{category.code}</span>
                                                                <span className="text-xs">{category.label.replace(event.title, "").trim()}</span>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-white/45">No eligible categories for this event.</p>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </Panel>

                            <div className="sticky top-24 rounded-lg border border-[#D4AF37]/30 bg-neutral-950 p-6 shadow-2xl shadow-[#D4AF37]/10">
                                <div className="mb-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm uppercase tracking-[0.2em] text-white/45">Total Payable</p>
                                        <p className="text-4xl font-black text-[#D4AF37]">{formatCurrency(amount)}</p>
                                    </div>
                                    <IndianRupee className="h-10 w-10 text-[#D4AF37]" />
                                </div>
                                <div className="space-y-2">
                                    {entries.length ? entries.map((entry) => {
                                        const event = getEventById(entry.eventId)
                                        const category = event && form.gender && age !== null
                                            ? getEligibleCategories(event, age, form.gender).find((item) => item.code === entry.categoryCode)
                                            : null
                                        return (
                                            <div key={`${entry.eventId}-${entry.categoryCode}`} className="rounded-md bg-white/[0.04] px-3 py-2 text-sm">
                                                <span className="font-bold text-white">{category?.code}</span>
                                                <span className="ml-2 text-white/60">{event ? buildCategoryLabel(event, category?.bracket ?? "senior", form.gender || "male") : ""}</span>
                                            </div>
                                        )
                                    }) : <p className="text-sm text-white/45">No categories selected yet.</p>}
                                </div>
                                {error && <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#D4AF37] px-6 font-bold uppercase tracking-[0.14em] text-black shadow-[0_0_28px_rgba(212,175,55,0.35)] transition hover:bg-[#E5C558] disabled:opacity-60"
                                >
                                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                                    Submit Registration
                                </button>
                            </div>
                        </section>
                    </form>
                )}
            </main>
        </div>
    )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-white/10 bg-neutral-950/85 p-5 shadow-xl shadow-black/20">
            <h2 className="mb-5 text-xl font-black">{title}</h2>
            <div className="space-y-4">{children}</div>
        </div>
    )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-semibold text-white/70">{label}{required && <span className="text-[#D4AF37]"> *</span>}</span>
            {children}
        </label>
    )
}

function CompetitorCard({ registration, onNew }: { registration: SavedRegistration; onNew: () => void }) {
    return (
        <section className="mx-auto max-w-5xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-[#D4AF37]">Registration Complete</p>
                    <h2 className="text-3xl font-black">Competitor Card Generated</h2>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-md border border-white/15 px-4 font-bold text-white hover:border-[#D4AF37]">
                        <Printer className="h-4 w-4" />
                        Print
                    </button>
                    <button onClick={onNew} className="inline-flex h-11 items-center gap-2 rounded-md bg-[#D4AF37] px-4 font-bold text-black">
                        <Download className="h-4 w-4" />
                        New Entry
                    </button>
                </div>
            </div>
            <div className="print-card overflow-hidden rounded-lg bg-white text-black shadow-2xl">
                <div className="bg-neutral-950 px-8 py-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Medal className="h-12 w-12 text-[#D4AF37]" />
                            <div>
                                <p className="text-3xl font-black text-[#D4AF37]">36th SALVO CUP</p>
                                <p className="text-sm uppercase tracking-[0.24em] text-white/60">Competitor Card</p>
                            </div>
                        </div>
                        <Image src="/salvo-logo.png" alt="Salvo Shooters Arena" width={180} height={72} className="h-12 w-auto" />
                    </div>
                </div>
                <CardBody registration={registration} title="COMPETITOR CARD" />
                <div className="mx-8 border-t-2 border-black" />
                <CardBody registration={registration} title="FOR OFFICE USE ONLY" />
            </div>
        </section>
    )
}

function CardBody({ registration, title }: { registration: SavedRegistration; title: string }) {
    return (
        <div className="px-8 py-7 font-serif text-lg">
            <div className="mb-6 grid grid-cols-[1fr_auto] items-end gap-4 border-b-2 border-black pb-2">
                <h3 className="text-center text-xl font-bold underline">{title}</h3>
                <p><span className="font-bold">Date:</span> {formatDateLabel(registration.preferredDate.slice(0, 10))}</p>
            </div>
            <div className="space-y-5">
                <CardLine label="1. Name" value={registration.name} />
                <CardLine label="2. Club Name" value={registration.academy} />
                <CardLine label="3. Contact" value={registration.phone} />
                <div>
                    <p className="font-bold">4. Category/Event:</p>
                    <div className="mt-2 space-y-2 pl-10">
                        {registration.entries.map((entry, index) => (
                            <p key={entry.id} className="border-b border-dotted border-black pb-1">
                                {String.fromCharCode(97 + index)}) {entry.categoryCode} - {entry.categoryLabel}
                            </p>
                        ))}
                    </div>
                </div>
                <CardLine label="5. Slot" value={registration.preferredSlot} />
                <CardLine label="6. Amount Paid" value={`${formatCurrency(registration.amount)} (${registration.paymentMode === "cash" ? "Cash - Pending" : "Online - Paid"})`} />
            </div>
            <div className="mt-12 flex justify-between">
                <p>Official Signature</p>
                <p>Shooter Signature</p>
            </div>
        </div>
    )
}

function CardLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid grid-cols-[170px_1fr] gap-4">
            <p>{label}:</p>
            <p className="border-b border-dotted border-black pb-1">{value}</p>
        </div>
    )
}

"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, Edit3, ExternalLink, Loader2, Lock, Plus, Save, Trophy, Upload } from "lucide-react"
import {
    CompetitionConfig,
    PublicCompetition,
    formatCompetitionDateRange,
    normalizeCompetitionConfig,
} from "@/lib/competition"
import { toProperCase } from "@/lib/registration-validation"

type AdminCompetition = PublicCompetition & {
    registrations: number
}

type CompetitionAssetType = "hero" | "paymentQr"

const emptyCreateForm = {
    title: "",
    shortTitle: "",
    slug: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    competitionYear: new Date().getFullYear(),
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

export default function AdminCompetitionsPage() {
    const [pin, setPin] = React.useState("")
    const [activePin, setActivePin] = React.useState("")
    const [competitions, setCompetitions] = React.useState<AdminCompetition[]>([])
    const [selectedSlug, setSelectedSlug] = React.useState("")
    const [createForm, setCreateForm] = React.useState(emptyCreateForm)
    const [isLoading, setIsLoading] = React.useState(false)
    const [isCreating, setIsCreating] = React.useState(false)
    const [error, setError] = React.useState("")

    const selected = competitions.find((competition) => competition.slug === selectedSlug) ?? competitions[0] ?? null

    const loadCompetitions = React.useCallback(async (adminPin = activePin) => {
        if (!adminPin) return
        setIsLoading(true)
        setError("")
        try {
            const response = await fetch("/api/admin/competitions", { headers: { "x-admin-pin": adminPin }, cache: "no-store" })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to load competitions.")
            const nextCompetitions = Array.isArray(data.competitions) ? data.competitions as AdminCompetition[] : []
            setCompetitions(nextCompetitions.map((competition) => ({ ...competition, config: normalizeCompetitionConfig(competition.config) })))
            setSelectedSlug((current) => current || nextCompetitions[0]?.slug || "")
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load competitions.")
        } finally {
            setIsLoading(false)
        }
    }, [activePin])

    const login = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setActivePin(pin)
        await loadCompetitions(pin)
    }

    const createCompetition = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsCreating(true)
        setError("")
        try {
            const response = await fetch("/api/admin/competitions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-admin-pin": activePin },
                body: JSON.stringify(createForm),
            })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to create competition.")
            const competition = data.competition as AdminCompetition
            setCreateForm(emptyCreateForm)
            await loadCompetitions(activePin)
            setSelectedSlug(competition.slug)
        } catch (createError) {
            setError(createError instanceof Error ? createError.message : "Unable to create competition.")
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="min-h-screen bg-black px-4 py-10 text-white">
            <div className="container mx-auto">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
                            <Trophy className="h-4 w-4" />
                            Competition Admin
                        </p>
                        <h1 className="mt-2 text-4xl font-black">Competitions</h1>
                    </div>
                    {activePin && (
                        <button onClick={() => loadCompetitions()} disabled={isLoading} className="admin-button">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                            Refresh
                        </button>
                    )}
                </div>

                {!activePin ? (
                    <form onSubmit={login} className="mx-auto max-w-md rounded-lg border border-white/10 bg-neutral-950 p-6">
                        <Lock className="mb-4 h-9 w-9 text-[#D4AF37]" />
                        <h2 className="mb-2 text-2xl font-black">Enter Admin PIN</h2>
                        <p className="mb-5 text-sm text-white/55">Manage competition setup, registration visibility, and result publishing.</p>
                        <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" className="field" placeholder="Admin PIN" />
                        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
                        <button className="mt-5 h-11 w-full rounded-md bg-[#D4AF37] font-bold text-black">Open Competitions</button>
                    </form>
                ) : (
                    <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
                        <aside className="space-y-5">
                            <form onSubmit={createCompetition} className="rounded-lg border border-white/10 bg-neutral-950 p-5">
                                <div className="mb-4 flex items-center gap-2">
                                    <Plus className="h-4 w-4 text-[#D4AF37]" />
                                    <h2 className="text-xl font-black">Create from Template</h2>
                                </div>
                                <div className="space-y-3">
                                    <input value={createForm.title} onChange={(event) => setCreateForm({ ...createForm, title: toProperCase(event.target.value) })} className="field" placeholder="Competition title" />
                                    <input value={createForm.shortTitle} onChange={(event) => setCreateForm({ ...createForm, shortTitle: toProperCase(event.target.value) })} className="field" placeholder="Short title" />
                                    <input value={createForm.slug} onChange={(event) => setCreateForm({ ...createForm, slug: event.target.value })} className="field" placeholder="optional-slug" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="date" value={createForm.startDate} onChange={(event) => setCreateForm({ ...createForm, startDate: event.target.value })} className="field" />
                                        <input type="date" value={createForm.endDate} onChange={(event) => setCreateForm({ ...createForm, endDate: event.target.value })} className="field" />
                                    </div>
                                    <input type="number" value={createForm.competitionYear} onChange={(event) => setCreateForm({ ...createForm, competitionYear: Number(event.target.value) })} className="field" />
                                </div>
                                <button disabled={isCreating} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#D4AF37] font-bold text-black disabled:opacity-60">
                                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    Create Draft
                                </button>
                            </form>

                            <section className="rounded-lg border border-white/10 bg-neutral-950 p-5">
                                <h2 className="mb-4 text-xl font-black">All Competitions</h2>
                                <div className="space-y-2">
                                    {competitions.map((competition) => (
                                        <button
                                            key={competition.slug}
                                            onClick={() => setSelectedSlug(competition.slug)}
                                            className={`w-full rounded-md border p-4 text-left transition ${selected?.slug === competition.slug ? "border-[#D4AF37] bg-[#D4AF37]/10" : "border-white/10 bg-white/[0.03] hover:border-white/30"}`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-bold">{competition.title}</p>
                                                    <p className="mt-1 text-xs text-white/45">{formatCompetitionDateRange(competition.startDate, competition.endDate)}</p>
                                                </div>
                                                <span className="rounded-full border border-white/10 px-2 py-1 text-xs font-bold text-white/60">{competition.status}</span>
                                            </div>
                                            <p className="mt-3 text-sm text-[#D4AF37]">{competition.registrations} registrations</p>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </aside>

                        {selected ? (
                            <CompetitionEditor
                                competition={selected}
                                adminPin={activePin}
                                onSaved={(competition) => {
                                    setCompetitions((current) => current.map((item) => item.id === competition.id ? { ...item, ...competition } : item))
                                    setSelectedSlug(competition.slug)
                                    loadCompetitions(activePin)
                                }}
                            />
                        ) : (
                            <section className="rounded-lg border border-white/10 bg-neutral-950 p-8 text-center text-white/55">
                                Create a competition to start.
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function CompetitionEditor({ competition, adminPin, onSaved }: { competition: AdminCompetition; adminPin: string; onSaved: (competition: AdminCompetition) => void }) {
    const [form, setForm] = React.useState(() => competition)
    const [saving, setSaving] = React.useState(false)
    const [message, setMessage] = React.useState("")
    const previousCompetitionId = React.useRef(competition.id)

    React.useEffect(() => {
        if (previousCompetitionId.current !== competition.id) {
            previousCompetitionId.current = competition.id
            setForm(competition)
            setMessage("")
        }
    }, [competition])

    const updateConfig = (config: CompetitionConfig) => {
        setForm((current) => ({ ...current, config }))
    }

    const save = async () => {
        setSaving(true)
        setMessage("")
        try {
            const response = await fetch(`/api/admin/competitions/${competition.slug}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
                body: JSON.stringify(form),
            })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to save competition.")
            const saved = data.competition as AdminCompetition
            onSaved({ ...saved, config: normalizeCompetitionConfig(saved.config), registrations: form.registrations })
            setMessage("Saved.")
        } catch (saveError) {
            setMessage(saveError instanceof Error ? saveError.message : "Unable to save competition.")
        } finally {
            setSaving(false)
        }
    }

    const updateUploadedAsset = (saved: AdminCompetition) => {
        const normalized = { ...saved, config: normalizeCompetitionConfig(saved.config), registrations: form.registrations }
        setForm((current) => ({
            ...current,
            heroImagePath: saved.heroImagePath,
            paymentQrPath: saved.paymentQrPath,
        }))
        onSaved(normalized)
    }

    return (
        <section className="rounded-lg border border-white/10 bg-neutral-950 p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#D4AF37]">{form.slug}</p>
                    <h2 className="mt-1 text-3xl font-black">{form.title}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/competitions/${form.slug}`} className="admin-button">
                        <Edit3 className="h-4 w-4" />
                        Dashboard
                    </Link>
                    <Link href={`/competitions/${form.slug}`} className="admin-button">
                        <ExternalLink className="h-4 w-4" />
                        Public
                    </Link>
                    <button onClick={save} disabled={saving} className="admin-button gold disabled:opacity-60">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                    </button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Title"><input value={form.title} onChange={(event) => setForm({ ...form, title: toProperCase(event.target.value) })} className="field" /></Field>
                <Field label="Short Title"><input value={form.shortTitle} onChange={(event) => setForm({ ...form, shortTitle: toProperCase(event.target.value) })} className="field" /></Field>
                <Field label="Slug"><input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} className="field" /></Field>
                <Field label="Status">
                    <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="field">
                        <option value="draft">Draft</option>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="archived">Archived</option>
                    </select>
                </Field>
                <Field label="Start Date"><input type="date" value={form.startDate.slice(0, 10)} onChange={(event) => setForm({ ...form, startDate: `${event.target.value}T00:00:00.000Z` })} className="field" /></Field>
                <Field label="End Date"><input type="date" value={form.endDate.slice(0, 10)} onChange={(event) => setForm({ ...form, endDate: `${event.target.value}T00:00:00.000Z` })} className="field" /></Field>
                <Field label="Competition Year"><input type="number" value={form.config.competitionYear} onChange={(event) => updateConfig({ ...form.config, competitionYear: Number(event.target.value) })} className="field" /></Field>
                <Field label="Venue"><input value={form.venue ?? ""} onChange={(event) => setForm({ ...form, venue: toProperCase(event.target.value) })} className="field" /></Field>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
                <CompetitionAssetField
                    assetType="hero"
                    adminPin={adminPin}
                    competitionSlug={competition.slug}
                    fallbackPath="/competition-range.JPG"
                    label="Registration Hero Image"
                    previewClassName="h-48"
                    value={form.heroImagePath ?? ""}
                    onPathChange={(value) => setForm({ ...form, heroImagePath: value })}
                    onUploaded={updateUploadedAsset}
                />
                <CompetitionAssetField
                    assetType="paymentQr"
                    adminPin={adminPin}
                    competitionSlug={competition.slug}
                    fallbackPath="/upi-scanner.png"
                    label="Payment Scanner Image"
                    previewClassName="h-48 bg-white object-contain p-4"
                    value={form.paymentQrPath ?? ""}
                    onPathChange={(value) => setForm({ ...form, paymentQrPath: value })}
                    onUploaded={updateUploadedAsset}
                />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Toggle label="Published" checked={form.isPublished} onChange={(value) => setForm({ ...form, isPublished: value })} />
                <Toggle label="Registration Open" checked={form.registrationOpen} onChange={(value) => setForm({ ...form, registrationOpen: value })} />
                <Toggle label="Results Published" checked={form.resultsPublished} onChange={(value) => setForm({ ...form, resultsPublished: value })} />
            </div>

            <Field label="Description">
                <textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: toProperCase(event.target.value) })} className="field min-h-24" />
            </Field>

            <ConfigEditor config={form.config} onChange={updateConfig} />

            {message && <p className="mt-4 rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm text-white/75">{message}</p>}
        </section>
    )
}

function CompetitionAssetField({
    adminPin,
    assetType,
    competitionSlug,
    fallbackPath,
    label,
    onPathChange,
    onUploaded,
    previewClassName,
    value,
}: {
    adminPin: string
    assetType: CompetitionAssetType
    competitionSlug: string
    fallbackPath: string
    label: string
    onPathChange: (value: string) => void
    onUploaded: (competition: AdminCompetition) => void
    previewClassName: string
    value: string
}) {
    const inputId = React.useId()
    const [file, setFile] = React.useState<File | null>(null)
    const [fileInputKey, setFileInputKey] = React.useState(0)
    const [isUploading, setIsUploading] = React.useState(false)
    const [message, setMessage] = React.useState("")
    const [isError, setIsError] = React.useState(false)
    const previewPath = value || fallbackPath

    const upload = async () => {
        setMessage("")
        setIsError(false)
        if (!file) {
            setIsError(true)
            setMessage("Choose an image file first.")
            return
        }

        const body = new FormData()
        body.append("assetType", assetType)
        body.append("file", file)

        setIsUploading(true)
        try {
            const response = await fetch(`/api/admin/competitions/${competitionSlug}/assets`, {
                method: "POST",
                headers: { "x-admin-pin": adminPin },
                body,
            })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to upload image.")
            const saved = data.competition as AdminCompetition
            onUploaded({ ...saved, config: normalizeCompetitionConfig(saved.config) })
            setFile(null)
            setFileInputKey((current) => current + 1)
            setMessage("Uploaded.")
        } catch (uploadError) {
            setIsError(true)
            setMessage(uploadError instanceof Error ? uploadError.message : "Unable to upload image.")
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <section className="rounded-lg border border-white/10 bg-black/25 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-white/55">{label}</h3>
                <span className="text-xs font-bold text-white/35">{assetType === "hero" ? "Hero" : "QR"}</span>
            </div>
            <div className="overflow-hidden rounded-md border border-white/10 bg-neutral-950">
                <Image
                    src={previewPath}
                    alt={label}
                    width={640}
                    height={360}
                    className={`w-full object-cover ${previewClassName}`}
                    unoptimized
                />
            </div>
            <label className="mt-4 block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/40">Image URL / Path</span>
                <input value={value} onChange={(event) => onPathChange(event.target.value)} className="field" placeholder={fallbackPath} />
            </label>
            <label htmlFor={inputId} className="mt-4 block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/40">Upload Image</span>
                <input
                    key={fileInputKey}
                    id={inputId}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                        setFile(event.target.files?.[0] ?? null)
                        setMessage("")
                        setIsError(false)
                    }}
                    className="field file:text-white"
                />
            </label>
            <button type="button" onClick={upload} disabled={isUploading} className="admin-button gold mt-4 disabled:opacity-60">
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload
            </button>
            {message && (
                <p className={`mt-3 rounded-md border px-3 py-2 text-sm ${isError ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-white/10 bg-white/[0.04] text-white/70"}`}>
                    {message}
                </p>
            )}
        </section>
    )
}

function ConfigEditor({ config, onChange }: { config: CompetitionConfig; onChange: (config: CompetitionConfig) => void }) {
    const updateEvent = (index: number, patch: Partial<CompetitionConfig["events"][number]>) => {
        onChange({
            ...config,
            events: config.events.map((event, eventIndex) => eventIndex === index ? { ...event, ...patch } : event),
        })
    }

    const updatePrize = (eventIndex: number, prizeIndex: number, value: number) => {
        const event = config.events[eventIndex]
        const prizes = [...event.prizes] as [number, number, number]
        prizes[prizeIndex] = value
        updateEvent(eventIndex, { prizes })
    }

    const updateSlotDay = (index: number, patch: Partial<CompetitionConfig["slotOptions"][number]>) => {
        onChange({
            ...config,
            slotOptions: config.slotOptions.map((slot, slotIndex) => slotIndex === index ? { ...slot, ...patch } : slot),
        })
    }

    return (
        <div className="mt-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Entry Fee"><input type="number" value={config.entryFee} onChange={(event) => onChange({ ...config, entryFee: Number(event.target.value) })} className="field" /></Field>
                <Field label="Little Champ Fee"><input type="number" value={config.littleChampEntryFee} onChange={(event) => onChange({ ...config, littleChampEntryFee: Number(event.target.value) })} className="field" /></Field>
            </div>

            <div>
                <h3 className="mb-3 text-xl font-black">Events and Prizes</h3>
                <div className="grid gap-3">
                    {config.events.map((event, eventIndex) => (
                        <div key={event.id} className="rounded-md border border-white/10 bg-black/25 p-4">
                            <div className="grid gap-3 md:grid-cols-[1fr_120px_120px]">
                                <input value={event.title} onChange={(input) => updateEvent(eventIndex, { title: toProperCase(input.target.value) })} className="field" />
                                <select value={event.ruleSet} onChange={(input) => updateEvent(eventIndex, { ruleSet: input.target.value as "NR" | "ISSF" })} className="field">
                                    <option value="NR">NR</option>
                                    <option value="ISSF">ISSF</option>
                                </select>
                                <select value={event.discipline} onChange={(input) => updateEvent(eventIndex, { discipline: input.target.value as "pistol" | "rifle" })} className="field">
                                    <option value="pistol">Pistol</option>
                                    <option value="rifle">Rifle</option>
                                </select>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                {event.prizes.map((prize, prizeIndex) => (
                                    <input key={prizeIndex} type="number" value={prize} onChange={(input) => updatePrize(eventIndex, prizeIndex, Number(input.target.value))} className="field" aria-label={`Prize ${prizeIndex + 1}`} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="mb-3 text-xl font-black">Relay Dates and Slots</h3>
                <div className="grid gap-3">
                    {config.slotOptions.map((slot, index) => (
                        <div key={slot.date} className="rounded-md border border-white/10 bg-black/25 p-4">
                            <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                                <input type="date" value={slot.date} onChange={(event) => updateSlotDay(index, { date: event.target.value })} className="field" />
                                <input value={slot.label} onChange={(event) => updateSlotDay(index, { label: toProperCase(event.target.value) })} className="field" />
                            </div>
                            <textarea
                                value={slot.slots.join("\n")}
                                onChange={(event) => updateSlotDay(index, { slots: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })}
                                className="field mt-3 min-h-24"
                                aria-label="Relay slots"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="mt-4 block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/40">{label}</span>
            {children}
        </label>
    )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`h-12 rounded-md border px-4 text-left font-bold transition ${checked ? "border-[#D4AF37] bg-[#D4AF37]/15 text-[#E5C558]" : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/30"}`}
        >
            {label}
        </button>
    )
}

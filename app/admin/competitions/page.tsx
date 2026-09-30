"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, Edit3, ExternalLink, Loader2, Lock, Plus, Save, Trash2, Trophy, Upload } from "lucide-react"
import {
    buildCompetitionSlotsForDateRange,
    CompetitionConfig,
    PublicCompetition,
    formatCompetitionDateRange,
    formatCompetitionDateLabel,
    normalizeCompetitionConfig,
} from "@/lib/competition"
import { toProperCase } from "@/lib/registration-validation"

type AdminCompetition = PublicCompetition & {
    registrations: number
}

type CompetitionAssetType = "hero" | "paymentQr"

function prepareCompetitionForEditing(competition: AdminCompetition): AdminCompetition {
    const startDate = competition.startDate.slice(0, 10)
    const endDate = competition.endDate.slice(0, 10)
    return {
        ...competition,
        config: {
            ...competition.config,
            slotOptions: buildCompetitionSlotsForDateRange(startDate, endDate, competition.config.slotOptions),
        },
    }
}

function getLocalDateInputValue(date = new Date()) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

function createDefaultForm() {
    const today = getLocalDateInputValue()
    return {
        title: "",
        shortTitle: "",
        slug: "",
        startDate: today,
        endDate: today,
        competitionYear: Number(today.slice(0, 4)),
        isPublished: true,
        registrationOpen: false,
    }
}

const emptyCreateForm = {
    title: "",
    shortTitle: "",
    slug: "",
    startDate: "",
    endDate: "",
    competitionYear: new Date().getUTCFullYear(),
    isPublished: true,
    registrationOpen: false,
}

function toTimeInputValue(value: string) {
    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim())
    if (!match) return ""
    let hour = Number(match[1])
    const minute = Number(match[2])
    if (hour < 1 || hour > 12 || minute > 59) return ""
    if (match[3].toUpperCase() === "PM" && hour !== 12) hour += 12
    if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function fromTimeInputValue(value: string) {
    const match = /^(\d{2}):(\d{2})$/.exec(value)
    if (!match) return ""
    const hour = Number(match[1])
    const displayHour = hour % 12 || 12
    return `${displayHour}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`
}

function readRelayTime(slot: string) {
    const [start = "", end = ""] = slot.split(/\s+-\s+/, 2)
    return { start: toTimeInputValue(start), end: toTimeInputValue(end) }
}

function buildRelayTime(start: string, end: string) {
    const startLabel = fromTimeInputValue(start)
    const endLabel = fromTimeInputValue(end)
    if (!startLabel) return ""
    return endLabel ? `${startLabel} - ${endLabel}` : startLabel
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
    const [notice, setNotice] = React.useState("")

    React.useEffect(() => {
        setCreateForm(createDefaultForm())
    }, [])

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
        setNotice("")
        try {
            const response = await fetch("/api/admin/competitions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-admin-pin": activePin },
                body: JSON.stringify(createForm),
            })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to create competition.")
            const competition = data.competition as AdminCompetition
            setCreateForm(createDefaultForm())
            await loadCompetitions(activePin)
            setSelectedSlug(competition.slug)
            setNotice(createForm.isPublished
                ? `${competition.title} was created and is now visible on the competitions page.`
                : `${competition.title} was created as a draft. Publish it in the editor when it is ready.`)
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
                                    <CreateField label="Competition title">
                                        <input required value={createForm.title} onChange={(event) => setCreateForm({ ...createForm, title: toProperCase(event.target.value) })} className="field" placeholder="Competition title" />
                                    </CreateField>
                                    <CreateField label="Short title">
                                        <input value={createForm.shortTitle} onChange={(event) => setCreateForm({ ...createForm, shortTitle: toProperCase(event.target.value) })} className="field" placeholder="Defaults to the full title" />
                                    </CreateField>
                                    <CreateField label="Page URL">
                                        <input value={createForm.slug} onChange={(event) => setCreateForm({ ...createForm, slug: event.target.value })} className="field" placeholder="generated-from-title" />
                                    </CreateField>
                                    <div className="grid grid-cols-2 gap-3">
                                        <CreateField label="Start date">
                                            <input
                                                required
                                                type="date"
                                                value={createForm.startDate}
                                                onChange={(event) => {
                                                    const startDate = event.target.value
                                                    setCreateForm((current) => ({
                                                        ...current,
                                                        startDate,
                                                        endDate: !current.endDate || current.endDate < startDate ? startDate : current.endDate,
                                                        competitionYear: Number(startDate.slice(0, 4)) || current.competitionYear,
                                                    }))
                                                }}
                                                className="field"
                                            />
                                        </CreateField>
                                        <CreateField label="End date">
                                            <input required type="date" min={createForm.startDate} value={createForm.endDate} onChange={(event) => setCreateForm({ ...createForm, endDate: event.target.value })} className="field" />
                                        </CreateField>
                                    </div>
                                    <CreateField label="Competition year">
                                        <input required min={1900} max={2200} type="number" value={createForm.competitionYear} onChange={(event) => setCreateForm({ ...createForm, competitionYear: Number(event.target.value) })} className="field" />
                                    </CreateField>
                                </div>
                                <div className="mt-4 grid gap-2">
                                    <Toggle
                                        label="Show on competitions page"
                                        checked={createForm.isPublished}
                                        onChange={(value) => setCreateForm({ ...createForm, isPublished: value, registrationOpen: value ? createForm.registrationOpen : false })}
                                    />
                                    <Toggle
                                        label="Open registration immediately"
                                        checked={createForm.registrationOpen}
                                        onChange={(value) => setCreateForm({ ...createForm, registrationOpen: value, isPublished: value || createForm.isPublished })}
                                    />
                                </div>
                                <p className="mt-3 text-xs leading-relaxed text-white/45">
                                    Relay days will be created automatically from the selected date range. You can adjust individual times after creation.
                                </p>
                                <button disabled={isCreating} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#D4AF37] font-bold text-black disabled:opacity-60">
                                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    {createForm.isPublished ? "Create & Publish" : "Create Draft"}
                                </button>
                                {notice && <p className="mt-3 rounded-md border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-100">{notice}</p>}
                                {error && <p className="mt-3 rounded-md border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
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
                                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                                                <span className="text-[#D4AF37]">{competition.registrations} registrations</span>
                                                <span className={competition.isPublished ? "text-emerald-300" : "text-white/35"}>{competition.isPublished ? "Public" : "Draft"}</span>
                                                <span className={competition.registrationOpen ? "text-cyan-200" : "text-white/35"}>{competition.registrationOpen ? "Registration open" : "Registration closed"}</span>
                                            </div>
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
    const [form, setForm] = React.useState(() => prepareCompetitionForEditing(competition))
    const [saving, setSaving] = React.useState(false)
    const [message, setMessage] = React.useState("")
    const previousCompetitionId = React.useRef(competition.id)

    React.useEffect(() => {
        if (previousCompetitionId.current !== competition.id) {
            previousCompetitionId.current = competition.id
            setForm(prepareCompetitionForEditing(competition))
            setMessage("")
        }
    }, [competition])

    const updateConfig = (config: CompetitionConfig) => {
        setForm((current) => ({ ...current, config }))
    }

    const updateDateRange = (field: "startDate" | "endDate", value: string) => {
        setForm((current) => {
            let startDate = field === "startDate" ? value : current.startDate.slice(0, 10)
            let endDate = field === "endDate" ? value : current.endDate.slice(0, 10)
            if (startDate && endDate && endDate < startDate) {
                if (field === "startDate") endDate = startDate
                else startDate = endDate
            }

            const competitionYear = Number(startDate.slice(0, 4)) || current.config.competitionYear
            return {
                ...current,
                startDate: `${startDate}T00:00:00.000Z`,
                endDate: `${endDate}T00:00:00.000Z`,
                config: {
                    ...current.config,
                    competitionYear,
                    slotOptions: buildCompetitionSlotsForDateRange(startDate, endDate, current.config.slotOptions),
                },
            }
        })
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
            const normalized = { ...saved, config: normalizeCompetitionConfig(saved.config), registrations: form.registrations }
            setForm(normalized)
            onSaved(normalized)
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
                    {form.isPublished ? (
                        <Link href={`/competitions/${form.slug}`} className="admin-button">
                            <ExternalLink className="h-4 w-4" />
                            Public
                        </Link>
                    ) : (
                        <span className="admin-button cursor-not-allowed opacity-45" title="Publish this competition before opening its public page.">
                            <ExternalLink className="h-4 w-4" />
                            Not public
                        </span>
                    )}
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
                <Field label="Start Date"><input type="date" value={form.startDate.slice(0, 10)} onChange={(event) => updateDateRange("startDate", event.target.value)} className="field" /></Field>
                <Field label="End Date"><input type="date" min={form.startDate.slice(0, 10)} value={form.endDate.slice(0, 10)} onChange={(event) => updateDateRange("endDate", event.target.value)} className="field" /></Field>
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
                <Toggle label="Published" checked={form.isPublished} onChange={(value) => setForm({ ...form, isPublished: value, registrationOpen: value ? form.registrationOpen : false })} />
                <Toggle label="Registration Open" checked={form.registrationOpen} onChange={(value) => setForm({ ...form, registrationOpen: value, isPublished: value || form.isPublished })} />
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

    const updateRelaySlot = (dayIndex: number, slotIndex: number, start: string, end: string) => {
        const day = config.slotOptions[dayIndex]
        const slots = day.slots.map((slot, index) => index === slotIndex ? buildRelayTime(start, end) : slot)
        updateSlotDay(dayIndex, { slots })
    }

    const addRelaySlot = (dayIndex: number) => {
        const day = config.slotOptions[dayIndex]
        updateSlotDay(dayIndex, { slots: [...day.slots, "8:00 AM - 11:00 AM"] })
    }

    const removeRelaySlot = (dayIndex: number, slotIndex: number) => {
        const day = config.slotOptions[dayIndex]
        updateSlotDay(dayIndex, { slots: day.slots.filter((_, index) => index !== slotIndex) })
    }

    return (
        <div className="mt-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Entry Fee"><input type="number" value={config.entryFee} onChange={(event) => onChange({ ...config, entryFee: Number(event.target.value) })} className="field" /></Field>
                <Field label="Little Champ Fee"><input type="number" value={config.littleChampEntryFee} onChange={(event) => onChange({ ...config, littleChampEntryFee: Number(event.target.value) })} className="field" /></Field>
                <Field label="Match Start Time">
                    <input
                        type="time"
                        value={toTimeInputValue(config.matchStartTime)}
                        onChange={(event) => onChange({ ...config, matchStartTime: fromTimeInputValue(event.target.value) })}
                        className="field"
                    />
                </Field>
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
                <h3 className="text-xl font-black">Relay Dates and Slots</h3>
                <p className="mb-3 mt-1 text-sm text-white/45">Relay days follow the competition date range. Use the start and end date fields above to add or remove days.</p>
                <div className="grid gap-3">
                    {config.slotOptions.map((slot, index) => (
                        <div key={slot.date} className="rounded-md border border-white/10 bg-black/25 p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="font-black">{formatCompetitionDateLabel(slot.date)}</p>
                                    <p className="text-xs text-white/40">{slot.date}</p>
                                </div>
                                <button type="button" onClick={() => addRelaySlot(index)} className="admin-button">
                                    <Plus className="h-4 w-4" />
                                    Add time slot
                                </button>
                            </div>
                            <div className="grid gap-2">
                                {slot.slots.map((relaySlot, slotIndex) => {
                                    const relayTime = readRelayTime(relaySlot)
                                    return (
                                        <div key={slotIndex} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                                            <CreateField label="Start">
                                                <input
                                                    type="time"
                                                    value={relayTime.start}
                                                    onChange={(event) => updateRelaySlot(index, slotIndex, event.target.value, relayTime.end)}
                                                    className="field"
                                                    aria-label={`Start time for ${slot.date} slot ${slotIndex + 1}`}
                                                />
                                            </CreateField>
                                            <CreateField label="End (optional)">
                                                <input
                                                    type="time"
                                                    value={relayTime.end}
                                                    onChange={(event) => updateRelaySlot(index, slotIndex, relayTime.start, event.target.value)}
                                                    className="field"
                                                    aria-label={`End time for ${slot.date} slot ${slotIndex + 1}`}
                                                />
                                            </CreateField>
                                            <button
                                                type="button"
                                                onClick={() => removeRelaySlot(index, slotIndex)}
                                                className="admin-button h-11 px-3 text-red-200"
                                                aria-label={`Remove slot ${slotIndex + 1} from ${slot.date}`}
                                                title="Remove time slot"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )
                                })}
                                {!slot.slots.length && <p className="rounded-md border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">Add at least one time slot for this day.</p>}
                            </div>
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

function CreateField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">{label}</span>
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

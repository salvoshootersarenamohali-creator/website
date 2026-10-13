"use client"

import * as React from "react"
import Image from "next/image"
import { getAgeFromDobYear, getEligibleCategories, getEntryFee, formatCurrency, isOnlinePaymentMode, getPaymentModeLabel, type PublicCompetition, type SelectedEntry, type Gender } from "@/lib/competition"
import { getBookingEligibility } from "@/lib/relay-booking"
import { getPaymentReferenceError } from "@/lib/registration-validation"
import { RelaySelector, type PendingBooking } from "@/components/RelaySelector"

type Student = {
    key: string; name: string; gender: "" | Gender; dateOfBirth: string; motherName: string; fatherName: string; address: string
    preferredDate: string; preferredSlot: string; entries: SelectedEntry[]; photo: File | null; documents: Record<string, File>
}
function newStudent(competition: PublicCompetition): Student {
    return { key: crypto.randomUUID(), name: "", gender: "", dateOfBirth: "", motherName: "", fatherName: "", address: "", preferredDate: competition.config.relayBooking.days.find((day) => day.relays.length)?.date ?? competition.config.slotOptions.find((day) => day.slots.length)?.date ?? "", preferredSlot: "", entries: [], photo: null, documents: {} }
}
type Receipt = { id: string; name: string; preferredDate: string; preferredSlot: string; amount: number; entries: { categoryCode: string; categoryLabel: string }[]; relayBooking: { pool: string; lane: number } | null }

export function CoachBatchForm({ competition }: { competition: PublicCompetition }) {
    const config = competition.config
    const [students, setStudents] = React.useState<Student[]>([])
    const [shared, setShared] = React.useState({ academy: "", coachName: "", phone: "", paymentMode: config.allowedPaymentModes[0], utrNumber: "" })
    const [screenshot, setScreenshot] = React.useState<File | null>(null)
    const [busy, setBusy] = React.useState(false)
    const [error, setError] = React.useState("")
    const [refreshKey, setRefreshKey] = React.useState(0)
    const [submissionKey, setSubmissionKey] = React.useState("")
    const [saved, setSaved] = React.useState<Receipt[] | null>(null)
    const update = (key: string, patch: Partial<Student>) => setStudents((current) => current.map((student) => student.key === key ? { ...student, ...patch } : student))
    const studentCategories = (student: Student) => config.events.flatMap((event) => {
        const age = getAgeFromDobYear(student.dateOfBirth, config.competitionYear)
        return age !== null && student.gender ? getEligibleCategories(event, age, student.gender, config).map((category) => ({ event, category })) : []
    })
    const amountFor = (student: Student) => studentCategories(student).filter(({ event, category }) => student.entries.some((entry) => entry.eventId === event.id && entry.categoryCode === category.code)).reduce((sum, { category }) => sum + getEntryFee(category, config), 0)
    const total = students.reduce((sum, student) => sum + amountFor(student), 0)
    const pendingFor = (key: string): PendingBooking[] => students.filter((s) => s.key !== key && s.entries.length && s.preferredSlot).flatMap((s) => {
        try {
            const pool = getBookingEligibility(s.entries.map((entry) => {
                const item = studentCategories(s).find(({ event, category }) => event.id === entry.eventId && category.code === entry.categoryCode)
                return { ...entry, ruleSet: item?.event.ruleSet ?? "", categoryLabel: item?.category.label ?? "" }
            }), config).pool
            return [{ date: s.preferredDate, slot: s.preferredSlot, pool }]
        } catch { return [] }
    })
    async function submit(event: React.FormEvent) {
        event.preventDefault(); setError("")
        if (!students.length) { setError("Add at least one student."); return }
        if (students.some((s) => !s.entries.length || !s.preferredSlot || !s.photo)) { setError("Every student needs event categories, a relay, and a photo."); return }
        const referenceError = getPaymentReferenceError(shared.paymentMode, shared.utrNumber)
        if (referenceError) { setError(referenceError); return }
        const body = new FormData()
        Object.entries(shared).forEach(([key, value]) => body.append(key, value))
        const key = submissionKey || crypto.randomUUID()
        setSubmissionKey(key); body.append("submissionKey", key)
        body.append("students", JSON.stringify(students.map((s) => ({ name: s.name, gender: s.gender, dateOfBirth: s.dateOfBirth, motherName: s.motherName, fatherName: s.fatherName, address: s.address, preferredDate: s.preferredDate, preferredSlot: s.preferredSlot, entries: s.entries }))))
        students.forEach((student, index) => {
            body.append(`student:${index}:studentPhoto`, student.photo!)
            Object.entries(student.documents).forEach(([id, file]) => body.append(`student:${index}:requiredDocument:${id}`, file))
        })
        if (screenshot) body.append("paymentScreenshot", screenshot)
        setBusy(true)
        try {
            const response = await fetch(`/api/competitions/${competition.slug}/registration-batches`, { method: "POST", body })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error ?? "Unable to register students.")
            setSaved(payload.registrations)
        } catch (e) { setError(e instanceof Error ? e.message : "Unable to register students.") }
        finally { setBusy(false); setRefreshKey((key) => key + 1) }
    }
    if (saved) return <section className="space-y-5">
        <div className="no-print flex items-center justify-between"><h2 className="text-2xl font-black">{saved.length} students registered</h2><button type="button" className="admin-button" onClick={() => window.print()}>Print student cards</button></div>
        <div className="print-card space-y-6 bg-white p-6 text-black">{saved.map((receipt) => <article key={receipt.id} className="break-inside-avoid border border-black/20 p-5">
            <h3 className="text-xl font-black">{competition.shortTitle} · {receipt.name}</h3>
            <p>{shared.academy} · Coach: {shared.coachName}</p><p>{receipt.preferredDate.slice(0, 10)} · {receipt.preferredSlot}</p>
            {receipt.relayBooking && <p className="font-bold">{receipt.relayBooking.pool} lane {receipt.relayBooking.lane}</p>}
            <p>{receipt.entries.map((entry) => `${entry.categoryCode}: ${entry.categoryLabel}`).join("; ")}</p><p>Entry amount: {formatCurrency(receipt.amount)} · Batch payment total: {formatCurrency(saved.reduce((sum, r) => sum + r.amount, 0))}</p>
        </article>)}</div>
        <button type="button" className="no-print admin-button" onClick={() => { setSaved(null); setStudents([]); setSubmissionKey("") }}>Register another batch</button>
    </section>
    return <form onSubmit={submit} className="space-y-6">
        <fieldset disabled={busy} className="space-y-6 disabled:opacity-70">
            <section className="rounded-lg border border-white/15 bg-neutral-950 p-5">
                <h2 className="mb-4 text-2xl font-black">Coach batch registration</h2><p className="mb-4 text-white/60">One payment covers all students. Up to 20 students per submission. Each student receives their own lane and competitor card.</p>
                <div className="grid gap-4 sm:grid-cols-3">{([['academy','Academy'],['coachName','Coach name'],['phone','Contact number']] as const).map(([key,label]) => <label key={key} className="text-sm">{label}<input required className="field mt-2" value={shared[key]} onChange={(e) => setShared({ ...shared, [key]: e.target.value })} /></label>)}</div>
            </section>
            {students.map((student, index) => {
                const categories = studentCategories(student)
                return <section key={student.key} className="rounded-lg border border-white/15 bg-neutral-950 p-5">
                    <div className="mb-4 flex justify-between"><h3 className="text-xl font-black">Student {index + 1}</h3><button type="button" onClick={() => setStudents((current) => current.filter((s) => s.key !== student.key))} className="text-sm text-red-200">Remove</button></div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <label>Name<input required className="field mt-2" value={student.name} onChange={(e) => update(student.key, { name: e.target.value })} /></label>
                        <label>Gender<select required className="field mt-2" value={student.gender} onChange={(e) => update(student.key, { gender: e.target.value as Gender, entries: [], preferredSlot: "" })}><option value="">Select</option><option value="male">Male / Boy</option><option value="female">Female / Girl</option></select></label>
                        <label>Date of birth<input required type="date" className="field mt-2" value={student.dateOfBirth} onChange={(e) => update(student.key, { dateOfBirth: e.target.value, entries: [], preferredSlot: "" })} /></label>
                        {config.requiresGuardianDetails && ([['motherName','Mother name'],['fatherName','Father name']] as const).map(([key,label]) => <label key={key}>{label}<input required className="field mt-2" value={student[key]} onChange={(e) => update(student.key, { [key]: e.target.value })} /></label>)}
                        {config.requiresAddress && <label>Address<input required className="field mt-2" value={student.address} onChange={(e) => update(student.key, { address: e.target.value })} /></label>}
                        <label>Student photo<input required type="file" accept="image/png,image/jpeg,image/webp" className="field mt-2" onChange={(e) => update(student.key, { photo: e.target.files?.[0] ?? null })} /></label>
                        {config.requiredDocuments.map((doc) => <label key={doc.id}>{doc.label}<input required type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="field mt-2" onChange={(e) => { const file = e.target.files?.[0]; if (file) update(student.key, { documents: { ...student.documents, [doc.id]: file } }) }} /></label>)}
                    </div>
                    <div className="my-5 flex flex-wrap gap-2">{categories.length ? categories.map(({ event, category }) => {
                        const selected = student.entries.some((e) => e.eventId === event.id && e.categoryCode === category.code)
                        const discipline = config.events.find((e) => e.id === student.entries[0]?.eventId)?.discipline
                        return <button key={`${event.id}-${category.code}`} type="button" disabled={!!discipline && event.discipline !== discipline} onClick={() => update(student.key, { entries: selected ? student.entries.filter((e) => !(e.eventId === event.id && e.categoryCode === category.code)) : [...student.entries, { eventId: event.id, categoryCode: category.code }], preferredSlot: "" })} className={`rounded-md border p-3 text-left text-xs disabled:opacity-35 ${selected ? "border-[#D4AF37] bg-[#D4AF37]/15" : "border-white/15"}`}><strong className="block">{category.code} · {category.label}</strong><span>{formatCurrency(getEntryFee(category, config))}</span></button>
                    }) : <p className="text-white/50">Enter date of birth and gender to select eligible categories.</p>}</div>
                    {config.relayBooking.enabled ? <RelaySelector competition={competition} entries={student.entries} gender={student.gender} dateOfBirth={student.dateOfBirth} date={student.preferredDate} slot={student.preferredSlot} onChange={(preferredDate, preferredSlot) => update(student.key, { preferredDate, preferredSlot })} refreshKey={refreshKey} pending={pendingFor(student.key)} /> : <div className="flex gap-3"><select required className="field" value={student.preferredDate} onChange={(e) => update(student.key, { preferredDate: e.target.value, preferredSlot: "" })}>{config.slotOptions.filter((d) => d.slots.length).map((d) => <option key={d.date} value={d.date}>{d.label}</option>)}</select><select required className="field" value={student.preferredSlot} onChange={(e) => update(student.key, { preferredSlot: e.target.value })}><option value="">Select time</option>{config.slotOptions.find((d) => d.date === student.preferredDate)?.slots.map((slot) => <option key={slot}>{slot}</option>)}</select></div>}
                    <p className="mt-4 font-bold text-[#D4AF37]">Student entry amount: {formatCurrency(amountFor(student))}</p>
                </section>
            })}
            <button type="button" disabled={students.length >= 20} onClick={() => setStudents((current) => [...current, newStudent(competition)])} className="admin-button">Add student</button>
            <section className="rounded-lg border border-[#D4AF37]/30 bg-neutral-950 p-5">
                <h3 className="text-2xl font-black text-[#D4AF37]">Combined payment: {formatCurrency(total)}</h3>
                <div className="mt-5 grid gap-5 sm:grid-cols-[200px_1fr]">
                    {shared.paymentMode === "upi" && <Image src={competition.paymentQrPath || "/upi-scanner.png"} alt="Competition UPI payment QR" width={200} height={240} className="h-auto w-full rounded-md" />}
                    <div className="space-y-4"><label className="block">Payment method<select className="field mt-2" value={shared.paymentMode} onChange={(e) => setShared({ ...shared, paymentMode: e.target.value as typeof shared.paymentMode, utrNumber: "" })}>{config.allowedPaymentModes.map((mode) => <option key={mode} value={mode}>{getPaymentModeLabel(mode)}</option>)}</select></label>
                        {isOnlinePaymentMode(shared.paymentMode) && <><label className="block">Payment reference / UTR<input required className="field mt-2" value={shared.utrNumber} onChange={(e) => setShared({ ...shared, utrNumber: e.target.value })} maxLength={shared.paymentMode === "upi" ? 12 : 64} /></label><label className="block">Payment screenshot (optional)<input type="file" accept="image/png,image/jpeg,image/webp" className="field mt-2" onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)} /></label></>}
                    </div>
                </div>
                {error && <p role="alert" className="mt-4 text-red-200">{error}</p>}
                <button type="submit" disabled={!students.length || busy} className="mt-5 rounded-md bg-[#D4AF37] px-6 py-3 font-bold text-black disabled:opacity-40">{busy ? "Registering students…" : "Submit all students"}</button>
            </section>
        </fieldset>
    </form>
}

"use client"
import * as React from "react"
import Image from "next/image"
import { dailyRelayTemplate, type CertificateConfig } from "@/lib/relay-config"
import { type CompetitionConfig } from "@/lib/competition"

export function CompetitionBookingSettings({ config, onChange, adminPin, slug }: { config: CompetitionConfig; onChange: (config: CompetitionConfig) => void; adminPin: string; slug: string }) {
    const booking = config.relayBooking
    const updateBooking = (patch: Partial<typeof booking>) => onChange({ ...config, relayBooking: { ...booking, ...patch } })
    const certificate = config.certificate
    const updateCert = (patch: Partial<CertificateConfig>) => onChange({ ...config, certificate: { issuerName: "", logoPath: null, signers: [], ...certificate, ...patch } })
    const updateSigner = (id: string, patch: Partial<CertificateConfig["signers"][number]>) => updateCert({ signers: certificate!.signers.map((s) => s.id === id ? { ...s, ...patch } : s) })
    return <div className="mt-6 space-y-6">
        <section className="rounded-md border border-white/15 p-4">
            <h3 className="text-xl font-black">Relay booking</h3>
            <label className="mt-3 flex gap-3"><input type="checkbox" checked={booking.enabled} onChange={(e) => updateBooking({ enabled: e.target.checked, days: booking.days.length ? booking.days : config.slotOptions.filter((d) => d.slots.length).map((d) => ({ date: d.date, relays: dailyRelayTemplate.map((r) => ({ ...r })) })) })} />Enforce lane capacity and relay eligibility</label>
            <label className="mt-3 flex gap-3"><input type="checkbox" checked={config.coachBatchEnabled} onChange={(e) => onChange({ ...config, coachBatchEnabled: e.target.checked })} />Allow coach batch registration</label>
            {booking.enabled && <>
                <div className="my-4 grid gap-3 sm:grid-cols-2">{(['standardCapacity','specialCapacity'] as const).map((key) => <label key={key}>{key === 'standardCapacity' ? 'Standard lanes' : 'Shared special lanes'}<input type="number" min={1} max={100} value={booking[key]} onChange={(e) => updateBooking({ [key]: Number(e.target.value) })} className="field mt-2" /></label>)}</div>
                <p className="text-sm text-white/55">Little Champ always uses the special pool. Select any additional special events below.</p>
                <div className="my-3 flex flex-wrap gap-4">{config.events.map((event) => <label key={event.id} className="flex gap-2 text-sm"><input type="checkbox" checked={booking.specialEventIds.includes(event.id)} onChange={(e) => updateBooking({ specialEventIds: e.target.checked ? [...booking.specialEventIds, event.id] : booking.specialEventIds.filter((id) => id !== event.id) })} />{event.title}</label>)}</div>
                {config.slotOptions.map((day) => {
                    const configured = booking.days.find((d) => d.date === day.date)
                    return <details key={day.date} className="mb-3 rounded-md border border-white/10 p-3"><summary className="cursor-pointer font-bold">{day.date} · {configured?.relays.length ?? 0} relays</summary>
                        <label className="my-3 flex gap-2"><input type="checkbox" checked={!!configured} onChange={(e) => updateBooking({ days: e.target.checked ? [...booking.days, { date: day.date, relays: dailyRelayTemplate.map((r) => ({ ...r })) }].sort((a,b) => a.date.localeCompare(b.date)) : booking.days.filter((d) => d.date !== day.date) })} />Accept relay bookings on this date</label>
                        {configured?.relays.map((relay) => <div key={relay.id} className="my-3 grid gap-2 sm:grid-cols-6">
                            <strong className="self-center text-sm">Relay {relay.number}</strong>
                            <label className="text-xs">Rule set<select className="field mt-1" value={relay.ruleSet} onChange={(e) => updateBooking({ days: booking.days.map((d) => d.date === day.date ? { ...d, relays: d.relays.map((r) => r.id === relay.id ? { ...r, ruleSet: e.target.value as "NR" | "ISSF" } : r) } : d) })}><option>NR</option><option>ISSF</option></select></label>
                            {(['reportingTime','preparationTime','startTime','endTime'] as const).map((key) => <label key={key} className="text-xs">{key.replace('Time','')}<input type="time" value={relay[key]} className="field mt-1" onChange={(e) => updateBooking({ days: booking.days.map((d) => d.date === day.date ? { ...d, relays: d.relays.map((r) => r.id === relay.id ? { ...r, [key]: e.target.value } : r) } : d) })} /></label>)}
                        </div>)}
                    </details>
                })}
            </>}
        </section>
        <section className="rounded-md border border-white/15 p-4">
            <h3 className="text-xl font-black">Certificate branding and signatures</h3>
            <label className="my-3 flex gap-3"><input type="checkbox" checked={!!certificate} onChange={(e) => onChange({ ...config, certificate: e.target.checked ? { issuerName: "", logoPath: null, signers: [] } : null })} />Customize this competition’s certificate</label>
            {certificate && <>
                <label className="block">Issuer name<input className="field mt-2" value={certificate.issuerName} onChange={(e) => updateCert({ issuerName: e.target.value })} /></label>
                <CertificateImage label="Certificate logo" assetType="certificateLogo" value={certificate.logoPath} onChange={(logoPath) => updateCert({ logoPath })} slug={slug} adminPin={adminPin} />
                {certificate.signers.map((signer) => <div key={signer.id} className="my-4 rounded-md border border-white/10 p-3">
                    <div className="grid gap-3 sm:grid-cols-2"><label>Signer name<input className="field mt-2" value={signer.name} onChange={(e) => updateSigner(signer.id, { name: e.target.value })} /></label><label>Designation<input className="field mt-2" value={signer.designation} onChange={(e) => updateSigner(signer.id, { designation: e.target.value })} /></label></div>
                    <CertificateImage label="Signature" assetType="signature" value={signer.imagePath} onChange={(imagePath) => updateSigner(signer.id, { imagePath })} slug={slug} adminPin={adminPin} />
                    <button type="button" className="mt-3 text-sm text-red-200" onClick={() => updateCert({ signers: certificate.signers.filter((s) => s.id !== signer.id) })}>Remove signer</button>
                </div>)}
                <button type="button" disabled={certificate.signers.length >= 3} className="admin-button mt-3 disabled:opacity-40" onClick={() => updateCert({ signers: [...certificate.signers, { id: crypto.randomUUID(), name: "", designation: "", imagePath: null }] })}>Add signer ({certificate.signers.length}/3)</button>
                <p className="mt-3 text-xs text-white/50">Save the competition to apply these certificate changes.</p>
            </>}
        </section>
    </div>
}

function CertificateImage({ label, assetType, value, onChange, slug, adminPin }: { label: string; assetType: string; value: string | null; onChange: (path: string | null) => void; slug: string; adminPin: string }) {
    const [message, setMessage] = React.useState("")
    const [busy, setBusy] = React.useState(false)
    async function upload(file: File) {
        setBusy(true); setMessage("")
        try {
            const body = new FormData(); body.append("assetType", assetType); body.append("file", file)
            const response = await fetch(`/api/admin/competitions/${slug}/assets`, { method: "POST", headers: { "x-admin-pin": adminPin }, body })
            const payload = await response.json(); if (!response.ok) throw new Error(payload.error)
            onChange(payload.imageUrl)
        } catch (e) { setMessage(e instanceof Error ? e.message : "Upload failed.") }
        finally { setBusy(false) }
    }
    return <div className="mt-4"><p className="mb-2 text-sm font-bold">{label}</p>{value && <Image src={value} alt={label} width={200} height={100} className="mb-2 h-24 w-48 bg-white object-contain p-2" />}<input type="file" disabled={busy} accept="image/png,image/jpeg" onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file) }} className="field" />{value && <button type="button" className="mt-2 text-xs text-white/60" onClick={() => onChange(null)}>Clear image</button>}{message && <p className="mt-2 text-red-200">{message}</p>}</div>
}

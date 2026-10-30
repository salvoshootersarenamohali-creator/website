"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { FileText, Loader2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TrainingAsset } from "@/lib/range/training-types"
import { formatRangeTime } from "@/lib/range/shared"
import { rangeApi } from "../shared"

export const disciplineLabels: Record<string, string> = { pistol: "Air pistol", rifle: "Air rifle", general: "General training" }
export function useTrainingData<T>(path: string) {
    const [data, setData] = useState<T>(), [loading, setLoading] = useState(true), [error, setError] = useState("")
    const sequence = useRef(0)
    const reload = useCallback(async () => {
        const current = ++sequence.current
        setLoading(true); setError("")
        try { const result = await rangeApi<T>(path); if (sequence.current === current) setData(result) }
        catch (error) { if (sequence.current === current) setError(error instanceof Error ? error.message : "Unable to load training.") }
        finally { if (sequence.current === current) setLoading(false) }
    }, [path])
    const invalidate = useCallback(() => { sequence.current++ }, [])
    useEffect(() => { let active = true; void Promise.resolve().then(() => { if (active) void reload() }); return () => { active = false; invalidate() } }, [reload, invalidate])
    return { data, loading, error, reload }
}
export function useTrainingMutation() {
    const previous = useRef<{ signature: string; key: string } | null>(null)
    return async function submit(path: string, body: Record<string, unknown>) {
        const signature = JSON.stringify([path, body])
        if (previous.current?.signature !== signature) previous.current = { signature, key: crypto.randomUUID() }
        return rangeApi(path, { ...body, submissionKey: previous.current.key })
    }
}
export function TrainingError({ error, retry }: { error: string; retry?: () => void }) {
    return error ? <div className="range-feedback range-feedback-error" role="alert"><span>{error}</span>{retry && <Button variant="outline" onClick={retry}>Try again</Button>}</div> : null
}
export function TrainingPager({ page, total, onPage, size = 50 }: { page: number; total: number; onPage: (page: number) => void; size?: number }) {
    return total > size ? <div className="training-pager"><span>{(page - 1) * size + 1}–{Math.min(page * size, total)} of {total}</span><Button variant="outline" disabled={page === 1} onClick={() => onPage(page - 1)}>Previous</Button><Button variant="outline" disabled={page * size >= total} onClick={() => onPage(page + 1)}>Next</Button></div> : null
}
export function TrainingFiles({ assets, images = false }: { assets: TrainingAsset[]; images?: boolean }) {
    return assets.length ? <ul className={images ? "training-targets" : "training-files"}>{assets.map(asset => <li key={asset.id}><a href={`/api/range/training/media?id=${encodeURIComponent(asset.id)}&open=1`} target="_blank" rel="noopener noreferrer">{images && asset.mimeType.startsWith("image/") ? <Image unoptimized width={320} height={180} src={`/api/range/training/media?id=${encodeURIComponent(asset.id)}&open=1`} alt={asset.name} loading="lazy" referrerPolicy="no-referrer" /> : <FileText size={19} aria-hidden="true" />}<span>{asset.name}</span><span className="sr-only"> (opens in a new tab)</span></a></li>)}</ul> : null
}
export function TrainingUpload({ purpose, assets, onChange, onBusy }: { purpose: "plan" | "target"; assets: TrainingAsset[]; onChange: (assets: TrainingAsset[]) => void; onBusy: (busy: boolean) => void }) {
    const [busy, setBusy] = useState(false), [error, setError] = useState("")
    const limit = purpose === "plan" ? 5 : 10
    return <div className="training-upload"><TrainingFiles assets={assets} />{assets.map(asset => <Button key={asset.id} type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onChange(assets.filter(item => item.id !== asset.id))}><X size={14} />Remove {asset.name}</Button>)}<label className="range-field"><span className="flex items-center gap-2"><Upload size={16} aria-hidden="true" />{purpose === "plan" ? "Plan documents" : "Target images"}</span><input type="file" className="field" accept={purpose === "plan" ? "application/pdf,image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp"} multiple disabled={busy || assets.length >= limit} onChange={async event => {
        const files = Array.from(event.target.files || []); event.target.value = ""
        setError("")
        if (files.length + assets.length > limit) { setError(`You can attach at most ${limit} files.`); return }
        let next = [...assets]
        setBusy(true); onBusy(true)
        try {
            for (const file of files) {
                if (file.size > 3000000) throw new Error(`${file.name} is larger than 3 MB. Choose a smaller file.`)
                const form = new FormData(); form.set("purpose", purpose); form.set("file", file)
                const result = await rangeApi<{ asset: TrainingAsset }>("training/media", form)
                next = [...next, result.asset]; onChange(next)
            }
        } catch (error) { setError(error instanceof Error ? error.message : "Upload failed.") }
        finally { setBusy(false); onBusy(false) }
    }} /><small className="range-muted">{purpose === "plan" ? "PDF, JPG, PNG or WEBP" : "JPG, PNG or WEBP"} · up to {limit} files · 3 MB each</small></label>{busy && <p role="status" className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Uploading files…</p>}<TrainingError error={error} /></div>
}
export function TrainingTimestamp({ value }: { value: string }) { return <time dateTime={value}>{formatRangeTime(value)}</time> }

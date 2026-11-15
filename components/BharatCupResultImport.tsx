"use client"

import { useState } from "react"

type ImportSummary = {
    total: number
    created: number
    updated: number
    skipped: number
    preview: string
}

export function BharatCupResultImport({ path, adminPin, onImported }: { path: string; adminPin: string; onImported: () => void }) {
    const [file, setFile] = useState<File | null>(null)
    const [summary, setSummary] = useState<ImportSummary | null>(null)
    const [imported, setImported] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")

    async function send(preview?: string) {
        if (!file) return
        setBusy(true)
        setError("")
        try {
            const body = new FormData()
            body.set("workbook", file)
            if (preview) body.set("preview", preview)
            const response = await fetch(path, { method: "POST", headers: { "x-admin-pin": adminPin }, body })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error ?? "Unable to import the workbook.")
            setSummary(data)
            if (preview) {
                setImported(true)
                onImported()
            }
        } catch (error) {
            setSummary(null)
            setError(error instanceof Error ? error.message : "Unable to import the workbook.")
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="mb-5 rounded-lg border border-white/15 bg-neutral-950 p-5">
            <h2 className="mb-3 text-xl font-black">Import recorded results</h2>
            <div className="flex flex-wrap items-end gap-3">
                <label className="block text-sm font-semibold">
                    Results workbook
                    <input type="file" accept=".xlsx" disabled={busy} className="field mt-2 block w-full"
                        onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(""); setSummary(null); setImported(false) }} />
                </label>
                <button type="button" onClick={() => send()} disabled={!file || busy} className="admin-button disabled:opacity-50">Preview import</button>
                {summary && !imported && summary.skipped < summary.total && (
                    <button type="button" onClick={() => send(summary.preview)} disabled={busy} className="admin-button gold disabled:opacity-50">Import and publish</button>
                )}
            </div>
            {busy && <p className="mt-3 text-sm text-white/65" role="status">Processing workbook…</p>}
            {error && <p className="mt-3 text-sm text-red-300" role="alert">{error}</p>}
            {summary && (
                <p className="mt-3 text-sm text-white/75" role="status">
                    {imported ? "Import complete. " : ""}{summary.total} entries · {summary.created} new · {summary.updated} matching · {summary.skipped} already imported
                </p>
            )}
        </section>
    )
}

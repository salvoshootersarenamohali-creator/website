"use client"
import { useState } from "react"
import type { FormEvent, ReactNode } from "react"
import { Button } from "@/components/ui/button"

export async function rangeApi<T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`/api/range/${path}`, { method: body === undefined ? "GET" : "POST", headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body), cache: "no-store" })
    const data = await response.json()
    if (!response.ok) { if (response.status === 401 && !path.startsWith("login")) window.location.assign("/range/login"); throw new Error(data.error || "Unable to complete request.") }
    return data
}
export function Panel({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-xl border border-white/15 bg-black/60 p-4 sm:p-6"><h2 className="mb-4 text-xl font-semibold text-[#D4AF37]">{title}</h2>{children}</section> }
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="grid gap-1 text-sm text-white/80">{label}{children}</label> }
export function ActionForm({ onSubmit, children, submit = "Save" }: { onSubmit: (form: HTMLFormElement) => Promise<void>; children: ReactNode; submit?: string }) {
    const [busy, setBusy] = useState(false), [message, setMessage] = useState("")
    async function run(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; setBusy(true); setMessage(""); try { await onSubmit(form); setMessage("Saved successfully.") } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save.") } finally { setBusy(false) } }
    return <form onSubmit={run} className="grid gap-4"><fieldset disabled={busy} className="grid gap-4">{children}<Button type="submit" className="bg-[#D4AF37] text-black hover:bg-[#E5C558]">{busy ? "Saving…" : submit}</Button></fieldset>{message && <p role="status" className="text-sm">{message}</p>}</form>
}

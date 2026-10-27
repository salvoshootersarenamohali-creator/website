"use client"
import { useEffect, useId, useRef, useState } from "react"
import type { FormEvent, ReactNode } from "react"
import { AlertCircle, CheckCircle2, ChevronDown, Inbox, Loader2, Plus } from "lucide-react"
import { Button, type ButtonProps } from "@/components/ui/button"

export async function rangeApi<T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`/api/range/${path}`, { method: body === undefined ? "GET" : "POST", headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body), cache: "no-store" })
    const data = await response.json()
    if (!response.ok) { if (response.status === 401 && !path.startsWith("login")) window.location.assign("/range/login"); throw new Error(data.error || "Unable to complete request.") }
    return data
}
type PanelProps = { title: string; children: ReactNode; description?: string; action?: ReactNode; className?: string; collapsible?: boolean; expanded?: boolean; id?: string }
export function Panel({ title, children, description, action, className = "", collapsible, expanded, id }: PanelProps) {
    const headingId = useId(), contentId = useId(), ref = useRef<HTMLElement>(null)
    const [open, setOpen] = useState(Boolean(expanded))
    useEffect(() => {
        if (!expanded) return
        // Review actions can originate below their form. Bring the editor into view.
        const frame = requestAnimationFrame(() => { setOpen(true); ref.current?.focus({ preventScroll: true }); ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }) })
        return () => cancelAnimationFrame(frame)
    }, [expanded, title])
    return <section id={id} ref={ref} tabIndex={-1} className={`range-panel ${collapsible ? "range-disclosure" : ""} ${className}`} aria-labelledby={headingId}>
        {collapsible ? <button type="button" className="range-disclosure-toggle" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen(value => !value)}>
            <span className="range-disclosure-icon"><Plus size={19} aria-hidden="true" /></span><span className="min-w-0 flex-1 text-left"><span id={headingId} className="range-panel-title">{title}</span>{description && <span className="range-panel-description block">{description}</span>}</span><ChevronDown size={18} className={open ? "rotate-180" : ""} aria-hidden="true" />
        </button> : <div className="range-panel-heading"><div><h2 id={headingId} className="range-panel-title">{title}</h2>{description && <p className="range-panel-description">{description}</p>}</div>{action}</div>}
        <div id={contentId} hidden={collapsible && !open} className="range-panel-body">{children}</div>
    </section>
}
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="range-field"><span>{label}</span>{children}</label> }
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
    return <div className="range-empty"><span className="range-empty-icon"><Inbox size={23} aria-hidden="true" /></span><p className="font-semibold">{title}</p>{description && <p className="range-muted text-sm">{description}</p>}{action}</div>
}
export function LoadingState({ label = "Loading workspace…" }: { label?: string }) { return <div className="range-loading" role="status"><Loader2 className="animate-spin" size={22} aria-hidden="true" /><span>{label}</span></div> }
export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) { return <span className={`range-badge range-badge-${tone}`}>{children}</span> }
export function RecordHeader({ title, subtitle, amount, status, tone = "neutral" }: { title: string; subtitle: string; amount: string; status: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
    return <div className="range-record-heading"><div><h3>{title}</h3><p>{subtitle}</p></div><div><strong>{amount}</strong><StatusBadge tone={tone}>{status}</StatusBadge></div></div>
}
export function ActionForm({ onSubmit, children, submit = "Save", busyLabel = "Saving…", successMessage = "Saved successfully.", submitDisabled = false, submitVariant = "default" }: { onSubmit: (form: HTMLFormElement) => Promise<void>; children: ReactNode; submit?: string; busyLabel?: string; successMessage?: string; submitDisabled?: boolean; submitVariant?: ButtonProps["variant"] }) {
    const [busy, setBusy] = useState(false), [feedback, setFeedback] = useState<{ message: string; error: boolean }>()
    const lock = useRef(false), messageRef = useRef<HTMLParagraphElement>(null)
    async function run(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (lock.current) return
        const form = event.currentTarget
        lock.current = true; setBusy(true); setFeedback(undefined)
        try { await onSubmit(form); setFeedback({ message: successMessage, error: false }) }
        catch (error) { setFeedback({ message: error instanceof Error ? error.message : "Unable to save. Please try again.", error: true }) }
        finally { lock.current = false; setBusy(false) }
    }
    useEffect(() => { if (feedback?.error) messageRef.current?.focus() }, [feedback])
    return <form onSubmit={run} onChange={() => { if (feedback) setFeedback(undefined) }} className="range-action-form" aria-busy={busy}><fieldset disabled={busy} className="grid min-w-0 gap-4">{children}<div className="range-form-footer"><Button type="submit" variant={submitVariant} disabled={submitDisabled}>{busy && <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />}{busy ? busyLabel : submit}</Button></div></fieldset>{feedback && <p ref={messageRef} tabIndex={-1} role={feedback.error ? "alert" : "status"} className={`range-feedback ${feedback.error ? "range-feedback-error" : "range-feedback-success"}`}>{feedback.error ? <AlertCircle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}{feedback.message}</p>}</form>
}

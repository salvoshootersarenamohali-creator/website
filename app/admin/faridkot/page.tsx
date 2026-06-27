"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2, Lock, MapPin, ShieldCheck, Trophy } from "lucide-react"

const FARIDKOT_SLUG = "faridkot-2026-27"
const ADMIN_SESSION_PIN_KEY = "salvo-admin-pin"

async function readResponseJson(response: Response) {
    const text = await response.text()
    if (!text) return {}
    try {
        return JSON.parse(text) as Record<string, unknown>
    } catch {
        return { error: text }
    }
}

export default function FaridkotAdminLoginPage() {
    const router = useRouter()
    const [pin, setPin] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState("")

    const login = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setError("")

        try {
            const response = await fetch(`/api/admin/competitions/${FARIDKOT_SLUG}`, {
                headers: { "x-admin-pin": pin },
                cache: "no-store",
            })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Invalid admin PIN.")

            window.sessionStorage.setItem(ADMIN_SESSION_PIN_KEY, pin)
            router.push(`/admin/competitions/${FARIDKOT_SLUG}`)
        } catch (loginError) {
            setError(loginError instanceof Error ? loginError.message : "Unable to open Faridkot admin.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black px-4 py-10 text-white">
            <div className="mx-auto grid max-w-5xl gap-8 py-16 md:py-20 lg:grid-cols-[1fr_420px] lg:items-center">
                <section>
                    <div className="mb-5 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-4 py-2 text-xs font-bold text-[#E5C558]">
                            <Trophy className="h-4 w-4" />
                            DRSA Faridkot 2026-27
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-100">
                            <MapPin className="h-4 w-4" />
                            Govt. Shooting Range, Faridkot
                        </span>
                    </div>
                    <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
                        Faridkot Competition Admin
                    </h1>
                    <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/65">
                        Sign in once to open registrations, payment reconciliation, scoring, details, exports, and results for the Faridkot district competition.
                    </p>
                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                        <Info label="Public Payment" value="Cash only" />
                        <Info label="Admin Payment" value="Cash or online UTR" />
                        <Info label="Matches" value="Start 8:00 AM" />
                    </div>
                </section>

                <form onSubmit={login} className="rounded-lg border border-white/10 bg-neutral-950/90 p-6 shadow-2xl shadow-[#D4AF37]/10">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#E5C558]">
                        <Lock className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-black">Coach Admin Login</h2>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">Enter the admin PIN to go directly to the Faridkot dashboard.</p>
                    <label className="mt-6 block">
                        <span className="mb-2 block text-sm font-semibold text-white/70">Admin PIN</span>
                        <input
                            value={pin}
                            onChange={(event) => setPin(event.target.value)}
                            type="password"
                            className="field"
                            autoComplete="current-password"
                            autoFocus
                        />
                    </label>
                    {error && <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
                    <button disabled={loading || !pin} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#D4AF37] font-black text-black transition hover:bg-[#E5C558] disabled:opacity-60">
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                        Open Faridkot Admin
                        {!loading && <ArrowRight className="h-5 w-5" />}
                    </button>
                </form>
            </div>
        </div>
    )
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border border-white/10 bg-white/[0.05] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">{label}</p>
            <p className="mt-2 font-black text-white">{value}</p>
        </div>
    )
}

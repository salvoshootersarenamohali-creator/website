"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { AlertCircle, CheckCircle2, Clock, Mail, MapPin, Phone, Send, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toProperCase } from "@/lib/registration-validation"

type ContactFormState = {
    name: string
    email: string
    phone: string
    interest: string
    preferredTime: string
    message: string
}

const initialForm: ContactFormState = {
    name: "",
    email: "",
    phone: "",
    interest: "Free trial session",
    preferredTime: "",
    message: "",
}

const sessionInterests = [
    "Free trial session",
    "10m Air Rifle coaching",
    "10m Air Pistol coaching",
    "Junior training",
    "Competition preparation",
    "Corporate / group booking",
]

const contactCards = [
    {
        label: "Call",
        value: "+91 97003 30076",
        icon: Phone,
    },
    {
        label: "Email",
        value: "salvoshootersarenamohali@gmail.com",
        icon: Mail,
    },
    {
        label: "Visit",
        value: "SCO 15, Preet City, opp. water tank, Sector 86, Sahibzada Ajit Singh Nagar, Punjab 140308",
        icon: MapPin,
    },
]

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message
    return "Unable to send your message. Please try again."
}

export default function ContactPage() {
    const [form, setForm] = React.useState<ContactFormState>(initialForm)
    const [status, setStatus] = React.useState<"idle" | "success" | "error">("idle")
    const [statusMessage, setStatusMessage] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const updateForm = (field: keyof ContactFormState, value: string) => {
        setForm((current) => ({ ...current, [field]: value }))
        if (status !== "idle") {
            setStatus("idle")
            setStatusMessage("")
        }
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsSubmitting(true)
        setStatus("idle")
        setStatusMessage("")

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })
            const payload = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Unable to send your message.")

            setStatus("success")
            setStatusMessage("Your request has been sent. The Salvo team will contact you shortly.")
            setForm(initialForm)
        } catch (error) {
            setStatus("error")
            setStatusMessage(getErrorMessage(error))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen overflow-hidden bg-black text-white">
            <section className="relative border-b border-white/10 bg-[linear-gradient(145deg,#030403_0%,#090f0d_42%,#171205_100%)]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
                <div className="container relative mx-auto grid min-h-[calc(100vh-5rem)] items-center gap-12 px-4 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:py-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="max-w-2xl"
                    >
                        <span className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                            <Target className="h-4 w-4" />
                            Free Intro Session
                        </span>
                        <h1 className="mt-6 text-4xl font-black tracking-tight text-white md:text-6xl lg:text-7xl">
                            Book Your Free Session
                        </h1>
                        <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/68 md:text-xl">
                            Tell us a little about your goals and we will help you choose the right first step at Salvo Shooters Arena.
                        </p>

                        <div className="mt-10 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 transition hover:border-primary/45 hover:bg-primary/10">
                                <Clock className="h-6 w-6 text-primary" />
                                <p className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-white/55">Response Time</p>
                                <p className="mt-2 text-2xl font-black text-white">Within 24 Hours</p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 transition hover:border-primary/45 hover:bg-primary/10">
                                <Target className="h-6 w-6 text-primary" />
                                <p className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-white/55">Focus</p>
                                <p className="mt-2 text-2xl font-black text-white">Rifle & Pistol</p>
                            </div>
                        </div>

                        <div className="mt-10 space-y-4">
                            {contactCards.map((item) => (
                                <div key={item.label} className="group flex gap-4 rounded-lg border border-white/10 bg-black/30 p-4 transition hover:border-white/25">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary transition group-hover:bg-primary group-hover:text-black">
                                        <item.icon className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">{item.label}</p>
                                        <p className="mt-1 text-sm leading-relaxed text-white/75">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
                        className="rounded-lg border border-white/10 bg-neutral-950/92 p-5 shadow-2xl shadow-primary/10 md:p-8"
                    >
                        <div className="mb-8 flex items-start justify-between gap-5">
                            <div>
                                <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Contact Form</p>
                                <h2 className="mt-2 text-3xl font-black text-white">Start the conversation</h2>
                            </div>
                            <span className="hidden rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-primary sm:inline-flex">
                                Secure
                            </span>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid gap-5 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-white">Name</Label>
                                    <Input
                                        id="name"
                                        required
                                        value={form.name}
                                        onChange={(event) => updateForm("name", toProperCase(event.target.value))}
                                        className="h-12 border-white/10 bg-black/70 text-white placeholder:text-white/35 focus-visible:ring-primary"
                                        placeholder="Your name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-white">Phone</Label>
                                    <Input
                                        id="phone"
                                        required
                                        inputMode="tel"
                                        value={form.phone}
                                        onChange={(event) => updateForm("phone", event.target.value)}
                                        className="h-12 border-white/10 bg-black/70 text-white placeholder:text-white/35 focus-visible:ring-primary"
                                        placeholder="+91 98765 43210"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-white">Email</Label>
                                <Input
                                    id="email"
                                    required
                                    type="email"
                                    value={form.email}
                                    onChange={(event) => updateForm("email", event.target.value)}
                                    className="h-12 border-white/10 bg-black/70 text-white placeholder:text-white/35 focus-visible:ring-primary"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="interest" className="text-white">Session Interest</Label>
                                    <select
                                        id="interest"
                                        required
                                        value={form.interest}
                                        onChange={(event) => updateForm("interest", event.target.value)}
                                        className="field h-12"
                                    >
                                        {sessionInterests.map((interest) => (
                                            <option key={interest} value={interest}>{interest}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="preferredTime" className="text-white">Preferred Time</Label>
                                    <Input
                                        id="preferredTime"
                                        required
                                        value={form.preferredTime}
                                        onChange={(event) => updateForm("preferredTime", event.target.value)}
                                        className="h-12 border-white/10 bg-black/70 text-white placeholder:text-white/35 focus-visible:ring-primary"
                                        placeholder="Morning, evening, weekend..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message" className="text-white">Message</Label>
                                <textarea
                                    id="message"
                                    required
                                    rows={5}
                                    value={form.message}
                                    onChange={(event) => updateForm("message", event.target.value)}
                                    className="field min-h-32 resize-none"
                                    placeholder="Share age group, experience level, training goals, or anything we should know."
                                />
                            </div>

                            {statusMessage && (
                                <div className={`flex items-start gap-3 rounded-md border p-4 text-sm ${status === "success" ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-100" : "border-red-400/35 bg-red-400/10 text-red-100"}`}>
                                    {status === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                                    <p>{statusMessage}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-13 w-full rounded-md bg-primary text-base font-black uppercase tracking-[0.12em] text-black shadow-[0_0_28px_rgba(212,175,55,0.24)] transition hover:bg-[#E5C558] hover:shadow-[0_0_38px_rgba(212,175,55,0.35)]"
                            >
                                {isSubmitting ? "Sending..." : (
                                    <>
                                        Send Request
                                        <Send className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </motion.div>
                </div>
            </section>
        </div>
    )
}

"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
    ArrowRight,
    CalendarDays,
    Crosshair,
    MapPin,
    Trophy,
    X,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

const competitionHref = "/competitions/37th-salvo-cup"

export function CompetitionNotice() {
    const [isVisible, setIsVisible] = React.useState(false)
    const closeButtonRef = React.useRef<HTMLButtonElement>(null)

    React.useEffect(() => {
        const timer = window.setTimeout(() => setIsVisible(true), 650)
        return () => window.clearTimeout(timer)
    }, [])

    React.useEffect(() => {
        if (!isVisible) return

        const previouslyFocused = document.activeElement as HTMLElement | null
        const scrollY = window.scrollY
        const previousOverflow = document.body.style.overflow
        const previousPosition = document.body.style.position
        const previousTop = document.body.style.top
        const previousWidth = document.body.style.width

        document.body.style.overflow = "hidden"
        document.body.style.position = "fixed"
        document.body.style.top = `-${scrollY}px`
        document.body.style.width = "100%"
        closeButtonRef.current?.focus()

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsVisible(false)
        }
        window.addEventListener("keydown", handleKeyDown)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
            document.body.style.overflow = previousOverflow
            document.body.style.position = previousPosition
            document.body.style.top = previousTop
            document.body.style.width = previousWidth
            window.scrollTo(0, scrollY)
            previouslyFocused?.focus()
        }
    }, [isVisible])

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/85 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-5 sm:py-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setIsVisible(false)
                    }}
                >
                    <motion.section
                        className="relative grid w-full max-w-5xl overflow-hidden rounded-xl border border-[#D4AF37]/45 bg-[#05080b] shadow-[0_30px_100px_rgba(0,0,0,0.75),0_0_50px_rgba(212,175,55,0.08)] md:grid-cols-[minmax(300px,0.82fr)_minmax(360px,1fr)]"
                        initial={{ opacity: 0, y: 28, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.98 }}
                        transition={{ duration: 0.32, ease: "easeOut" }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="competition-notice-title"
                        aria-describedby="competition-notice-description"
                    >
                        <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[#E5C558] to-transparent" />

                        <button
                            ref={closeButtonRef}
                            type="button"
                            onClick={() => setIsVisible(false)}
                            className="absolute right-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/80 text-white shadow-lg backdrop-blur transition hover:border-[#D4AF37] hover:text-[#E5C558] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                            aria-label="Close 37th Salvo Cup announcement"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="relative min-h-[46svh] overflow-hidden border-b border-white/10 bg-black sm:min-h-[58svh] md:min-h-[min(720px,82svh)] md:border-b-0 md:border-r">
                            <Image
                                src="/37th-salvo-cup-poster.jpg"
                                alt="37th Salvo Cup poster, 6 to 9 August 2026 at Salvo Shooters Arena"
                                fill
                                priority
                                sizes="(min-width: 1024px) 440px, (min-width: 768px) 42vw, 100vw"
                                className="object-contain"
                            />
                        </div>

                        <div className="relative flex flex-col justify-center overflow-hidden p-5 sm:p-8 md:p-9 lg:p-12">
                            <div className="absolute -right-24 top-6 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-3xl" />
                            <div className="absolute -bottom-28 left-4 h-64 w-64 rounded-full bg-emerald-700/10 blur-3xl" />

                            <div className="relative">
                                <p className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-[#E5C558]">
                                    <Trophy className="h-3.5 w-3.5" />
                                    Competition announcement
                                </p>

                                <h2 id="competition-notice-title" className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                                    37th Salvo Cup
                                </h2>
                                <p id="competition-notice-description" className="mt-3 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
                                    Four days of precision shooting across ISSF and NR Air Pistol and Air Rifle events, with exciting cash prizes.
                                </p>

                                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3.5">
                                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/40">
                                            <CalendarDays className="h-4 w-4 text-[#D4AF37]" />
                                            Dates
                                        </p>
                                        <p className="mt-2 font-black text-white">6–9 August 2026</p>
                                    </div>
                                    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3.5">
                                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/40">
                                            <MapPin className="h-4 w-4 text-[#D4AF37]" />
                                            Venue
                                        </p>
                                        <p className="mt-2 font-black text-white">Sector 86, Mohali</p>
                                    </div>
                                </div>

                                <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-white/70">
                                    <Crosshair className="h-4 w-4 text-[#D4AF37]" />
                                    Air Pistol & Air Rifle · ISSF & NR
                                </p>

                                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                                    <Link
                                        href={`${competitionHref}/register`}
                                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#D4AF37] px-5 text-sm font-black uppercase tracking-[0.1em] text-black shadow-[0_0_28px_rgba(212,175,55,0.28)] transition hover:bg-[#E5C558] hover:shadow-[0_0_36px_rgba(229,197,88,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C558] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                    >
                                        Register Now
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                    <Link
                                        href={`${competitionHref}/results`}
                                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D4AF37]/60 bg-[#D4AF37]/[0.08] px-5 text-sm font-black uppercase tracking-[0.1em] text-[#F4D76A] transition hover:border-[#E5C558] hover:bg-[#D4AF37]/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C558] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                    >
                                        <Trophy className="h-4 w-4" />
                                        View Results
                                    </Link>
                                </div>

                                <Link
                                    href={competitionHref}
                                    className="mt-4 inline-flex text-sm font-semibold text-white/50 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                                >
                                    View competition details
                                </Link>
                            </div>
                        </div>
                    </motion.section>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

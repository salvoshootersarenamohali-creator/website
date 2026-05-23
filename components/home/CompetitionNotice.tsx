"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Bell, CalendarClock, Crosshair, Trophy, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function CompetitionNotice() {
    const [isVisible, setIsVisible] = React.useState(false)
    const [isDismissed, setIsDismissed] = React.useState(false)

    React.useEffect(() => {
        const handleScroll = () => {
            if (!isDismissed && window.scrollY > 180) {
                setIsVisible(true)
            }
        }

        window.addEventListener("scroll", handleScroll, { passive: true })
        handleScroll()

        return () => window.removeEventListener("scroll", handleScroll)
    }, [isDismissed])

    const closeNotice = () => {
        setIsVisible(false)
        setIsDismissed(true)
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8"
                    initial={{ opacity: 0, y: 40, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24, scale: 0.98 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    role="dialog"
                    aria-modal="false"
                    aria-labelledby="competition-notice-title"
                >
                    <div className="relative w-full max-w-6xl overflow-hidden rounded-lg border border-primary/35 bg-black shadow-2xl shadow-primary/10">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_25%,rgba(212,175,55,0.22),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_36%)]" />
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

                        <button
                            type="button"
                            onClick={closeNotice}
                            className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-primary/50 hover:text-primary"
                            aria-label="Close competition announcement"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="relative z-10 grid gap-7 p-6 md:grid-cols-[1fr_1.35fr] md:p-9 lg:p-10">
                            <div className="relative min-h-[260px] overflow-hidden rounded-md border border-white/10 bg-neutral-950 md:min-h-[360px]">
                                <Image
                                    src="/competition-range.JPG"
                                    alt="Shooters training at a 10m indoor range"
                                    fill
                                    sizes="(min-width: 768px) 40vw, 100vw"
                                    className="object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                <div className="absolute inset-0 bg-primary/10 mix-blend-color" />
                                <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-3">
                                    <span className="rounded-full border border-white/15 bg-black/55 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                                        Live Range Energy
                                    </span>
                                    <span className="hidden h-px flex-1 bg-gradient-to-r from-primary/70 to-transparent sm:block" />
                                </div>
                            </div>

                            <div className="flex flex-col justify-center pr-10 md:pr-12">
                                <div className="mb-4 flex flex-wrap items-center gap-3">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                                        <Bell className="h-3.5 w-3.5" />
                                        Competition Alert
                                    </span>
                                    <span className="inline-flex items-center gap-2 text-sm text-white/55">
                                        <CalendarClock className="h-4 w-4 text-primary" />
                                        Dates to be announced soon
                                    </span>
                                </div>

                                <h2 id="competition-notice-title" className="mb-3 text-3xl font-bold tracking-tight text-white md:text-5xl">
                                    Upcoming Shooting Competition
                                </h2>
                                <p className="mb-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                                    Get ready for precision, pressure, and championship focus at Salvo Shooters Arena. Event categories and registration details will be announced soon.
                                </p>

                                <div className="flex flex-wrap gap-3 text-sm font-medium text-white/75">
                                    <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2">
                                        <Crosshair className="h-4 w-4 text-primary" />
                                        10m Air Rifle
                                    </span>
                                    <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2">
                                        <Trophy className="h-4 w-4 text-primary" />
                                        10m Air Pistol
                                    </span>
                                </div>

                                <Link
                                    href="/register"
                                    className="mt-7 inline-flex h-12 w-fit animate-pulse items-center justify-center rounded-md bg-[#D4AF37] px-7 text-sm font-semibold uppercase tracking-[0.12em] text-black shadow-[0_0_26px_rgba(212,175,55,0.42)] transition hover:bg-[#E5C558] hover:shadow-[0_0_36px_rgba(229,197,88,0.62)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                >
                                    Register Now
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

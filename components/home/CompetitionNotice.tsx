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

    React.useEffect(() => {
        if (!isVisible) return

        const scrollY = window.scrollY
        const previousOverflow = document.body.style.overflow
        const previousPosition = document.body.style.position
        const previousTop = document.body.style.top
        const previousWidth = document.body.style.width
        document.body.style.overflow = "hidden"
        document.body.style.position = "fixed"
        document.body.style.top = `-${scrollY}px`
        document.body.style.width = "100%"

        return () => {
            document.body.style.overflow = previousOverflow
            document.body.style.position = previousPosition
            document.body.style.top = previousTop
            document.body.style.width = previousWidth
            window.scrollTo(0, scrollY)
        }
    }, [isVisible])

    const closeNotice = () => {
        setIsVisible(false)
        setIsDismissed(true)
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-3 py-3 sm:items-center sm:px-4 sm:py-8"
                    initial={{ opacity: 0, y: 40, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24, scale: 0.98 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    role="dialog"
                    aria-modal="false"
                    aria-labelledby="competition-notice-title"
                >
                    <div className="relative max-h-[calc(100svh-1.5rem)] w-full max-w-6xl overflow-y-auto rounded-lg border border-primary/35 bg-black shadow-2xl shadow-primary/10 sm:max-h-[calc(100svh-4rem)]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_25%,rgba(212,175,55,0.22),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_36%)]" />
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

                        <button
                            type="button"
                            onClick={closeNotice}
                            className="sticky left-full top-3 z-20 mr-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/80 text-white/70 transition hover:border-primary/50 hover:text-primary"
                            aria-label="Close competition announcement"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="relative z-10 grid gap-4 p-4 pt-0 md:grid-cols-[1fr_1.35fr] md:gap-7 md:p-9 lg:p-10">
                            <div className="relative min-h-[clamp(180px,42svh,300px)] overflow-hidden rounded-md border border-white/10 bg-neutral-950 md:min-h-[520px]">
                                <Image
                                    src="/pop-up.jpeg"
                                    alt="Salvo shooting competition announcement"
                                    fill
                                    sizes="(min-width: 768px) 40vw, 100vw"
                                    className="object-contain"
                                />
                            </div>

                            <div className="flex flex-col justify-center md:pr-12">
                                <div className="mb-3 flex flex-wrap items-center gap-3 md:mb-4">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                                        <Bell className="h-3.5 w-3.5" />
                                        Competition Alert
                                    </span>
                                    <span className="inline-flex items-center gap-2 text-sm text-white/55">
                                        <CalendarClock className="h-4 w-4 text-primary" />
                                        Dates to be announced soon
                                    </span>
                                </div>

                                <h2 id="competition-notice-title" className="mb-3 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-5xl">
                                    Upcoming Shooting Competition
                                </h2>
                                <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base md:mb-5 md:text-lg">
                                    Get ready for precision, pressure, and championship focus at Salvo Shooters Arena. Event categories and registration details will be announced soon.
                                </p>

                                <div className="flex flex-wrap gap-2 text-sm font-medium text-white/75 md:gap-3">
                                    <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2">
                                        <Crosshair className="h-4 w-4 text-primary" />
                                        10m Air Rifle
                                    </span>
                                    <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2">
                                        <Trophy className="h-4 w-4 text-primary" />
                                        10m Air Pistol
                                    </span>
                                </div>

                                <div className="sticky bottom-0 -mx-4 mt-4 bg-black/95 px-4 py-3 md:static md:mx-0 md:mt-7 md:bg-transparent md:p-0">
                                    <Link
                                        href="/register"
                                        className="inline-flex h-11 w-full animate-pulse items-center justify-center rounded-md bg-[#D4AF37] px-6 text-sm font-semibold uppercase tracking-[0.12em] text-black shadow-[0_0_26px_rgba(212,175,55,0.42)] transition hover:bg-[#E5C558] hover:shadow-[0_0_36px_rgba(229,197,88,0.62)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:w-fit md:h-12 md:px-7"
                                    >
                                        Register Now
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

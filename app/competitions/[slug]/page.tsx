import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { ArrowRight, CalendarDays, ClipboardList, Medal, Trophy, Users } from "lucide-react"
import { formatCompetitionDateRange, formatCurrency } from "@/lib/competition"
import { prisma } from "@/lib/prisma"
import { getTemplatePublicCompetition, serializeCompetition } from "@/lib/competition-server"

type PageProps = {
    params: Promise<{ slug: string }>
}

export const dynamic = "force-dynamic"

export default async function CompetitionPage({ params }: PageProps) {
    const { slug } = await params
    const competitionRecord = await prisma.competition.findUnique({
        where: { slug },
        include: { _count: { select: { registrations: true } } },
    }).catch((error) => {
        if (process.env.NODE_ENV === "production") throw error
        return null
    })
    if (!competitionRecord && process.env.NODE_ENV !== "production" && slug === "36th-salvo-cup") {
        const competition = getTemplatePublicCompetition()
        return <CompetitionDetail competition={competition} registrations={0} />
    }
    if (!competitionRecord || !competitionRecord.isPublished) notFound()

    const competition = serializeCompetition(competitionRecord)
    return <CompetitionDetail competition={competition} registrations={competitionRecord._count.registrations} />
}

function CompetitionDetail({ competition, registrations }: { competition: ReturnType<typeof getTemplatePublicCompetition>; registrations: number }) {
    const dateRange = formatCompetitionDateRange(competition.startDate, competition.endDate)

    return (
        <div className="min-h-screen bg-black text-white">
            <section className="relative overflow-hidden border-b border-white/10 px-4 py-14 md:py-20">
                <Image
                    src={competition.heroImagePath || "/competition-range.JPG"}
                    alt=""
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover opacity-35"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/84 to-black/45" />
                <div className="container relative z-10 mx-auto">
                    <div className="max-w-4xl">
                        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
                            <Trophy className="h-3.5 w-3.5" />
                            {competition.shortTitle}
                        </p>
                        <h1 className="text-4xl font-black tracking-tight md:text-6xl">{competition.title}</h1>
                        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
                            {competition.description || "Competition registration, details, and results for Salvo Shooters Arena."}
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            {competition.registrationOpen && (
                                <Link href={`/competitions/${competition.slug}/register`} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-[#D4AF37] px-7 text-base font-black uppercase tracking-[0.12em] text-black shadow-[0_0_30px_rgba(212,175,55,0.38)] transition hover:bg-[#E5C558] hover:shadow-[0_0_40px_rgba(229,197,88,0.55)]">
                                    <ClipboardList className="h-5 w-5" />
                                    Register Now
                                    <ArrowRight className="h-5 w-5" />
                                </Link>
                            )}
                            {(competition.resultsPublished || competition.registrationOpen) && (
                                <Link href={`/competitions/${competition.slug}/results`} className="inline-flex h-12 items-center justify-center rounded-md border border-white/15 px-6 font-bold text-white transition hover:border-[#D4AF37] hover:text-[#D4AF37]">
                                    View Results
                                </Link>
                            )}
                            <Link href="/competitions" className="inline-flex h-12 items-center justify-center rounded-md border border-white/10 px-6 font-bold text-white/70 transition hover:border-white/30 hover:text-white">
                                All Competitions
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <main className="container mx-auto px-4 py-10">
                {competition.registrationOpen && (
                    <section className="mb-6 rounded-lg border border-[#D4AF37]/35 bg-[linear-gradient(135deg,rgba(212,175,55,0.18),rgba(255,255,255,0.035))] p-5 shadow-2xl shadow-[#D4AF37]/10">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="max-w-2xl">
                                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37]">
                                    <ClipboardList className="h-4 w-4" />
                                    Registration Form
                                </p>
                                <h2 className="mt-2 text-2xl font-black">Click the Register Now button to fill the competition form.</h2>
                                <p className="mt-2 text-sm leading-relaxed text-white/60">
                                    This opens the shooter details, event category selection, relay slot, and payment form for {competition.shortTitle}.
                                </p>
                            </div>
                            <Link
                                href={`/competitions/${competition.slug}/register`}
                                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-[#D4AF37] px-6 font-black text-black transition hover:bg-[#E5C558]"
                            >
                                Register Now
                                <ArrowRight className="h-5 w-5" />
                            </Link>
                        </div>
                    </section>
                )}

                <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                    <section className="rounded-lg border border-white/10 bg-neutral-950 p-5">
                        <h2 className="text-2xl font-black">Competition Details</h2>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <Info icon={<CalendarDays className="h-4 w-4" />} label="Dates" value={dateRange} />
                            <Info icon={<Users className="h-4 w-4" />} label="Registrations" value={registrations} />
                            <Info icon={<Medal className="h-4 w-4" />} label="Status" value={competition.registrationOpen ? "Registration Open" : competition.resultsPublished ? "Results Published" : competition.status} />
                            <Info icon={<Trophy className="h-4 w-4" />} label="Venue" value={competition.venue || "Salvo Shooters Arena"} />
                        </div>
                    </section>

                    <section className="rounded-lg border border-white/10 bg-neutral-950 p-5">
                        <h2 className="text-2xl font-black">Events</h2>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {competition.config.events.map((event) => (
                                <div key={event.id} className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                                    <p className="font-black">{event.title}</p>
                                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37]">{event.ruleSet} {event.discipline}</p>
                                    <p className="mt-3 text-sm text-white/55">
                                        Prizes: {event.prizes.map((prize) => formatCurrency(prize)).join(" / ")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    )
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
    return (
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/35">
                {icon}
                {label}
            </p>
            <p className="mt-2 font-bold text-white">{value}</p>
        </div>
    )
}

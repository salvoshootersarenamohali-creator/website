import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { ArrowRight, CalendarDays, ClipboardList, Clock, CreditCard, FileText, MapPin, Medal, ShieldCheck, Trophy, Users } from "lucide-react"
import { formatCompetitionDateRange, formatCurrency, getCompetitionStatusLabel, isCompetitionRegistrationAvailable } from "@/lib/competition"
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
    const registrationAvailable = isCompetitionRegistrationAvailable(competition)
    const statusLabel = getCompetitionStatusLabel(competition)
    const adminHref = competition.slug === "faridkot-2026-27" ? "/admin/faridkot" : null
    const paymentLabel = competition.config.allowedPaymentModes.length === 1 && competition.config.allowedPaymentModes[0] === "cash"
        ? "Cash only"
        : "Cash / UPI"
    const requiredDocuments = [
        "Shooter photo",
        competition.config.requiredDocuments.birthCertificate ? "Date of birth certificate" : null,
        competition.config.requiredDocuments.aadhaarCard ? "Aadhaar card copy" : null,
    ].filter(Boolean)

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
                <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(0,0,0,0.94),rgba(7,45,39,0.84),rgba(121,39,55,0.52))]" />
                <div className="container relative z-10 mx-auto">
                    <div className="max-w-4xl">
                        <div className="mb-4 flex flex-wrap gap-2">
                            <p className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold text-[#D4AF37]">
                                <Trophy className="h-3.5 w-3.5" />
                                {competition.shortTitle}
                            </p>
                            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {dateRange}
                            </p>
                            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-100">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {statusLabel}
                            </p>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight md:text-6xl">{competition.title}</h1>
                        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
                            {competition.description || "Competition registration, details, and results for Salvo Shooters Arena."}
                        </p>
                        <div className="mt-7 grid max-w-3xl gap-3 sm:grid-cols-3">
                            <HeroMetric icon={<MapPin className="h-4 w-4" />} label="Venue" value={competition.venue || "Salvo Shooters Arena"} />
                            <HeroMetric icon={<Clock className="h-4 w-4" />} label="Matches" value={`Start ${competition.config.matchStartTime}`} />
                            <HeroMetric icon={<CreditCard className="h-4 w-4" />} label="Payment" value={paymentLabel} />
                        </div>
                        <div className="mt-8 flex flex-wrap gap-3">
                            {registrationAvailable && (
                                <Link href={`/competitions/${competition.slug}/register`} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-[#D4AF37] px-7 text-base font-black uppercase tracking-[0.12em] text-black shadow-[0_0_30px_rgba(212,175,55,0.38)] transition hover:bg-[#E5C558] hover:shadow-[0_0_40px_rgba(229,197,88,0.55)]">
                                    <ClipboardList className="h-5 w-5" />
                                    Register Now
                                    <ArrowRight className="h-5 w-5" />
                                </Link>
                            )}
                            {(competition.resultsPublished || registrationAvailable) && (
                                <Link href={`/competitions/${competition.slug}/results`} className="inline-flex h-12 items-center justify-center rounded-md border border-white/15 px-6 font-bold text-white transition hover:border-[#D4AF37] hover:text-[#D4AF37]">
                                    View Results
                                </Link>
                            )}
                            {adminHref && (
                                <Link href={adminHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-400/10 px-6 font-bold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/15">
                                    <ShieldCheck className="h-4 w-4" />
                                    Coach Admin
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
                {registrationAvailable && (
                    <section className="mb-6 rounded-lg border border-[#D4AF37]/35 bg-[linear-gradient(135deg,rgba(212,175,55,0.2),rgba(19,117,96,0.12),rgba(255,255,255,0.035))] p-5 shadow-2xl shadow-[#D4AF37]/10">
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
                            <Info icon={<Medal className="h-4 w-4" />} label="Status" value={statusLabel} />
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
                                    <p className="mt-3 text-sm font-bold text-white">
                                        Entry fee: {formatCurrency(competition.config.feesByRuleSet[event.ruleSet] ?? competition.config.entryFee)}
                                    </p>
                                    <p className="mt-3 text-sm text-white/55">
                                        {competition.config.noCashPrizes
                                            ? competition.config.awardsNote
                                            : `Prizes: ${event.prizes.map((prize) => formatCurrency(prize)).join(" / ")}`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-3">
                    <section className="rounded-lg border border-emerald-300/20 bg-emerald-400/[0.06] p-5">
                        <h2 className="flex items-center gap-2 text-xl font-black text-emerald-100">
                            <Clock className="h-5 w-5" />
                            Match Schedule
                        </h2>
                        <div className="mt-4 space-y-3 text-sm text-white/70">
                            {competition.config.slotOptions.map((slot) => (
                                <p key={slot.date} className="rounded-md border border-white/10 bg-black/20 p-3">
                                    <span className="font-bold text-white">{slot.label}</span>
                                    <span className="mt-1 block">{slot.slots.join(", ")}</span>
                                </p>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/[0.07] p-5">
                        <h2 className="flex items-center gap-2 text-xl font-black text-[#E5C558]">
                            <FileText className="h-5 w-5" />
                            Documents
                        </h2>
                        <div className="mt-4 space-y-2 text-sm text-white/72">
                            {requiredDocuments.map((item) => (
                                <p key={String(item)} className="rounded-md border border-white/10 bg-black/20 px-3 py-2">{item}</p>
                            ))}
                            {competition.config.requiresGuardianDetails && <p className="rounded-md border border-white/10 bg-black/20 px-3 py-2">Mother and father names</p>}
                            {competition.config.requiresAddress && <p className="rounded-md border border-white/10 bg-black/20 px-3 py-2">Shooter address</p>}
                        </div>
                    </section>

                    <section className="rounded-lg border border-rose-300/20 bg-rose-400/[0.06] p-5">
                        <h2 className="flex items-center gap-2 text-xl font-black text-rose-100">
                            <Medal className="h-5 w-5" />
                            Awards & Rules
                        </h2>
                        <p className="mt-4 rounded-md border border-white/10 bg-black/20 p-3 text-sm text-white/75">{competition.config.awardsNote}</p>
                        <div className="mt-3 space-y-2 text-sm text-white/65">
                            {competition.config.rules.slice(0, 4).map((rule) => (
                                <p key={rule} className="rounded-md border border-white/10 bg-black/20 px-3 py-2">{rule}</p>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    )
}

function HeroMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-md border border-white/12 bg-white/10 p-4 backdrop-blur">
            <p className="flex items-center gap-2 text-xs font-bold text-white/55">
                {icon}
                {label}
            </p>
            <p className="mt-2 text-sm font-black text-white">{value}</p>
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

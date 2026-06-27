import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CalendarDays, Medal, ShieldCheck, Trophy } from "lucide-react"
import { formatCompetitionDateRange, getCompetitionStatusLabel, isCompetitionClosed } from "@/lib/competition"
import { getTemplatePublicCompetition, serializeCompetition } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function CompetitionsPage() {
    const competitions = await prisma.competition.findMany({
            where: { isPublished: true },
            orderBy: [
                { startDate: "desc" },
                { createdAt: "desc" },
            ],
            include: {
                _count: {
                    select: { registrations: true },
                },
            },
        })
        .then((rows) => rows.map((competition) => ({
            ...serializeCompetition(competition),
            registrations: competition._count.registrations,
        })))
        .catch((error) => {
            if (process.env.NODE_ENV === "production") throw error
            return [{ ...getTemplatePublicCompetition(), registrations: 0 }]
        })

    return (
        <div className="min-h-screen bg-black text-white">
            <section className="border-b border-white/10 px-4 py-16 md:py-20">
                <div className="container mx-auto">
                    <div className="max-w-3xl">
                        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
                            <Trophy className="h-3.5 w-3.5" />
                            Competitions
                        </p>
                        <h1 className="text-4xl font-black tracking-tight md:text-6xl">Choose a Competition</h1>
                        <p className="mt-4 text-lg leading-relaxed text-white/65">
                            Register for active matches, follow live results, and revisit completed Salvo competitions from one place.
                        </p>
                    </div>
                </div>
            </section>

            <main className="container mx-auto px-4 py-10">
                {competitions.length ? (
                    <div className="grid gap-5 lg:grid-cols-2">
                        {competitions.map((competition) => {
                            const adminHref = competition.slug === "faridkot-2026-27" ? "/admin/faridkot" : null

                            return (
                                <article
                                    key={competition.slug}
                                    className="group grid overflow-hidden rounded-lg border border-white/10 bg-neutral-950 transition hover:border-[#D4AF37]/55 md:grid-cols-[220px_1fr]"
                                >
                                    <Link href={`/competitions/${competition.slug}`} className="relative block min-h-56 bg-neutral-900 md:min-h-full">
                                        <Image
                                            src={competition.heroImagePath || "/competition-range.JPG"}
                                            alt=""
                                            fill
                                            sizes="(min-width: 1024px) 220px, 100vw"
                                            className="object-cover transition duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent md:bg-black/10" />
                                    </Link>
                                    <div className="p-5">
                                        <div className="mb-3 flex flex-wrap gap-2">
                                            <StatusPill competition={competition} />
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/60">
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                {formatCompetitionDateRange(competition.startDate, competition.endDate)}
                                            </span>
                                        </div>
                                        <Link href={`/competitions/${competition.slug}`} className="block">
                                            <h2 className="text-2xl font-black text-white transition group-hover:text-[#D4AF37]">{competition.title}</h2>
                                            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/55">
                                                {competition.description || "Competition details, registration, and results."}
                                            </p>
                                        </Link>
                                        <div className="mt-5 grid grid-cols-3 gap-2">
                                            <Mini label="Entries" value={competition.registrations} />
                                            <Mini label="Events" value={competition.config.events.length} />
                                            <Mini label="Results" value={competition.resultsPublished ? "Live" : "Soon"} />
                                        </div>
                                        <div className="mt-5 flex flex-wrap gap-2">
                                            <Link href={`/competitions/${competition.slug}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#D4AF37] px-4 text-sm font-black text-black transition hover:bg-[#E5C558]">
                                                View Details
                                                <ArrowRight className="h-4 w-4" />
                                            </Link>
                                            {adminHref && (
                                                <Link href={adminHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-400/10 px-4 text-sm font-bold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/15">
                                                    <ShieldCheck className="h-4 w-4" />
                                                    Coach Admin
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                ) : (
                    <div className="rounded-lg border border-white/10 bg-neutral-950 p-8 text-center">
                        <Medal className="mx-auto h-9 w-9 text-white/35" />
                        <p className="mt-3 font-bold">No public competitions yet.</p>
                        <p className="mt-1 text-sm text-white/50">Published competitions will appear here.</p>
                    </div>
                )}
            </main>
        </div>
    )
}

function StatusPill({ competition }: { competition: { endDate: string; registrationOpen: boolean; resultsPublished: boolean; status: string } }) {
    const label = getCompetitionStatusLabel(competition)
    const closed = isCompetitionClosed(competition)
    const classes = closed
        ? "border-rose-300/35 bg-rose-400/10 text-rose-100"
        : competition.registrationOpen
        ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-100"
        : competition.resultsPublished
            ? "border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#D4AF37]"
            : "border-white/10 bg-white/[0.04] text-white/60"

    return <span className={`rounded-full border px-3 py-1 text-xs font-bold ${classes}`}>{label}</span>
}

function Mini({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">{label}</p>
            <p className="mt-1 font-black text-[#D4AF37]">{value}</p>
        </div>
    )
}

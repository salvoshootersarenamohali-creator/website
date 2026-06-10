import Image from "next/image"
import Link from "next/link"
import { CalendarDays, Medal, Trophy } from "lucide-react"
import { formatCompetitionDateRange } from "@/lib/competition"
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
                        {competitions.map((competition) => (
                            <Link
                                key={competition.slug}
                                href={`/competitions/${competition.slug}`}
                                className="group grid overflow-hidden rounded-lg border border-white/10 bg-neutral-950 transition hover:border-[#D4AF37]/55 md:grid-cols-[220px_1fr]"
                            >
                                <div className="relative min-h-56 bg-neutral-900 md:min-h-full">
                                    <Image
                                        src={competition.heroImagePath || "/competition-range.JPG"}
                                        alt=""
                                        fill
                                        sizes="(min-width: 1024px) 220px, 100vw"
                                        className="object-cover transition duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent md:bg-black/10" />
                                </div>
                                <div className="p-5">
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        <StatusPill competition={competition} />
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/60">
                                            <CalendarDays className="h-3.5 w-3.5" />
                                            {formatCompetitionDateRange(competition.startDate, competition.endDate)}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-black text-white group-hover:text-[#D4AF37]">{competition.title}</h2>
                                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/55">
                                        {competition.description || "Competition details, registration, and results."}
                                    </p>
                                    <div className="mt-5 grid grid-cols-3 gap-2">
                                        <Mini label="Entries" value={competition.registrations} />
                                        <Mini label="Events" value={competition.config.events.length} />
                                        <Mini label="Results" value={competition.resultsPublished ? "Live" : "Soon"} />
                                    </div>
                                </div>
                            </Link>
                        ))}
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

function StatusPill({ competition }: { competition: { registrationOpen: boolean; resultsPublished: boolean; status: string } }) {
    const label = competition.registrationOpen ? "Registration Open" : competition.resultsPublished ? "Results" : competition.status
    const classes = competition.registrationOpen
        ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-100"
        : competition.resultsPublished
            ? "border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#D4AF37]"
            : "border-white/10 bg-white/[0.04] text-white/60"

    return <span className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${classes}`}>{label}</span>
}

function Mini({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">{label}</p>
            <p className="mt-1 font-black text-[#D4AF37]">{value}</p>
        </div>
    )
}

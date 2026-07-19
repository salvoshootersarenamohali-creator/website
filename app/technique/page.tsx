import Link from "next/link"
import { techniques } from "@/data/techniques"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TechniqueAnimation } from "@/components/technique/animations/TechniqueAnimation"
import { ArrowRight, BookOpen, Play, Sparkles, Target } from "lucide-react"

const visualSteps = {
    Pistol: "grip",
    Rifle: "stance",
} as const

export default function TechniquePage() {
    const totalSteps = techniques.reduce((total, technique) => total + technique.steps.length, 0)

    return (
        <main className="relative isolate min-h-screen overflow-hidden bg-[#030303] pb-24 pt-36 md:pb-32 md:pt-44">
            <div
                className="pointer-events-none absolute inset-0 -z-20 opacity-40"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
                    backgroundSize: "72px 72px",
                    maskImage: "linear-gradient(to bottom, black, transparent 72%)",
                }}
            />
            <div className="pointer-events-none absolute left-1/2 top-8 -z-10 h-[34rem] w-[58rem] max-w-[95vw] -translate-x-1/2 rounded-full bg-primary/[0.08] blur-[140px]" />
            <div className="pointer-events-none absolute -left-40 top-[38rem] -z-10 h-96 w-96 rounded-full bg-emerald-900/10 blur-[120px]" />

            <div className="container mx-auto px-4">
                <section className="mx-auto max-w-4xl text-center">
                    <Badge className="mb-7 gap-2 border-primary/25 bg-primary/[0.08] px-4 py-1.5 text-[10px] font-bold tracking-[0.24em] text-primary hover:bg-primary/[0.08]">
                        <Sparkles className="h-3 w-3" />
                        RESOURCE LIBRARY
                    </Badge>

                    <h1 className="text-balance text-5xl font-black uppercase leading-[0.92] tracking-[-0.045em] text-white sm:text-6xl md:text-7xl lg:text-8xl">
                        Master your
                        <span className="block bg-gradient-to-r from-[#E5C558] via-[#D4AF37] to-[#A98216] bg-clip-text text-transparent">
                            technique
                        </span>
                    </h1>

                    <p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-7 text-white/55 sm:text-lg">
                        Build a repeatable shot from the ground up. Follow focused, animated
                        walkthroughs for every phase of 10m air pistol and rifle shooting.
                    </p>

                    <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.035] px-2 py-5 backdrop-blur-sm sm:px-6">
                        <div className="px-2">
                            <p className="text-2xl font-bold text-white sm:text-3xl">{techniques.length}</p>
                            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35 sm:text-[10px]">Disciplines</p>
                        </div>
                        <div className="px-2">
                            <p className="text-2xl font-bold text-white sm:text-3xl">{totalSteps}</p>
                            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35 sm:text-[10px]">Guided steps</p>
                        </div>
                        <div className="px-2">
                            <p className="flex h-9 items-center justify-center text-primary">
                                <Play className="h-6 w-6 fill-current" />
                            </p>
                            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35 sm:text-[10px]">Animated</p>
                        </div>
                    </div>
                </section>

                <section className="mx-auto mt-20 max-w-6xl md:mt-28">
                    <div className="mb-8 flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <div className="mb-3 flex items-center gap-2 text-primary">
                                <Target className="h-4 w-4" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Select your path</span>
                            </div>
                            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Choose your discipline</h2>
                        </div>
                        <p className="max-w-md text-sm leading-6 text-white/40 sm:text-right">
                            Start at step one or jump directly to the part of your shot that needs work.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                        {techniques.map((technique, index) => (
                            <Link
                                key={technique.id}
                                href={`/technique/${technique.slug}`}
                                className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-black"
                            >
                                <Card className="h-full overflow-hidden rounded-2xl border-white/10 bg-[#0b0b0b]/95 shadow-2xl shadow-black/40 transition-all duration-500 group-hover:-translate-y-1 group-hover:border-primary/45 group-hover:shadow-primary/[0.08]">
                                    <div className="relative aspect-[16/10] overflow-hidden border-b border-white/[0.08] bg-neutral-950">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(212,175,55,0.16),transparent_56%)] transition-opacity duration-500 group-hover:opacity-100" />
                                        <div
                                            className="absolute inset-x-8 -bottom-6 -top-8 opacity-75 transition-all duration-700 group-hover:scale-[1.035] group-hover:opacity-100 sm:inset-x-16"
                                            aria-hidden="true"
                                        >
                                            <TechniqueAnimation
                                                slug={technique.slug}
                                                stepId={visualSteps[technique.discipline]}
                                            />
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-black/20" />

                                        <div className="absolute left-5 top-5 flex items-center gap-2 sm:left-6 sm:top-6">
                                            <span className="grid h-9 w-9 place-items-center rounded-full border border-primary/30 bg-black/65 text-xs font-bold text-primary backdrop-blur-md">
                                                {String(index + 1).padStart(2, "0")}
                                            </span>
                                            <Badge className="border-white/10 bg-black/65 px-3 py-1 text-[9px] uppercase tracking-[0.2em] text-white/65 backdrop-blur-md hover:bg-black/65">
                                                {technique.discipline}
                                            </Badge>
                                        </div>

                                        <div className="absolute right-5 top-5 rounded-full border border-white/10 bg-black/65 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/45 backdrop-blur-md sm:right-6 sm:top-6">
                                            {technique.steps.length} step guide
                                        </div>

                                        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between sm:bottom-6 sm:left-6 sm:right-6">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/90">
                                                Interactive walkthrough
                                            </p>
                                            <BookOpen className="h-5 w-5 text-white/35" />
                                        </div>
                                    </div>

                                    <CardContent className="p-6 sm:p-8">
                                        <h3 className="text-2xl font-bold tracking-tight text-white transition-colors duration-300 group-hover:text-primary sm:text-3xl">
                                            {technique.title}
                                        </h3>
                                        <p className="mt-3 max-w-lg text-sm leading-6 text-white/50 sm:text-base">
                                            {technique.description}
                                        </p>

                                        <div className="mt-6 flex flex-wrap gap-2">
                                            {technique.steps.slice(0, 3).map((step) => (
                                                <span
                                                    key={step.id}
                                                    className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[10px] font-medium text-white/45"
                                                >
                                                    {step.title.replace(/^\d+\.\s*/, "")}
                                                </span>
                                            ))}
                                            {technique.steps.length > 3 && (
                                                <span className="rounded-full border border-primary/15 bg-primary/[0.06] px-3 py-1.5 text-[10px] font-medium text-primary/80">
                                                    +{technique.steps.length - 3} more
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-8 flex items-center justify-between border-t border-white/[0.08] pt-5">
                                            <span className="text-sm font-semibold text-white/75">Start the guide</span>
                                            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-black transition-all duration-300 group-hover:translate-x-1 group-hover:bg-[#E5C558]">
                                                <ArrowRight className="h-4 w-4" />
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    )
}

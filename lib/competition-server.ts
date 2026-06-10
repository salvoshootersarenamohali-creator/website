import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import {
    PublicCompetition,
    defaultCompetitionConfig,
    normalizeCompetitionConfig,
} from "@/lib/competition"
import { prisma } from "@/lib/prisma"

export function serializeCompetition(competition: {
    id: string
    slug: string
    title: string
    shortTitle: string
    description: string | null
    venue: string | null
    startDate: Date
    endDate: Date
    status: string
    isPublished: boolean
    registrationOpen: boolean
    resultsPublished: boolean
    paymentQrPath: string | null
    heroImagePath: string | null
    config: Prisma.JsonValue
}): PublicCompetition {
    return {
        id: competition.id,
        slug: competition.slug,
        title: competition.title,
        shortTitle: competition.shortTitle,
        description: competition.description,
        venue: competition.venue,
        startDate: competition.startDate.toISOString(),
        endDate: competition.endDate.toISOString(),
        status: competition.status,
        isPublished: competition.isPublished,
        registrationOpen: competition.registrationOpen,
        resultsPublished: competition.resultsPublished,
        paymentQrPath: competition.paymentQrPath,
        heroImagePath: competition.heroImagePath,
        config: normalizeCompetitionConfig(competition.config),
    }
}

export function getTemplatePublicCompetition(): PublicCompetition {
    return {
        id: "36th-salvo-cup",
        slug: "36th-salvo-cup",
        title: "36th Salvo Cup",
        shortTitle: "36th Salvo Cup",
        description: "Three days of precision shooting at Salvo Shooters Arena.",
        venue: "Salvo Shooters Arena, Sector 86, Mohali",
        startDate: "2026-06-05T00:00:00.000Z",
        endDate: "2026-06-07T00:00:00.000Z",
        status: "open",
        isPublished: true,
        registrationOpen: true,
        resultsPublished: true,
        paymentQrPath: "/upi-scanner.png",
        heroImagePath: "/competition-range.JPG",
        config: defaultCompetitionConfig,
    }
}

export function getCompetitionSlugFromRequest(request: NextRequest) {
    const querySlug = request.nextUrl.searchParams.get("competition")
    if (querySlug) return querySlug

    const segments = request.nextUrl.pathname.split("/").filter(Boolean)
    const competitionIndex = segments.indexOf("competitions")
    if (competitionIndex >= 0 && segments[competitionIndex + 1]) {
        return decodeURIComponent(segments[competitionIndex + 1])
    }

    return null
}

export async function getActiveCompetition() {
    const active = await prisma.competition.findFirst({
        where: {
            isPublished: true,
            registrationOpen: true,
        },
        orderBy: [
            { startDate: "desc" },
            { createdAt: "desc" },
        ],
    })
    if (active) return active

    return prisma.competition.findFirst({
        where: { isPublished: true },
        orderBy: [
            { startDate: "desc" },
            { createdAt: "desc" },
        ],
    })
}

export async function getCompetitionBySlugOrActive(slug: string | null) {
    if (slug) {
        return prisma.competition.findUnique({ where: { slug } })
    }
    return getActiveCompetition()
}

export function competitionFilePrefix(competition: Pick<PublicCompetition, "slug"> | { slug: string }) {
    return competition.slug.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "competition"
}

export function cloneDefaultConfigForYear(year: number) {
    return {
        ...defaultCompetitionConfig,
        competitionYear: year,
        slotOptions: defaultCompetitionConfig.slotOptions.map((slot) => ({
            ...slot,
            date: slot.date.replace(String(defaultCompetitionConfig.competitionYear), String(year)),
            label: slot.label.replace(String(defaultCompetitionConfig.competitionYear), String(year)),
            slots: [...slot.slots],
        })),
        events: defaultCompetitionConfig.events.map((event) => ({
            ...event,
            prizes: [...event.prizes] as [number, number, number],
        })),
    }
}

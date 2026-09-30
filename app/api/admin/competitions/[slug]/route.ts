import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { normalizeCompetitionConfig, parseCompetitionDate } from "@/lib/competition"
import { serializeCompetition } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
    params: Promise<{ slug: string }>
}

function slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

function readBoolean(value: unknown) {
    return value === true || value === "true"
}

export async function GET(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    const { slug } = await context.params
    const competition = await prisma.competition.findUnique({
        where: { slug },
        include: { _count: { select: { registrations: true } } },
    })
    if (!competition) return Response.json({ error: "Competition not found." }, { status: 404 })

    return Response.json({
        competition: {
            ...serializeCompetition(competition),
            registrations: competition._count.registrations,
        },
    })
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { slug } = await context.params
        const existing = await prisma.competition.findUnique({ where: { slug } })
        if (!existing) return Response.json({ error: "Competition not found." }, { status: 404 })

        const body = await request.json() as Record<string, unknown>
        const nextSlug = slugify(String(body.slug ?? existing.slug))
        if (!nextSlug) return Response.json({ error: "Slug is required." }, { status: 400 })
        const duplicate = await prisma.competition.findUnique({ where: { slug: nextSlug }, select: { id: true } })
        if (duplicate && duplicate.id !== existing.id) {
            return Response.json({ error: "Another competition already uses this slug." }, { status: 409 })
        }

        const config = normalizeCompetitionConfig(body.config ?? existing.config)
        const startDate = parseCompetitionDate(String(body.startDate ?? existing.startDate.toISOString()))
        const endDate = parseCompetitionDate(String(body.endDate ?? existing.endDate.toISOString()))
        if (!startDate || !endDate) {
            return Response.json({ error: "Enter valid start and end dates." }, { status: 400 })
        }
        if (endDate.getTime() < startDate.getTime()) {
            return Response.json({ error: "The end date cannot be before the start date." }, { status: 400 })
        }

        const requestedYear = Number(body.competitionYear ?? config.competitionYear)
        if (!Number.isInteger(requestedYear) || requestedYear < 1900 || requestedYear > 2200) {
            return Response.json({ error: "Enter a valid competition year." }, { status: 400 })
        }
        const competitionYear = requestedYear
        const rangeStart = startDate.getTime()
        const rangeEnd = endDate.getTime()
        const scheduleDates = new Set<string>()
        for (const day of config.slotOptions) {
            const dayDate = parseCompetitionDate(day.date)
            if (!dayDate || dayDate.getTime() < rangeStart || dayDate.getTime() > rangeEnd) {
                return Response.json({ error: "Every relay date must be within the competition date range." }, { status: 400 })
            }
            if (scheduleDates.has(day.date)) {
                return Response.json({ error: "Each relay date can only be added once." }, { status: 400 })
            }
            if (!day.slots.length || day.slots.some((slot) => !slot.trim())) {
                return Response.json({ error: `Add at least one valid time slot for ${day.label || day.date}.` }, { status: 400 })
            }
            scheduleDates.add(day.date)
        }

        const isPublished = readBoolean(body.isPublished)
        const registrationOpen = readBoolean(body.registrationOpen)
        if (registrationOpen && !isPublished) {
            return Response.json({ error: "Publish the competition before opening registration." }, { status: 400 })
        }

        const competition = await prisma.competition.update({
            where: { id: existing.id },
            data: {
                slug: nextSlug,
                title: String(body.title ?? existing.title).trim() || existing.title,
                shortTitle: String(body.shortTitle ?? existing.shortTitle).trim() || existing.shortTitle,
                description: String(body.description ?? "").trim() || null,
                venue: String(body.venue ?? "").trim() || null,
                startDate,
                endDate,
                competitionYear,
                status: String(body.status ?? existing.status).trim() || existing.status,
                isPublished,
                registrationOpen,
                resultsPublished: readBoolean(body.resultsPublished),
                paymentQrPath: String(body.paymentQrPath ?? "").trim() || null,
                heroImagePath: String(body.heroImagePath ?? "").trim() || null,
                config: {
                    ...config,
                    competitionYear,
                },
            },
        })

        return Response.json({ competition: serializeCompetition(competition) })
    } catch (error) {
        console.error("Unable to update competition", error)
        return Response.json({ error: "Unable to update competition." }, { status: 500 })
    }
}

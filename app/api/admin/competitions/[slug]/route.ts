import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { normalizeCompetitionConfig } from "@/lib/competition"
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

function readDate(value: unknown) {
    const date = new Date(String(value ?? ""))
    return Number.isNaN(date.getTime()) ? null : date
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
        const startDate = readDate(body.startDate) ?? existing.startDate
        const endDate = readDate(body.endDate) ?? existing.endDate
        const competitionYear = Number.isInteger(Number(body.competitionYear)) ? Number(body.competitionYear) : config.competitionYear

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
                isPublished: readBoolean(body.isPublished),
                registrationOpen: readBoolean(body.registrationOpen),
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

import { NextRequest } from "next/server"
import {
    adminUnauthorized,
    createCompetitionAdminPinDigest,
    isAdminRequest,
    isCompetitionAdminRequest,
    validateCompetitionAdminPin,
} from "@/lib/admin"
import { normalizeCompetitionConfig, parseCompetitionDate, validateCashPrizeConfiguration, validateParaEntryConfiguration, validateRequiredDocuments } from "@/lib/competition"
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

function isAdminPinConflict(error: unknown) {
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") return false
    const target = "meta" in error && error.meta && typeof error.meta === "object" && "target" in error.meta
        ? error.meta.target
        : null
    return Array.isArray(target)
        ? target.includes("adminPinDigest")
        : String(target ?? "").includes("adminPinDigest")
}

export async function GET(request: NextRequest, context: RouteContext) {
    if (!(await isCompetitionAdminRequest(request))) return adminUnauthorized()

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
            hasAdminPin: Boolean(competition.adminPinDigest),
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
        const adminPin = typeof body.adminPin === "string" ? body.adminPin.trim() : ""
        let adminPinDigest: string | undefined
        if (adminPin) {
            const adminPinError = validateCompetitionAdminPin(adminPin)
            if (adminPinError) return Response.json({ error: adminPinError }, { status: 400 })

            try {
                adminPinDigest = createCompetitionAdminPinDigest(adminPin)
            } catch {
                return Response.json({ error: "Competition PIN protection is not configured." }, { status: 500 })
            }

            const pinConflict = await prisma.competition.findUnique({
                where: { adminPinDigest },
                select: { id: true },
            })
            if (pinConflict && pinConflict.id !== existing.id) {
                return Response.json({ error: "Another competition already uses this admin PIN." }, { status: 409 })
            }
        }

        const nextSlug = slugify(String(body.slug ?? existing.slug))
        if (!nextSlug) return Response.json({ error: "Slug is required." }, { status: 400 })
        const duplicate = await prisma.competition.findUnique({ where: { slug: nextSlug }, select: { id: true } })
        if (duplicate && duplicate.id !== existing.id) {
            return Response.json({ error: "Another competition already uses this slug." }, { status: 409 })
        }

        const rawConfig = body.config ?? existing.config
        const cashPrizeError = validateCashPrizeConfiguration(rawConfig)
        if (cashPrizeError) return Response.json({ error: cashPrizeError }, { status: 400 })
        const paraEntryError = validateParaEntryConfiguration(rawConfig)
        if (paraEntryError) return Response.json({ error: paraEntryError }, { status: 400 })
        const requiredDocumentsError = validateRequiredDocuments(rawConfig)
        if (requiredDocumentsError) return Response.json({ error: requiredDocumentsError }, { status: 400 })
        const config = normalizeCompetitionConfig(rawConfig)
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
                ...(adminPinDigest ? { adminPinDigest } : {}),
                config: {
                    ...config,
                    competitionYear,
                },
            },
        })

        return Response.json({
            competition: {
                ...serializeCompetition(competition),
                hasAdminPin: Boolean(competition.adminPinDigest),
            },
        })
    } catch (error) {
        if (isAdminPinConflict(error)) {
            return Response.json({ error: "Another competition already uses this admin PIN." }, { status: 409 })
        }
        console.error("Unable to update competition", error)
        return Response.json({ error: "Unable to update competition." }, { status: 500 })
    }
}

import { NextRequest } from "next/server"
import {
    adminUnauthorized,
    createCompetitionAdminPinDigest,
    isAdminRequest,
    validateCompetitionAdminPin,
} from "@/lib/admin"
import { parseCompetitionDate } from "@/lib/competition"
import { cloneDefaultConfigForYear, serializeCompetition } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"

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

export async function GET(request: NextRequest) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    const competitions = await prisma.competition.findMany({
        orderBy: [
            { startDate: "desc" },
            { createdAt: "desc" },
        ],
        include: { _count: { select: { registrations: true } } },
    })

    return Response.json({
        competitions: competitions.map((competition) => ({
            ...serializeCompetition(competition),
            registrations: competition._count.registrations,
            hasAdminPin: Boolean(competition.adminPinDigest),
        })),
    })
}

export async function POST(request: NextRequest) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const body = await request.json() as Record<string, unknown>
        const title = String(body.title ?? "").trim() || "New Salvo Competition"
        const shortTitle = String(body.shortTitle ?? "").trim() || title
        const adminPin = typeof body.adminPin === "string" ? body.adminPin.trim() : ""
        const adminPinError = validateCompetitionAdminPin(adminPin)
        if (adminPinError) return Response.json({ error: adminPinError }, { status: 400 })

        let adminPinDigest: string
        try {
            adminPinDigest = createCompetitionAdminPinDigest(adminPin)
        } catch {
            return Response.json({ error: "Competition PIN protection is not configured." }, { status: 500 })
        }

        const pinConflict = await prisma.competition.findUnique({
            where: { adminPinDigest },
            select: { id: true },
        })
        if (pinConflict) {
            return Response.json({ error: "Another competition already uses this admin PIN." }, { status: 409 })
        }

        const baseSlug = slugify(String(body.slug ?? "").trim() || title)
        if (!baseSlug) return Response.json({ error: "Enter a valid competition title or slug." }, { status: 400 })

        let slug = baseSlug
        let suffix = 2
        while (await prisma.competition.findUnique({ where: { slug }, select: { id: true } })) {
            slug = `${baseSlug}-${suffix}`
            suffix += 1
        }

        const startDate = parseCompetitionDate(String(body.startDate ?? ""))
        const endDate = parseCompetitionDate(String(body.endDate ?? ""))
        if (!startDate || !endDate) {
            return Response.json({ error: "Enter valid start and end dates." }, { status: 400 })
        }
        if (endDate.getTime() < startDate.getTime()) {
            return Response.json({ error: "The end date cannot be before the start date." }, { status: 400 })
        }

        const requestedYear = Number(body.competitionYear)
        const competitionYear = Number.isInteger(requestedYear) && requestedYear >= 1900 && requestedYear <= 2200
            ? requestedYear
            : startDate.getUTCFullYear()
        const isPublished = readBoolean(body.isPublished)
        const registrationOpen = isPublished && readBoolean(body.registrationOpen)

        const competition = await prisma.competition.create({
            data: {
                slug,
                title,
                shortTitle,
                description: String(body.description ?? "").trim() || null,
                venue: String(body.venue ?? "").trim() || "Salvo Shooters Arena, Sector 86, Mohali",
                startDate,
                endDate,
                competitionYear,
                status: registrationOpen ? "open" : "draft",
                isPublished,
                registrationOpen,
                resultsPublished: false,
                paymentQrPath: String(body.paymentQrPath ?? "").trim() || "/upi-scanner.png",
                heroImagePath: String(body.heroImagePath ?? "").trim() || "/competition-range.JPG",
                adminPinDigest,
                config: cloneDefaultConfigForYear(competitionYear, startDate, endDate),
            },
        })

        return Response.json({
            competition: {
                ...serializeCompetition(competition),
                registrations: 0,
                hasAdminPin: true,
            },
        }, { status: 201 })
    } catch (error) {
        if (isAdminPinConflict(error)) {
            return Response.json({ error: "Another competition already uses this admin PIN." }, { status: 409 })
        }
        console.error("Unable to create competition", error)
        return Response.json({ error: "Unable to create competition." }, { status: 500 })
    }
}

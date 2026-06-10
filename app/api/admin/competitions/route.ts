import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { cloneDefaultConfigForYear, serializeCompetition } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"

function slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

function readDate(value: unknown, fallback: Date) {
    const date = new Date(String(value ?? ""))
    return Number.isNaN(date.getTime()) ? fallback : date
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
        })),
    })
}

export async function POST(request: NextRequest) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const body = await request.json() as Record<string, unknown>
        const title = String(body.title ?? "").trim() || "New Salvo Competition"
        const shortTitle = String(body.shortTitle ?? "").trim() || title
        const baseSlug = slugify(String(body.slug ?? "").trim() || title)
        if (!baseSlug) return Response.json({ error: "Enter a valid competition title or slug." }, { status: 400 })

        let slug = baseSlug
        let suffix = 2
        while (await prisma.competition.findUnique({ where: { slug }, select: { id: true } })) {
            slug = `${baseSlug}-${suffix}`
            suffix += 1
        }

        const now = new Date()
        const startDate = readDate(body.startDate, now)
        const endDate = readDate(body.endDate, startDate)
        const competitionYear = Number.isInteger(Number(body.competitionYear)) ? Number(body.competitionYear) : startDate.getFullYear()

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
                status: "draft",
                isPublished: false,
                registrationOpen: false,
                resultsPublished: false,
                paymentQrPath: String(body.paymentQrPath ?? "").trim() || "/upi-scanner.png",
                heroImagePath: String(body.heroImagePath ?? "").trim() || "/competition-range.JPG",
                config: cloneDefaultConfigForYear(competitionYear),
            },
        })

        return Response.json({ competition: serializeCompetition(competition) }, { status: 201 })
    } catch (error) {
        console.error("Unable to create competition", error)
        return Response.json({ error: "Unable to create competition." }, { status: 500 })
    }
}

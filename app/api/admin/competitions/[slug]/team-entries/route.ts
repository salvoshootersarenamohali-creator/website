import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { normalizeCompetitionConfig } from "@/lib/competition"
import { getCompetitionBySlugOrActive } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"
import {
    IncomingTeamEntryMember,
    TeamEntryValidationError,
    normalizeTeamEntryData,
    resolveTeamEntry,
} from "@/lib/team-entries"

type RouteContext = {
    params: Promise<{ slug: string }>
}

const teamEntryInclude = {
    members: {
        orderBy: { createdAt: "asc" as const },
        include: {
            registration: true,
            registrationEntry: true,
        },
    },
}

export async function GET(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { slug } = await context.params
        const competition = await getCompetitionBySlugOrActive(slug)
        if (!competition) return Response.json({ error: "Competition not found." }, { status: 404 })

        const teamEntries = await prisma.teamEntry.findMany({
            where: { competitionId: competition.id },
            orderBy: { createdAt: "desc" },
            include: teamEntryInclude,
        })

        return Response.json({ teamEntries })
    } catch (error) {
        console.error("Unable to load team entries", error)
        return Response.json({ error: "Unable to load team entries." }, { status: 500 })
    }
}

export async function POST(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { slug } = await context.params
        const competition = await getCompetitionBySlugOrActive(slug)
        if (!competition) return Response.json({ error: "Competition not found." }, { status: 404 })
        const config = normalizeCompetitionConfig(competition.config)
        if (!config.teamEntriesEnabled) {
            return Response.json({ error: "Team entries are disabled for this competition." }, { status: 400 })
        }

        const body = await request.json()
        const data = normalizeTeamEntryData({
            name: body.name,
            discipline: body.discipline,
            paymentMode: body.paymentMode,
            paymentStatus: body.paymentStatus,
            members: body.members as IncomingTeamEntryMember[],
        })
        const memberRegistrationIds = data.members.map((member) => String(member.registrationId ?? "").trim()).filter(Boolean)

        const registrations = await prisma.registration.findMany({
            where: {
                competitionId: competition.id,
                id: { in: memberRegistrationIds },
            },
            include: { entries: { orderBy: { createdAt: "asc" } } },
        })
        const resolved = resolveTeamEntry(data, competition.id, registrations)

        const teamEntry = await prisma.teamEntry.create({
            data: {
                competitionId: competition.id,
                name: resolved.name,
                academy: resolved.academy,
                discipline: resolved.discipline,
                amount: resolved.amount,
                paymentMode: resolved.paymentMode,
                paymentStatus: resolved.paymentStatus,
                members: {
                    create: resolved.members.map((member) => ({
                        registrationId: member.registration.id,
                        registrationEntryId: member.entry.id,
                    })),
                },
            },
            include: teamEntryInclude,
        })

        return Response.json({ teamEntry })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create team entry."
        return Response.json({ error: message }, { status: error instanceof TeamEntryValidationError ? 400 : 500 })
    }
}

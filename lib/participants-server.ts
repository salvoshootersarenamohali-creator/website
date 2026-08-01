import { Prisma } from "@prisma/client"
import { buildParticipantDirectory } from "@/lib/participants"
import { prisma } from "@/lib/prisma"

export const participantRegistrationSelect = {
    id: true,
    name: true,
    academy: true,
    entries: {
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            eventId: true,
            eventTitle: true,
            ruleSet: true,
            categoryCode: true,
            categoryLabel: true,
            seriesScores: true,
            innerTenCount: true,
            totalScore: true,
            isPara: true,
        },
    },
} satisfies Prisma.RegistrationSelect

export async function loadParticipantDirectory(competitionId: string, competitionSlug: string) {
    const registrations = await prisma.registration.findMany({
        where: { competitionId },
        orderBy: { createdAt: "asc" },
        select: participantRegistrationSelect,
    })

    return buildParticipantDirectory(registrations, competitionSlug)
}

import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { hasCompetitionEnded } from "@/lib/competition"
import { participantRegistrationSelect } from "@/lib/participants-server"
import { buildParticipantDirectory } from "@/lib/participants"
import { prisma } from "@/lib/prisma"
import {
    buildWhatsAppResultsPreview,
    formatWhatsAppResults,
    getWhatsAppResultsConfig,
    maskWhatsAppPhone,
    normalizeWhatsAppPhone,
    sendWhatsAppResultsTemplate,
} from "@/lib/whatsapp-results"

type RouteContext = {
    params: Promise<{ slug: string }>
}

export const dynamic = "force-dynamic"

async function loadBroadcastContext(slug: string) {
    const competition = await prisma.competition.findUnique({ where: { slug } })
    if (!competition) return null

    const registrations = await prisma.registration.findMany({
        where: { competitionId: competition.id },
        orderBy: { createdAt: "asc" },
        select: { ...participantRegistrationSelect, phone: true },
    })
    const directory = buildParticipantDirectory(registrations, competition.slug)
    const registrationById = new Map(registrations.map((registration) => [registration.id, registration]))
    return { competition, directory, registrationById }
}

function getPublicOrigin(request: NextRequest) {
    const configured = process.env.PUBLIC_SITE_URL?.trim()
    if (configured) return new URL(configured).origin
    return request.nextUrl.origin
}

function getSendBlockReason(context: NonNullable<Awaited<ReturnType<typeof loadBroadcastContext>>>) {
    if (!context.competition.isPublished) return "Publish the competition before sending result messages."
    if (!context.competition.resultsPublished) return "Publish the competition results before sending messages."
    if (!hasCompetitionEnded(context.competition.endDate)) return "Result messages become available after the competition ends, when certificate downloads unlock."
    if (!context.directory.participants.length) return "No participants have complete scores yet."
    return ""
}

function buildRecipient(
    request: NextRequest,
    context: NonNullable<Awaited<ReturnType<typeof loadBroadcastContext>>>,
    registrationId: string,
) {
    const participant = context.directory.participants.find((item) => item.registrationId === registrationId)
    if (!participant) return null
    const registration = context.registrationById.get(registrationId)
    if (!registration) return null

    const certificateUrl = new URL(participant.certificateUrl, getPublicOrigin(request)).toString()
    const resultsText = formatWhatsAppResults(participant.entries)
    return {
        registrationId,
        participantName: participant.shooterName,
        phone: registration.phone,
        maskedPhone: maskWhatsAppPhone(registration.phone),
        validPhone: Boolean(normalizeWhatsAppPhone(registration.phone)),
        results: participant.entries.map((entry) => ({
            categoryCode: entry.categoryCode,
            categoryLabel: entry.categoryLabel,
            score: entry.displayScore,
            rank: entry.positionLabel,
        })),
        resultsText,
        certificateUrl,
        messagePreview: buildWhatsAppResultsPreview({
            participantName: participant.shooterName,
            competitionTitle: context.competition.title,
            resultsText,
            certificateUrl,
        }),
    }
}

export async function GET(request: NextRequest, routeContext: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { slug } = await routeContext.params
        const context = await loadBroadcastContext(slug)
        if (!context) return Response.json({ error: "Competition not found." }, { status: 404 })

        const recipients = context.directory.participants
            .map((participant) => buildRecipient(request, context, participant.registrationId))
            .filter((recipient): recipient is NonNullable<typeof recipient> => Boolean(recipient))
        const whatsapp = getWhatsAppResultsConfig()
        const sendBlockReason = getSendBlockReason(context)

        return Response.json({
            configured: whatsapp.configured,
            missingConfiguration: whatsapp.missing,
            templateName: whatsapp.values.templateName,
            templateLanguage: whatsapp.values.templateLanguage,
            canSend: whatsapp.configured && !sendBlockReason,
            sendBlockReason: whatsapp.configured ? sendBlockReason : "Configure the WhatsApp Cloud API environment variables before sending.",
            competition: {
                title: context.competition.title,
                slug: context.competition.slug,
                resultsPublished: context.competition.resultsPublished,
                ended: hasCompetitionEnded(context.competition.endDate),
            },
            summary: {
                scoredParticipants: recipients.length,
                readyToSend: recipients.filter((recipient) => recipient.validPhone).length,
                invalidPhones: recipients.filter((recipient) => !recipient.validPhone).length,
            },
            recipients: recipients.map((recipient) => ({
                registrationId: recipient.registrationId,
                participantName: recipient.participantName,
                maskedPhone: recipient.maskedPhone,
                validPhone: recipient.validPhone,
                results: recipient.results,
                certificateUrl: recipient.certificateUrl,
                messagePreview: recipient.messagePreview,
            })),
        })
    } catch (error) {
        console.error("Unable to prepare WhatsApp result messages", error)
        return Response.json({ error: "Unable to prepare WhatsApp result messages." }, { status: 500 })
    }
}

export async function POST(request: NextRequest, routeContext: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { slug } = await routeContext.params
        const body = await request.json().catch(() => ({})) as { registrationId?: unknown }
        const registrationId = typeof body.registrationId === "string" ? body.registrationId : ""
        if (!registrationId) return Response.json({ error: "Choose a participant to message." }, { status: 400 })

        const context = await loadBroadcastContext(slug)
        if (!context) return Response.json({ error: "Competition not found." }, { status: 404 })
        const sendBlockReason = getSendBlockReason(context)
        if (sendBlockReason) return Response.json({ error: sendBlockReason }, { status: 409 })

        const recipient = buildRecipient(request, context, registrationId)
        if (!recipient) return Response.json({ error: "This participant does not have a completed result." }, { status: 404 })
        if (!recipient.validPhone) return Response.json({ error: "This participant's phone number is invalid." }, { status: 422 })

        const messageId = await sendWhatsAppResultsTemplate({
            phone: recipient.phone,
            participantName: recipient.participantName,
            competitionTitle: context.competition.title,
            resultsText: recipient.resultsText,
            certificateUrl: recipient.certificateUrl,
        })
        return Response.json({ ok: true, registrationId, messageId })
    } catch (error) {
        console.error("Unable to send WhatsApp result message", error)
        return Response.json({ error: error instanceof Error ? error.message : "Unable to send the WhatsApp result message." }, { status: 502 })
    }
}

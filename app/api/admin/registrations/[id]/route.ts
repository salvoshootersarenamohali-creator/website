import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { normalizeCompetitionConfig } from "@/lib/competition"
import { getCompetitionBySlugOrActive, getCompetitionSlugFromRequest } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"
import {
    RegistrationValidationError,
    getErrorMessage,
    getResolvedRegistrationAmount,
    normalizeRegistrationData,
    resolveRegistrationEntries,
} from "@/lib/registration-validation"

type RouteContext = {
    params: Promise<{ id: string }>
}

const paymentStatuses = new Set(["Pending", "Paid", "Sponsored"])

function entryKey(entry: { eventId: string; categoryCode: string }) {
    return `${entry.eventId}:${entry.categoryCode}`
}

function hasScores(entry: { shotScores: unknown; seriesScores: unknown; totalScore: number | null }) {
    return Array.isArray(entry.shotScores) || Array.isArray(entry.seriesScores) || entry.totalScore !== null
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { id } = await context.params
        const slug = getCompetitionSlugFromRequest(request)
        const competition = await getCompetitionBySlugOrActive(slug)
        if (!competition) return Response.json({ error: "Competition not found." }, { status: 404 })
        const config = normalizeCompetitionConfig(competition.config)
        const body = await request.json()
        const paymentStatus = String(body.paymentStatus ?? "").trim()
        const allowScoredEntryRemoval = body.allowScoredEntryRemoval === true

        if (!paymentStatuses.has(paymentStatus)) {
            return Response.json({ error: "Payment status must be Pending, Paid, or Sponsored." }, { status: 400 })
        }

        const data = normalizeRegistrationData({
            name: body.name,
            academy: body.academy,
            motherName: body.motherName,
            fatherName: body.fatherName,
            gender: body.gender,
            dateOfBirth: body.dateOfBirth,
            phone: body.phone,
            address: body.address,
            preferredDate: body.preferredDate,
            preferredSlot: body.preferredSlot,
            paymentMode: body.paymentMode,
            utrNumber: body.utrNumber,
            entries: body.entries,
        })

        const resolvedEntries = resolveRegistrationEntries(data, { ...config, allowedPaymentModes: ["cash", "upi"] })
        if (paymentStatus === "Paid" && data.paymentMode === "upi" && !/^\d{12}$/.test(data.utrNumber)) {
            return Response.json({ error: "Online paid registrations require a 12-digit UTR number." }, { status: 400 })
        }
        if (paymentStatus === "Sponsored" && data.paymentMode === "upi") {
            return Response.json({ error: "Sponsored registrations must use cash payment mode." }, { status: 400 })
        }

        const existing = await prisma.registration.findUnique({
            where: { id },
            include: { entries: true },
        })
        if (!existing) return Response.json({ error: "Registration not found." }, { status: 404 })
        if (existing.competitionId !== competition.id) return Response.json({ error: "Registration not found for this competition." }, { status: 404 })

        const nextKeys = new Set(resolvedEntries.map(entryKey))
        const removedEntries = existing.entries.filter((entry) => !nextKeys.has(entryKey(entry)))
        const removedScoredEntries = removedEntries.filter(hasScores)
        if (removedScoredEntries.length && !allowScoredEntryRemoval) {
            return Response.json({
                error: "This edit removes entries that already have scores. Confirm scored entry removal and try again.",
                scoredEntryRemovalRequired: true,
                scoredEntries: removedScoredEntries.map((entry) => ({
                    id: entry.id,
                    categoryCode: entry.categoryCode,
                    categoryLabel: entry.categoryLabel,
                })),
            }, { status: 409 })
        }

        const existingByKey = new Map(existing.entries.map((entry) => [entryKey(entry), entry]))
        const amount = getResolvedRegistrationAmount(resolvedEntries)
        const confirmedAt = existing.paymentStatus === paymentStatus ? existing.paymentConfirmedAt : paymentStatus === "Pending" ? null : new Date()
        const confirmedBy = existing.paymentStatus === paymentStatus ? existing.paymentConfirmedBy : paymentStatus === "Pending" ? null : existing.paymentConfirmedBy

        const registration = await prisma.$transaction(async (tx) => {
            if (removedEntries.length) {
                await tx.registrationEntry.deleteMany({
                    where: { id: { in: removedEntries.map((entry) => entry.id) } },
                })
            }

            await Promise.all(resolvedEntries.map((entry) => {
                const existingEntry = existingByKey.get(entryKey(entry))
                if (!existingEntry) {
                    return tx.registrationEntry.create({
                        data: {
                            registrationId: id,
                            eventId: entry.eventId,
                            eventTitle: entry.eventTitle,
                            discipline: entry.discipline,
                            ruleSet: entry.ruleSet,
                            categoryCode: entry.categoryCode,
                            categoryLabel: entry.categoryLabel,
                            fee: entry.fee,
                        },
                    })
                }

                return tx.registrationEntry.update({
                    where: { id: existingEntry.id },
                    data: {
                        eventTitle: entry.eventTitle,
                        discipline: entry.discipline,
                        ruleSet: entry.ruleSet,
                        categoryLabel: entry.categoryLabel,
                        fee: entry.fee,
                    },
                })
            }))

            return tx.registration.update({
                where: { id },
                data: {
                    name: data.name,
                    academy: data.academy,
                    motherName: data.motherName || null,
                    fatherName: data.fatherName || null,
                    gender: data.gender,
                    dateOfBirth: new Date(`${data.dateOfBirth}T00:00:00`),
                    phone: data.phone,
                    address: data.address || null,
                    preferredDate: new Date(`${data.preferredDate}T00:00:00`),
                    preferredSlot: data.preferredSlot,
                    paymentMode: data.paymentMode,
                    paymentStatus,
                    paymentConfirmedBy: confirmedBy,
                    paymentConfirmedAt: confirmedAt,
                    amount,
                    utrNumber: paymentStatus === "Paid" && data.paymentMode === "upi" ? data.utrNumber : null,
                },
                include: { entries: { orderBy: { createdAt: "asc" } } },
            })
        })

        return Response.json({ registration })
    } catch (error) {
        console.error("Unable to update registration", error)
        const message = getErrorMessage(error, "Unable to update registration.")
        return Response.json({ error: message }, { status: error instanceof RegistrationValidationError ? 400 : 500 })
    }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { id } = await context.params
        const registration = await prisma.registration.findUnique({
            where: { id },
            select: {
                id: true,
                competitionId: true,
                name: true,
                entries: {
                    select: { id: true },
                },
            },
        })

        if (!registration) return Response.json({ error: "Registration not found." }, { status: 404 })
        const slug = getCompetitionSlugFromRequest(request)
        const competition = await getCompetitionBySlugOrActive(slug)
        if (!competition || registration.competitionId !== competition.id) return Response.json({ error: "Registration not found for this competition." }, { status: 404 })

        await prisma.registration.delete({ where: { id } })

        return Response.json({
            deletedRegistrationId: registration.id,
            deletedEntryIds: registration.entries.map((entry) => entry.id),
            deletedName: registration.name,
        })
    } catch (error) {
        console.error("Unable to delete registration", error)
        return Response.json({ error: "Unable to delete registration. Check the database connection and try again." }, { status: 500 })
    }
}

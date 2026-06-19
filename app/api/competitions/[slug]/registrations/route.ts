import { NextRequest } from "next/server"
import { ImageUploadError, uploadImageToCloudinary } from "@/lib/cloudinary-upload"
import { prisma } from "@/lib/prisma"
import {
    IncomingRegistrationEntry,
    RegistrationValidationError,
    assertPublicPayment,
    getErrorMessage,
    getResolvedRegistrationAmount,
    normalizeRegistrationData,
    resolveRegistrationEntries,
} from "@/lib/registration-validation"
import { normalizeCompetitionConfig } from "@/lib/competition"

type RouteContext = {
    params: Promise<{ slug: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { slug } = await context.params
        const competition = await prisma.competition.findUnique({ where: { slug } })
        if (!competition || !competition.isPublished) {
            return Response.json({ error: "Competition not found." }, { status: 404 })
        }
        if (!competition.registrationOpen) {
            return Response.json({ error: "Registration is not open for this competition." }, { status: 403 })
        }

        const config = normalizeCompetitionConfig(competition.config)
        const formData = await request.formData()
        const data = normalizeRegistrationData({
            name: String(formData.get("name") ?? ""),
            academy: String(formData.get("academy") ?? ""),
            gender: String(formData.get("gender") ?? ""),
            dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
            phone: String(formData.get("phone") ?? ""),
            preferredDate: String(formData.get("preferredDate") ?? ""),
            preferredSlot: String(formData.get("preferredSlot") ?? ""),
            paymentMode: String(formData.get("paymentMode") ?? ""),
            utrNumber: String(formData.get("utrNumber") ?? ""),
            entries: JSON.parse(String(formData.get("entries") ?? "[]")) as IncomingRegistrationEntry[],
        })
        const studentPhoto = formData.get("studentPhoto")
        const screenshot = formData.get("paymentScreenshot")

        if (!(studentPhoto instanceof File) || studentPhoto.size <= 0) {
            return Response.json({ error: "Please upload the shooter photo." }, { status: 400 })
        }
        assertPublicPayment(data)
        const resolvedEntries = resolveRegistrationEntries(data, config)

        const studentPhotoFile = await uploadImageToCloudinary(studentPhoto, {
            folder: `salvo/${competition.slug}/student-photos`,
            label: "Student photo",
        })
        const screenshotFile = screenshot instanceof File && screenshot.size > 0
            ? await uploadImageToCloudinary(screenshot, {
                folder: `salvo/${competition.slug}/payment-screenshots`,
                label: "Payment screenshot",
            })
            : null
        const amount = getResolvedRegistrationAmount(resolvedEntries)

        const registration = await prisma.registration.create({
            data: {
                competitionId: competition.id,
                name: data.name,
                academy: data.academy,
                gender: data.gender,
                dateOfBirth: new Date(`${data.dateOfBirth}T00:00:00`),
                phone: data.phone,
                preferredDate: new Date(`${data.preferredDate}T00:00:00`),
                preferredSlot: data.preferredSlot,
                paymentMode: data.paymentMode,
                paymentStatus: data.paymentMode === "upi" ? "Paid" : "Pending",
                amount,
                utrNumber: data.paymentMode === "upi" ? data.utrNumber : null,
                screenshotPath: screenshotFile,
                studentPhotoPath: studentPhotoFile,
                entries: {
                    create: resolvedEntries.map((entry) => ({
                        eventId: entry.eventId,
                        eventTitle: entry.eventTitle,
                        discipline: entry.discipline,
                        ruleSet: entry.ruleSet,
                        categoryCode: entry.categoryCode,
                        categoryLabel: entry.categoryLabel,
                        fee: entry.fee,
                    })),
                },
            },
            include: { entries: true },
        })

        return Response.json({ registration })
    } catch (error) {
        const message = getErrorMessage(error, "Unable to save registration.")
        const status = error instanceof RegistrationValidationError ? 400 : error instanceof ImageUploadError ? error.status : 500
        return Response.json({ error: message }, { status })
    }
}

import { v2 as cloudinary, type UploadApiResponse } from "cloudinary"
import { NextRequest } from "next/server"
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

async function saveScreenshot(file: File, slug: string) {
    if (!file.size) return null
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"])
    if (!allowedTypes.has(file.type)) {
        throw new Error("Payment screenshot must be a PNG, JPG, or WEBP image.")
    }
    if (file.size > 5 * 1024 * 1024) {
        throw new Error("Payment screenshot must be smaller than 5MB.")
    }
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error("Cloudinary is not configured for payment screenshot uploads.")
    }

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    })

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: `salvo/${slug}/payment-screenshots`,
                resource_type: "image",
                public_id: `${Date.now()}-${crypto.randomUUID()}`,
                overwrite: false,
            },
            (error, result) => {
                if (error || !result) reject(error ?? new Error("Unable to upload payment screenshot."))
                else resolve(result)
            }
        )
        stream.end(buffer)
    })

    return uploadResult.secure_url
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
        const screenshot = formData.get("paymentScreenshot")

        assertPublicPayment(data)
        const resolvedEntries = resolveRegistrationEntries(data, config)

        const screenshotFile = screenshot instanceof File && screenshot.size > 0 ? await saveScreenshot(screenshot, competition.slug) : null
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
        return Response.json({ error: message }, { status: error instanceof RegistrationValidationError ? 400 : 500 })
    }
}

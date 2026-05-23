import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextRequest } from "next/server"
import { ENTRY_FEE, getAgeFromDobYear, getEligibleCategories, getEventById } from "@/lib/competition"
import { prisma } from "@/lib/prisma"

type IncomingEntry = {
    eventId: string
    categoryCode: string
}

function cleanPhone(phone: string) {
    return phone.replace(/[^\d+]/g, "")
}

function isValidDate(value: string) {
    return !Number.isNaN(new Date(value).getTime())
}

async function saveScreenshot(file: File) {
    if (!file.size) return null
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"])
    if (!allowedTypes.has(file.type)) {
        throw new Error("Payment screenshot must be a PNG, JPG, or WEBP image.")
    }

    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`
    const relativePath = `/uploads/payments/${fileName}`
    const uploadDir = path.join(process.cwd(), "public", "uploads", "payments")
    await mkdir(uploadDir, { recursive: true })
    await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()))
    return relativePath
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const name = String(formData.get("name") ?? "").trim()
        const academy = String(formData.get("academy") ?? "").trim()
        const gender = String(formData.get("gender") ?? "").trim()
        const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim()
        const phone = cleanPhone(String(formData.get("phone") ?? "").trim())
        const preferredDate = String(formData.get("preferredDate") ?? "").trim()
        const preferredSlot = String(formData.get("preferredSlot") ?? "").trim()
        const paymentMode = String(formData.get("paymentMode") ?? "").trim()
        const utrNumber = String(formData.get("utrNumber") ?? "").trim()
        const entries = JSON.parse(String(formData.get("entries") ?? "[]")) as IncomingEntry[]
        const screenshot = formData.get("paymentScreenshot")

        if (!name || !academy || !gender || !dateOfBirth || !phone || !preferredDate || !preferredSlot || !paymentMode) {
            return Response.json({ error: "Please complete all required fields." }, { status: 400 })
        }
        if (gender !== "male" && gender !== "female") {
            return Response.json({ error: "Please select a valid gender." }, { status: 400 })
        }
        if (!isValidDate(dateOfBirth) || !isValidDate(preferredDate)) {
            return Response.json({ error: "Please enter valid dates." }, { status: 400 })
        }
        if (paymentMode !== "cash" && paymentMode !== "upi") {
            return Response.json({ error: "Please select a valid payment mode." }, { status: 400 })
        }
        if (paymentMode === "upi" && !/^\d{12}$/.test(utrNumber)) {
            return Response.json({ error: "UPI payments require a 12-digit UTR/UPI reference number." }, { status: 400 })
        }
        if (!entries.length) {
            return Response.json({ error: "Please select at least one event category." }, { status: 400 })
        }

        const age = getAgeFromDobYear(dateOfBirth)
        if (age === null) {
            return Response.json({ error: "Date of birth is invalid." }, { status: 400 })
        }

        const resolvedEntries = entries.map((entry) => {
            const event = getEventById(entry.eventId)
            if (!event) throw new Error("Selected event is invalid.")
            const category = getEligibleCategories(event, age, gender).find((item) => item.code === entry.categoryCode)
            if (!category) throw new Error("One or more selected categories are not eligible for this shooter.")
            return { event, category }
        })

        const disciplines = new Set(resolvedEntries.map(({ event }) => event.discipline))
        if (disciplines.size > 1) {
            return Response.json({ error: "Choose either pistol or rifle categories, not both." }, { status: 400 })
        }

        const hasNr = resolvedEntries.some(({ event }) => event.ruleSet === "NR")
        const hasIssf = resolvedEntries.some(({ event }) => event.ruleSet === "ISSF")
        if (hasNr && hasIssf) {
            const discipline = resolvedEntries[0]?.event.discipline
            const validPair = resolvedEntries.every(({ event }) => event.discipline === discipline)
            if (!validPair) return Response.json({ error: "NR and ISSF entries must use the same discipline." }, { status: 400 })
        }

        const screenshotFile = screenshot instanceof File && screenshot.size > 0 ? await saveScreenshot(screenshot) : null
        const amount = resolvedEntries.length * ENTRY_FEE

        const registration = await prisma.registration.create({
            data: {
                name,
                academy,
                gender,
                dateOfBirth: new Date(`${dateOfBirth}T00:00:00`),
                phone,
                preferredDate: new Date(`${preferredDate}T00:00:00`),
                preferredSlot,
                paymentMode,
                paymentStatus: paymentMode === "upi" ? "Paid" : "Pending",
                amount,
                utrNumber: paymentMode === "upi" ? utrNumber : null,
                screenshotPath: screenshotFile,
                entries: {
                    create: resolvedEntries.map(({ event, category }) => ({
                        eventId: event.id,
                        eventTitle: event.title,
                        discipline: event.discipline,
                        ruleSet: event.ruleSet,
                        categoryCode: category.code,
                        categoryLabel: category.label,
                        fee: ENTRY_FEE,
                    })),
                },
            },
            include: { entries: true },
        })

        return Response.json({ registration })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save registration."
        return Response.json({ error: message }, { status: 500 })
    }
}

import { NextRequest } from "next/server"
import { ImageUploadError, uploadImageToCloudinary } from "@/lib/cloudinary-upload"
import { getCompetitionBySlugOrActive } from "@/lib/competition-server"
import { isCompetitionRegistrationAvailable, isOnlinePaymentMode, normalizeCompetitionConfig } from "@/lib/competition"
import { readRequiredDocumentFiles, uploadRequiredDocuments } from "@/lib/registration-documents"
import { RegistrationValidationError, assertPublicPayment, getErrorMessage, getResolvedRegistrationAmount, normalizeRegistrationData, resolveRegistrationEntries } from "@/lib/registration-validation"
import { RelayCapacityError, resolveRelaySelection } from "@/lib/relay-booking"
import { reserveRelay, serializableTransaction } from "@/lib/relay-booking-server"
import { prisma } from "@/lib/prisma"

const registrationInclude = { entries: true, relayBooking: true, documents: { orderBy: { position: "asc" as const } } }

export async function submitRegistration(request: NextRequest, slug: string | null, batchMode = false) {
    try {
        const competition = await getCompetitionBySlugOrActive(slug)
        if (!competition || !competition.isPublished) return Response.json({ error: "Competition not found." }, { status: 404 })
        if (!isCompetitionRegistrationAvailable(competition)) return Response.json({ error: "Registration is not open for this competition." }, { status: 403 })
        const config = normalizeCompetitionConfig(competition.config)
        if (batchMode && !config.coachBatchEnabled) return Response.json({ error: "Coach batch registration is not enabled." }, { status: 403 })
        const form = await request.formData()
        const shared = Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string")) as Record<string, string>
        const submissionKey = String(form.get("submissionKey") ?? "")
        if (batchMode && !/^[a-zA-Z0-9-]{16,80}$/.test(submissionKey)) throw new RegistrationValidationError("A valid submission key is required.")
        if (batchMode) {
            const existing = await prisma.registrationBatch.findUnique({ where: { submissionKey }, include: { registrations: { include: registrationInclude } } })
            if (existing && existing.competitionId === competition.id) return Response.json({ batch: existing, registrations: existing.registrations })
        }
        const parsed: unknown = JSON.parse(String(form.get(batchMode ? "students" : "entries") ?? "[]"))
        if (!Array.isArray(parsed)) throw new RegistrationValidationError("Please submit a valid student/category list.")
        const students = batchMode ? parsed : [{ ...shared, entries: parsed }]
        if (students.length < 1 || students.length > 20) throw new RegistrationValidationError("Submit between 1 and 20 students per batch.")
        if (batchMode && (!shared.coachName?.trim() || !shared.academy?.trim())) throw new RegistrationValidationError("Enter the coach and academy names.")
        const prepared = students.map((student, index) => {
            if (!student || typeof student !== "object") throw new RegistrationValidationError(`Student ${index + 1} is invalid.`)
            const data = normalizeRegistrationData(batchMode ? { ...student, academy: shared.academy, coachName: shared.coachName, phone: shared.phone, paymentMode: shared.paymentMode, utrNumber: shared.utrNumber } : student)
            assertPublicPayment(data, config)
            const entries = resolveRegistrationEntries(data, config)
            const prefix = batchMode ? `student:${index}:` : ""
            const photo = form.get(`${prefix}studentPhoto`)
            if (!(photo instanceof File) || !photo.size) throw new RegistrationValidationError(`Please upload ${data.name || `student ${index + 1}`}'s photo.`)
            const documentForm = new FormData()
            for (const [key, value] of form.entries()) if (key.startsWith(`${prefix}requiredDocument:`)) documentForm.append(key.slice(prefix.length), value)
            const documents = readRequiredDocumentFiles(documentForm, config.requiredDocuments)
            const selection = config.relayBooking.enabled ? resolveRelaySelection(data.preferredDate, data.preferredSlot, entries, config) : null
            return { data, entries, photo, documents, selection, amount: getResolvedRegistrationAmount(entries) }
        })
        const screenshot = form.get("paymentScreenshot")
        // Reject already-full pools before uploading files; the transaction still
        // decides the lane if availability changes while uploads are in progress.
        const requested = prepared.flatMap((s) => s.selection ? [s.selection] : [])
        if (requested.length) {
            const booked = await prisma.registrationRelayBooking.findMany({ where: { competitionId: competition.id, OR: requested.map(({ date, relayId, pool }) => ({ date, relayId, pool })) }, select: { date: true, relayId: true, pool: true } })
            for (const selection of requested) {
                const matches = (s: { date: string; relayId: string; pool: string }) => s.date === selection.date && s.relayId === selection.relayId && s.pool === selection.pool
                if (booked.filter(matches).length + requested.filter(matches).length > selection.capacity) throw new RelayCapacityError()
            }
        }
        const screenshotPath = isOnlinePaymentMode(prepared[0].data.paymentMode) && screenshot instanceof File && screenshot.size
            ? await uploadImageToCloudinary(screenshot, { folder: `salvo/${competition.slug}/payment-screenshots`, label: "Payment screenshot" }) : null
        const uploaded = await Promise.all(prepared.map(async (student) => ({
            ...student,
            studentPhotoPath: await uploadImageToCloudinary(student.photo, { folder: `salvo/${competition.slug}/student-photos`, label: "Student photo" }),
            uploadedDocuments: await uploadRequiredDocuments(student.documents, competition.slug),
        })))
        const saved = await serializableTransaction(async (tx) => {
            const current = await tx.competition.findUniqueOrThrow({ where: { id: competition.id } })
            if (!isCompetitionRegistrationAvailable(current)) throw new RegistrationValidationError("Registration has closed. Please contact the organizer.")
            const currentConfig = normalizeCompetitionConfig(current.config)
            if (batchMode && !currentConfig.coachBatchEnabled) throw new RegistrationValidationError("Coach batch registration has been disabled. Refresh and submit individually.")
            if (JSON.stringify(currentConfig.requiredDocuments) !== JSON.stringify(config.requiredDocuments)) throw new RegistrationValidationError("Required documents changed. Refresh before submitting again.")
            if (batchMode) {
                const existing = await tx.registrationBatch.findUnique({ where: { submissionKey }, include: { registrations: { include: registrationInclude } } })
                if (existing && existing.competitionId === competition.id) return { batch: existing, registrations: existing.registrations }
            }
            const first = uploaded[0].data
            const batch = batchMode ? await tx.registrationBatch.create({ data: {
                competitionId: competition.id, submissionKey, academy: first.academy, coachName: first.coachName, phone: first.phone,
                paymentMode: first.paymentMode, paymentStatus: isOnlinePaymentMode(first.paymentMode) ? "Paid" : "Pending",
                utrNumber: isOnlinePaymentMode(first.paymentMode) ? first.utrNumber : null, screenshotPath,
                amount: uploaded.reduce((sum, student) => sum + student.amount, 0),
            } }) : null
            const registrations = []
            for (const student of uploaded) {
                const { data } = student
                assertPublicPayment(data, currentConfig)
                const entries = resolveRegistrationEntries(data, currentConfig)
                const amount = getResolvedRegistrationAmount(entries)
                if (amount !== student.amount) throw new RegistrationValidationError("Entry fees changed during submission. Refresh and check your payment total.")
                const selection = currentConfig.relayBooking.enabled ? resolveRelaySelection(data.preferredDate, data.preferredSlot, entries, currentConfig) : null
                const registration = await tx.registration.create({ data: {
                    competitionId: competition.id, batchId: batch?.id ?? null,
                    name: data.name, academy: data.academy, coachName: data.coachName || null,
                    motherName: data.motherName || null, fatherName: data.fatherName || null, gender: data.gender,
                    dateOfBirth: new Date(`${data.dateOfBirth}T00:00:00.000Z`), phone: data.phone, address: data.address || null,
                    preferredDate: new Date(`${data.preferredDate}T00:00:00.000Z`), preferredSlot: selection?.label ?? data.preferredSlot,
                    paymentMode: data.paymentMode, paymentStatus: isOnlinePaymentMode(data.paymentMode) ? "Paid" : "Pending", amount,
                    utrNumber: isOnlinePaymentMode(data.paymentMode) ? data.utrNumber : null, screenshotPath,
                    studentPhotoPath: student.studentPhotoPath, documents: { create: student.uploadedDocuments }, entries: { create: entries },
                } })
                if (selection) await reserveRelay(tx, competition.id, registration.id, selection)
                registrations.push(await tx.registration.findUniqueOrThrow({ where: { id: registration.id }, include: registrationInclude }))
            }
            return { batch, registrations }
        })
        return Response.json(batchMode ? saved : { registration: saved.registrations[0] }, { status: 201 })
    } catch (error) {
        const status = error instanceof RelayCapacityError ? 409 : error instanceof RegistrationValidationError || error instanceof SyntaxError ? 400 : error instanceof ImageUploadError ? error.status : 500
        return Response.json({ error: getErrorMessage(error, "Unable to save registration."), code: error instanceof RelayCapacityError ? "RELAY_FULL" : undefined }, { status })
    }
}

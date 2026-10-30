import { v2 as cloudinary, UploadApiResponse } from "cloudinary"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { configure } from "./media"
import { RangeActor, RangeError, textField } from "./shared"
import { staffOnly } from "./server"
import { trainingAccess } from "./training-core"

export function validateTrainingFile(bytes: Uint8Array, mimeType: string, purpose: string) {
    if (!bytes.length || bytes.length > 3000000) throw new RangeError("Each file must be smaller than 3 MB.")
    const starts = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte)
    const valid = mimeType === "image/jpeg" ? starts(0xff, 0xd8, 0xff)
        : mimeType === "image/png" ? starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
        : mimeType === "image/webp" ? starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
        : mimeType === "application/pdf" && purpose === "plan" ? starts(0x25, 0x50, 0x44, 0x46, 0x2d) : false
    if (!valid) throw new RangeError(purpose === "plan" ? "Upload a valid PDF, JPG, PNG or WEBP file." : "Upload a valid JPG, PNG or WEBP target image.")
}

export async function uploadTrainingFile(file: File, purpose: string, ownerId: string) {
    if (file.size > 3000000) throw new RangeError("Each file must be smaller than 3 MB.")
    const bytes = Buffer.from(await file.arrayBuffer())
    validateTrainingFile(bytes, file.type, purpose)
    configure()
    const publicId = `salvo/training/${ownerId}/${crypto.randomUUID()}`
    let result: UploadApiResponse
    try { result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ public_id: publicId, resource_type: "image", type: "authenticated", overwrite: false, allowed_formats: purpose === "plan" ? ["pdf", "jpg", "png", "webp"] : ["jpg", "png", "webp"], ...(file.type === "application/pdf" ? {} : { transformation: [{ flags: "strip_profile" }] }) }, (error, result) => error || !result ? reject(new RangeError("File upload failed. Please retry.", 503)) : resolve(result))
        stream.end(bytes)
    }) } catch (error) {
        try { await destroyTrainingFile(publicId) } catch { console.error("Unable to remove an interrupted training upload") }
        throw error
    }
    return { publicId: result.public_id, format: result.format, resourceType: result.resource_type, bytes: result.bytes }
}

export async function destroyTrainingFile(publicId: string) {
    configure()
    const result = await cloudinary.uploader.destroy(publicId, { type: "authenticated", resource_type: "image", invalidate: true })
    if (result.result !== "ok" && result.result !== "not found") throw new RangeError("File cleanup failed. Please retry.", 503)
}

export function trainingFileUrl(publicId: string, format: string) {
    configure()
    return cloudinary.utils.private_download_url(publicId, format, { resource_type: "image", type: "authenticated", expires_at: Math.floor(Date.now() / 1000) + 60, attachment: false })
}

export async function cleanupTrainingMedia() {
    const abandoned = await prisma.rangeTrainingMedia.findMany({ where: { expiresAt: { lt: new Date() }, planRevisions: { none: {} }, sessionRevisions: { none: {} } }, take: 20 })
    for (const asset of abandoned) {
        try {
            // Lock/recheck eligibility before external deletion. A concurrent save
            // that claimed the file changes expiresAt to null and wins safely.
            const claimed = await prisma.rangeTrainingMedia.updateMany({ where: { id: asset.id, expiresAt: { lt: new Date() }, planRevisions: { none: {} }, sessionRevisions: { none: {} } }, data: { expiresAt: new Date(0) } })
            if (!claimed.count) continue
            await destroyTrainingFile(asset.publicId)
            await prisma.rangeTrainingMedia.deleteMany({ where: { id: asset.id, expiresAt: new Date(0), planRevisions: { none: {} }, sessionRevisions: { none: {} } } })
        } catch { console.error("Unable to clean up an abandoned training upload") }
    }
}

export async function trainingMedia(request: NextRequest, actor: RangeActor) {
    if (request.method === "POST") {
        const form = await request.formData(), purpose = form.get("purpose"), file = form.get("file")
        if (purpose !== "plan" && purpose !== "target") throw new RangeError("Choose a file purpose.")
        if (purpose === "plan") staffOnly(actor)
        else {
            if (actor.role !== "student") throw new RangeError("Only students can upload targets.", 403)
            await trainingAccess(actor)
        }
        if (!(file instanceof File)) throw new RangeError("Choose a file.")
        await cleanupTrainingMedia()
        const stored = await uploadTrainingFile(file, purpose, actor.id)
        try {
            const asset = await prisma.rangeTrainingMedia.create({ data: { ...stored, ownerId: actor.id, purpose, name: file.name.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 150) || "Training file", mimeType: file.type, expiresAt: new Date(Date.now() + 86400000) }, select: { id: true, name: true, mimeType: true, bytes: true } })
            return Response.json({ asset })
        } catch (error) {
            try { await destroyTrainingFile(stored.publicId) } catch { console.error("Unable to clean up failed training upload") }
            throw error
        }
    }
    const id = textField(request.nextUrl.searchParams.get("id"), "File")
    const asset = await prisma.rangeTrainingMedia.findUnique({ where: { id }, include: { planRevisions: { select: { plan: { select: { profileId: true } } } }, sessionRevisions: { select: { session: { select: { profileId: true } } } } } })
    if (!asset) throw new RangeError("File not found.", 404)
    let authorized = asset.ownerId === actor.id && asset.expiresAt !== null && asset.expiresAt > new Date()
    const profiles = [...new Set([...asset.planRevisions.map(row => row.plan.profileId), ...asset.sessionRevisions.map(row => row.session.profileId)])]
    for (const profileId of profiles) {
        try { await trainingAccess(actor, profileId); authorized = true; break }
        catch (error) { if (!(error instanceof RangeError) || ![403, 404].includes(error.status)) throw error }
    }
    if (!authorized) throw new RangeError("File access denied.", 403)
    // A fresh authorization check is required every time a short-lived URL is issued.
    const url = trainingFileUrl(asset.publicId, asset.format)
    return request.nextUrl.searchParams.get("open") === "1" ? new Response(null, { status: 307, headers: { Location: url } }) : Response.json({ url })
}

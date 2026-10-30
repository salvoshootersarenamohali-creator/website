import { v2 as cloudinary, UploadApiResponse } from "cloudinary"
import { RangeError } from "./shared"

export function configure() {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) throw new RangeError("Private file storage is not configured. Contact the owner.", 503)
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true })
}
export async function uploadAttendancePhoto(file: File, locationId: string) {
    if (file.type !== "image/jpeg" || file.size < 100 || file.size > 1500000) throw new RangeError("Capture a JPEG selfie smaller than 1.5 MB.")
    const bytes = Buffer.from(await file.arrayBuffer())
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new RangeError("Invalid camera image.")
    configure()
    const publicId = `salvo/range/${locationId}/attendance/${crypto.randomUUID()}`
    await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ resource_type: "image", type: "authenticated", public_id: publicId, overwrite: false, allowed_formats: ["jpg"], transformation: [{ width: 1280, height: 1280, crop: "limit" }] }, (error, result) => error || !result ? reject(new RangeError("Photo upload failed. Your attendance has not been changed. Please retry.", 503)) : resolve(result))
        stream.end(bytes)
    })
    return publicId
}
export async function removeAttendancePhoto(publicId: string) {
    try { configure(); await cloudinary.uploader.destroy(publicId, { resource_type: "image", type: "authenticated" }) } catch { console.error("Unable to remove unused attendance photo") }
}
export function attendancePhotoUrl(publicId: string) {
    configure()
    return cloudinary.utils.private_download_url(publicId, "jpg", { resource_type: "image", type: "authenticated", expires_at: Math.floor(Date.now() / 1000) + 60, attachment: false })
}
export async function uploadReceipt(file: File, locationId: string) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3000000 || !file.size) throw new RangeError("Receipt must be a JPG, PNG or WEBP image smaller than 3 MB.")
    configure()
    const publicId = `salvo/range/${locationId}/receipts/${crypto.randomUUID()}`
    await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ resource_type: "image", type: "authenticated", public_id: publicId, overwrite: false, format: "jpg", allowed_formats: ["jpg", "png", "webp"] }, (error, result) => error || !result ? reject(new RangeError("Receipt upload failed. The entry has not been saved.", 503)) : resolve(result))
        void file.arrayBuffer().then(bytes => stream.end(Buffer.from(bytes))).catch(reject)
    })
    return publicId
}

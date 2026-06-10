import { v2 as cloudinary, type UploadApiResponse } from "cloudinary"

const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"])
const maxImageSize = 5 * 1024 * 1024

export class ImageUploadError extends Error {
    status: number

    constructor(message: string, status = 400) {
        super(message)
        this.name = "ImageUploadError"
        this.status = status
    }
}

export async function uploadImageToCloudinary(file: File, options: { folder: string; publicId?: string; label?: string }) {
    const label = options.label ?? "Image"
    if (!file.size) return null
    if (!allowedImageTypes.has(file.type)) {
        throw new ImageUploadError(`${label} must be a PNG, JPG, or WEBP image.`)
    }
    if (file.size > maxImageSize) {
        throw new ImageUploadError(`${label} must be smaller than 5MB.`)
    }
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new ImageUploadError("Cloudinary is not configured for image uploads.", 500)
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
                folder: options.folder,
                resource_type: "image",
                public_id: options.publicId ?? `${Date.now()}-${crypto.randomUUID()}`,
                overwrite: false,
            },
            (error, result) => {
                if (error || !result) reject(error ?? new Error("Unable to upload image."))
                else resolve(result)
            }
        )
        stream.end(buffer)
    })

    return uploadResult.secure_url
}

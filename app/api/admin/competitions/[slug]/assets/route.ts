import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { ImageUploadError, uploadImageToCloudinary } from "@/lib/cloudinary-upload"
import { serializeCompetition } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
    params: Promise<{ slug: string }>
}

const assetConfig = {
    hero: {
        field: "heroImagePath",
        folderName: "hero",
        label: "Hero image",
    },
    paymentQr: {
        field: "paymentQrPath",
        folderName: "payment-qr",
        label: "Payment QR image",
    },
} as const

type AssetType = keyof typeof assetConfig

function isAssetType(value: string): value is AssetType {
    return value === "hero" || value === "paymentQr"
}

export async function POST(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { slug } = await context.params
        const competition = await prisma.competition.findUnique({ where: { slug } })
        if (!competition) return Response.json({ error: "Competition not found." }, { status: 404 })

        const formData = await request.formData()
        const assetType = String(formData.get("assetType") ?? "")
        if (!isAssetType(assetType)) {
            return Response.json({ error: "Asset type must be hero or paymentQr." }, { status: 400 })
        }

        const file = formData.get("file")
        if (!(file instanceof File) || file.size <= 0) {
            return Response.json({ error: "Choose an image file to upload." }, { status: 400 })
        }

        const config = assetConfig[assetType]
        const imageUrl = await uploadImageToCloudinary(file, {
            folder: `salvo/${competition.slug}/competition-assets/${config.folderName}`,
            publicId: `${Date.now()}-${crypto.randomUUID()}`,
            label: config.label,
        })
        if (!imageUrl) return Response.json({ error: "Choose an image file to upload." }, { status: 400 })

        const updated = await prisma.competition.update({
            where: { id: competition.id },
            data: {
                [config.field]: imageUrl,
            },
        })

        return Response.json({ competition: serializeCompetition(updated), imageUrl })
    } catch (error) {
        if (error instanceof ImageUploadError) {
            return Response.json({ error: error.message }, { status: error.status })
        }
        console.error("Unable to upload competition asset", error)
        return Response.json({ error: "Unable to upload competition image." }, { status: 500 })
    }
}

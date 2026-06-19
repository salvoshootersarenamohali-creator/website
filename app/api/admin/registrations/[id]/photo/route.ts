import { NextRequest } from "next/server"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { ImageUploadError, uploadImageToCloudinary } from "@/lib/cloudinary-upload"
import { getCompetitionBySlugOrActive, getCompetitionSlugFromRequest } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"
import { getErrorMessage } from "@/lib/registration-validation"

type RouteContext = {
    params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const { id } = await context.params
        const competition = await getCompetitionBySlugOrActive(getCompetitionSlugFromRequest(request))
        if (!competition) return Response.json({ error: "Competition not found." }, { status: 404 })

        const existing = await prisma.registration.findUnique({
            where: { id },
            select: { id: true, competitionId: true },
        })
        if (!existing || existing.competitionId !== competition.id) {
            return Response.json({ error: "Registration not found for this competition." }, { status: 404 })
        }

        const formData = await request.formData()
        const studentPhoto = formData.get("studentPhoto")
        if (!(studentPhoto instanceof File) || studentPhoto.size <= 0) {
            return Response.json({ error: "Choose a student photo to upload." }, { status: 400 })
        }

        const studentPhotoPath = await uploadImageToCloudinary(studentPhoto, {
            folder: `salvo/${competition.slug}/student-photos`,
            label: "Student photo",
        })

        const registration = await prisma.registration.update({
            where: { id },
            data: { studentPhotoPath },
            include: { entries: { orderBy: { createdAt: "asc" } } },
        })

        return Response.json({ registration })
    } catch (error) {
        console.error("Unable to upload student photo", error)
        const message = getErrorMessage(error, "Unable to upload student photo.")
        return Response.json({ error: message }, { status: error instanceof ImageUploadError ? error.status : 500 })
    }
}

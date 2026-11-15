import { NextRequest } from "next/server"
import { adminUnauthorized, isCompetitionAdminRequest } from "@/lib/admin"
import { BHARAT_CUP_SLUG } from "@/lib/bharat-cup"
import { importBharatCupResults } from "@/lib/bharat-cup-import"
import { BharatCupImportError, readBharatCupWorkbook } from "@/lib/bharat-cup-workbook"
import { serializableTransaction } from "@/lib/relay-booking-server"

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
    const { slug } = await context.params
    if (slug !== BHARAT_CUP_SLUG) return Response.json({ error: "Import is unavailable for this competition." }, { status: 404 })
    try {
        if (!(await isCompetitionAdminRequest(request))) return adminUnauthorized()
        const form = await request.formData()
        const file = form.get("workbook")
        const preview = form.get("preview")
        if (!(file instanceof File) || !file.size || file.size > 256 * 1024 || !/\.xlsx$/i.test(file.name)) {
            return Response.json({ error: "Select the Bharat Cup .xlsx results workbook." }, { status: 400 })
        }
        if (preview !== null && (typeof preview !== "string" || !/^[a-f0-9]{64}$/.test(preview))) {
            return Response.json({ error: "Preview the workbook before importing." }, { status: 400 })
        }
        const rows = readBharatCupWorkbook(await file.arrayBuffer())
        const summary = await serializableTransaction((tx) => importBharatCupResults(tx, rows, preview ?? undefined))
        return Response.json(summary)
    } catch (error) {
        if (error instanceof BharatCupImportError) return Response.json({ error: error.message }, { status: 422 })
        console.error("Bharat Cup import failed", error instanceof Error ? error.name : "unknown")
        return Response.json({ error: "Unable to process the Bharat Cup workbook." }, { status: 500 })
    }
}

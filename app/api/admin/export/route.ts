import { NextRequest } from "next/server"
import * as XLSX from "xlsx"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { formatCurrency } from "@/lib/competition"
import { prisma } from "@/lib/prisma"

function formatDate(value: Date) {
    return value.toISOString().slice(0, 10)
}

function formatOptionalDate(value: Date | null) {
    return value ? formatDate(value) : ""
}

function formatPaymentAmount(registration: { amount: number; paymentStatus: string }) {
    return `${formatCurrency(registration.amount)} (${registration.paymentStatus})`
}

function formatScore(score: unknown, ruleSet: "NR" | "ISSF") {
    if (typeof score !== "number") return ""
    return ruleSet === "NR" ? score.toFixed(0) : score.toFixed(1)
}

export async function GET(request: NextRequest) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const registrations = await prisma.registration.findMany({
            orderBy: { createdAt: "asc" },
            include: { entries: { orderBy: { createdAt: "asc" } } },
        })

        const registrationRows = registrations.flatMap((registration, index) =>
            registration.entries.map((entry) => {
                const ruleSet = entry.ruleSet === "ISSF" ? "ISSF" : "NR"
                const scores = Array.isArray(entry.seriesScores) ? entry.seriesScores as number[] : []

                return {
                    "Sr. No.": index + 1,
                    Name: registration.name,
                    "Academy/Range": registration.academy,
                    Event: entry.eventTitle,
                    Category: entry.categoryCode,
                    "Category Name": entry.categoryLabel,
                    "Series 1": formatScore(scores[0], ruleSet),
                    "Series 2": formatScore(scores[1], ruleSet),
                    "Series 3": formatScore(scores[2], ruleSet),
                    "Series 4": formatScore(scores[3], ruleSet),
                    "Series 5": formatScore(scores[4], ruleSet),
                    "Series 6": formatScore(scores[5], ruleSet),
                    Total: formatScore(entry.totalScore, ruleSet),
                    "10x": entry.innerTenCount,
                    "Payment Status": registration.paymentStatus,
                    "Payment Confirmed By": registration.paymentConfirmedBy ?? "",
                    "Payment Confirmed At": formatOptionalDate(registration.paymentConfirmedAt),
                }
            })
        )

        const cardRows = registrations.map((registration, index) => ({
            "Card No.": index + 1,
            Name: registration.name,
            "Club Name": registration.academy,
            Contact: registration.phone,
            DOB: formatDate(registration.dateOfBirth),
            Gender: registration.gender,
            Date: formatDate(registration.preferredDate),
            Slot: registration.preferredSlot,
            "Payment Mode": registration.paymentMode,
            "Payment Status": registration.paymentStatus,
            "Payment Confirmed By": registration.paymentConfirmedBy ?? "",
            "Payment Confirmed At": formatOptionalDate(registration.paymentConfirmedAt),
            UTR: registration.utrNumber ?? "",
            "Category/Event a": registration.entries[0] ? `${registration.entries[0].categoryCode} - ${registration.entries[0].categoryLabel}` : "",
            "Category/Event b": registration.entries[1] ? `${registration.entries[1].categoryCode} - ${registration.entries[1].categoryLabel}` : "",
            "Category/Event c": registration.entries[2] ? `${registration.entries[2].categoryCode} - ${registration.entries[2].categoryLabel}` : "",
            "Other Entries": registration.entries.slice(3).map((entry) => `${entry.categoryCode} - ${entry.categoryLabel}`).join("; "),
            "Amount Paid": formatPaymentAmount(registration),
        }))

        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(registrationRows), "Registrations")
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(cardRows), "Competitor Cards")

        const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })
        return new Response(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": "attachment; filename=\"36th-salvo-cup-registrations.xlsx\"",
            },
        })
    } catch (error) {
        console.error("Unable to export admin registrations", error)
        return Response.json({ error: "Export failed. Check the database connection and migrations." }, { status: 500 })
    }
}

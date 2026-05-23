import { NextRequest } from "next/server"
import * as XLSX from "xlsx"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { formatCurrency } from "@/lib/competition"
import { prisma } from "@/lib/prisma"

function formatDate(value: Date) {
    return value.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    const registrations = await prisma.registration.findMany({
        orderBy: { createdAt: "asc" },
        include: { entries: { orderBy: { createdAt: "asc" } } },
    })

    const registrationRows = registrations.flatMap((registration, index) =>
        registration.entries.map((entry) => {
            const scores = Array.isArray(entry.seriesScores) ? entry.seriesScores as number[] : []
            return {
                "Sr. No.": index + 1,
                Name: registration.name,
                Event: entry.eventTitle,
                Category: entry.categoryCode,
                "Category Name": entry.categoryLabel,
                "Series 1": scores[0] ?? "",
                "Series 2": scores[1] ?? "",
                "Series 3": scores[2] ?? "",
                "Series 4": scores[3] ?? "",
                "Series 5": scores[4] ?? "",
                "Series 6": scores[5] ?? "",
                Total: entry.totalScore ?? "",
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
        UTR: registration.utrNumber ?? "",
        "Category/Event a": registration.entries[0] ? `${registration.entries[0].categoryCode} - ${registration.entries[0].categoryLabel}` : "",
        "Category/Event b": registration.entries[1] ? `${registration.entries[1].categoryCode} - ${registration.entries[1].categoryLabel}` : "",
        "Category/Event c": registration.entries[2] ? `${registration.entries[2].categoryCode} - ${registration.entries[2].categoryLabel}` : "",
        "Other Entries": registration.entries.slice(3).map((entry) => `${entry.categoryCode} - ${entry.categoryLabel}`).join("; "),
        "Amount Paid": `${formatCurrency(registration.amount)} (${registration.paymentMode === "cash" ? "Cash Pending" : "Online Paid"})`,
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
}

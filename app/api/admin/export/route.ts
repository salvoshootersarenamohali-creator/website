import { NextRequest } from "next/server"
import * as XLSX from "xlsx"
import { adminUnauthorized, isAdminRequest } from "@/lib/admin"
import { formatCurrency } from "@/lib/competition"
import { competitionFilePrefix, getCompetitionBySlugOrActive, getCompetitionSlugFromRequest } from "@/lib/competition-server"
import { prisma } from "@/lib/prisma"
import { getDisciplineLabel } from "@/lib/team-entries"

function formatDate(value: Date) {
    return value.toISOString().slice(0, 10)
}

function formatOptionalDate(value: Date | null) {
    return value ? formatDate(value) : ""
}

function formatPaymentMode(mode: string) {
    return mode === "upi" ? "Online" : "Cash"
}

function formatPaymentAmount(record: { amount: number; paymentStatus: string; paymentMode?: string }) {
    const paymentLabel = record.paymentMode ? `${formatPaymentMode(record.paymentMode)} - ${record.paymentStatus}` : record.paymentStatus
    return `${formatCurrency(record.amount)} (${paymentLabel})`
}

function formatScore(score: unknown, ruleSet: "NR" | "ISSF") {
    if (typeof score !== "number") return ""
    return ruleSet === "NR" ? score.toFixed(0) : score.toFixed(1)
}

export async function GET(request: NextRequest) {
    if (!isAdminRequest(request)) return adminUnauthorized()

    try {
        const competition = await getCompetitionBySlugOrActive(getCompetitionSlugFromRequest(request))
        if (!competition) return Response.json({ error: "Competition not found." }, { status: 404 })

        const registrations = await prisma.registration.findMany({
            where: { competitionId: competition.id },
            orderBy: { createdAt: "asc" },
            include: { entries: { orderBy: { createdAt: "asc" } } },
        })
        const teamEntries = await prisma.teamEntry.findMany({
            where: { competitionId: competition.id },
            orderBy: { createdAt: "asc" },
            include: {
                members: {
                    orderBy: { createdAt: "asc" },
                    include: {
                        registration: true,
                        registrationEntry: true,
                    },
                },
            },
        })

        const registrationRows = registrations.flatMap((registration, index) =>
            registration.entries.map((entry) => {
                const ruleSet = entry.ruleSet === "ISSF" ? "ISSF" : "NR"
                const scores = Array.isArray(entry.seriesScores) ? entry.seriesScores as number[] : []

                return {
                    "Sr. No.": index + 1,
                    Name: registration.name,
                    "Academy/Range": registration.academy,
                    "Mother's Name": registration.motherName ?? "",
                    "Father's Name": registration.fatherName ?? "",
                    Address: registration.address ?? "",
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
            "Mother's Name": registration.motherName ?? "",
            "Father's Name": registration.fatherName ?? "",
            Contact: registration.phone,
            Address: registration.address ?? "",
            DOB: formatDate(registration.dateOfBirth),
            Gender: registration.gender,
            Date: formatDate(registration.preferredDate),
            Slot: registration.preferredSlot,
            "Payment Mode": registration.paymentMode,
            "Payment Status": registration.paymentStatus,
            "Payment Confirmed By": registration.paymentConfirmedBy ?? "",
            "Payment Confirmed At": formatOptionalDate(registration.paymentConfirmedAt),
            UTR: registration.utrNumber ?? "",
            "Student Photo": registration.studentPhotoPath ?? "",
            "DOB Certificate": registration.birthCertificatePath ?? "",
            "Aadhaar Copy": registration.aadhaarCardPath ?? "",
            "Category/Event a": registration.entries[0] ? `${registration.entries[0].categoryCode} - ${registration.entries[0].categoryLabel}` : "",
            "Category/Event b": registration.entries[1] ? `${registration.entries[1].categoryCode} - ${registration.entries[1].categoryLabel}` : "",
            "Category/Event c": registration.entries[2] ? `${registration.entries[2].categoryCode} - ${registration.entries[2].categoryLabel}` : "",
            "Other Entries": registration.entries.slice(3).map((entry) => `${entry.categoryCode} - ${entry.categoryLabel}`).join("; "),
            "Amount Paid": formatPaymentAmount(registration),
        }))

        const teamRows = teamEntries.map((teamEntry, index) => {
            const members = teamEntry.members
            return {
                "Team No.": index + 1,
                "Team Name": teamEntry.name,
                "Club Name": teamEntry.academy,
                Discipline: teamEntry.discipline === "pistol" || teamEntry.discipline === "rifle" ? getDisciplineLabel(teamEntry.discipline) : teamEntry.discipline,
                "Payment Mode": formatPaymentMode(teamEntry.paymentMode),
                "Payment Status": teamEntry.paymentStatus,
                Amount: formatPaymentAmount(teamEntry),
                "Member 1": members[0]?.registration.name ?? "",
                "Member 1 Category": members[0] ? `${members[0].registrationEntry.categoryCode} - ${members[0].registrationEntry.categoryLabel}` : "",
                "Member 2": members[1]?.registration.name ?? "",
                "Member 2 Category": members[1] ? `${members[1].registrationEntry.categoryCode} - ${members[1].registrationEntry.categoryLabel}` : "",
                "Member 3": members[2]?.registration.name ?? "",
                "Member 3 Category": members[2] ? `${members[2].registrationEntry.categoryCode} - ${members[2].registrationEntry.categoryLabel}` : "",
                "Created At": formatDate(teamEntry.createdAt),
            }
        })

        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(registrationRows), "Registrations")
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(cardRows), "Competitor Cards")
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(teamRows), "Team Entries")

        const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })
        return new Response(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${competitionFilePrefix(competition)}-registrations.xlsx"`,
            },
        })
    } catch (error) {
        console.error("Unable to export admin registrations", error)
        return Response.json({ error: "Export failed. Check the database connection and migrations." }, { status: 500 })
    }
}

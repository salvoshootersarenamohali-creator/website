import * as XLSX from "xlsx"
import type { BookedDetail } from "@/lib/booked-details"

export function generateDetailWorkbook(title: string, venue: string, details: BookedDetail[], generatedAt: string) {
    const workbook = XLSX.utils.book_new()
    const summary = XLSX.utils.aoa_to_sheet([
        [title], [venue], ["Snapshot (UTC)", generatedAt],
        ["Date", "Relay", "Rule set", "Pool", "Report", "Prepare", "Start", "End", "Capacity", "Booked", "Available"],
        ...details.map((d) => [new Date(`${d.date}T00:00:00Z`), d.relay.number, d.relay.ruleSet, d.pool, d.relay.reportingTime, d.relay.preparationTime, d.relay.startTime, d.relay.endTime, d.capacity, d.booked, d.remaining]),
    ], { cellDates: true, dateNF: "dd mmm yyyy" })
    summary["!cols"] = [18, 10, 12, 14, 12, 12, 12, 12, 12, 12, 12].map((wch) => ({ wch }))
    summary["!autofilter"] = { ref: `A4:K${4 + details.length}` }
    XLSX.utils.book_append_sheet(workbook, summary, "Relay Summary")
    const rows = details.flatMap((d) => Array.from({ length: d.capacity }, (_, index) => {
        const row = d.rows.find((r) => r.lane === index + 1)
        return [new Date(`${d.date}T00:00:00Z`), d.relay.number, d.relay.ruleSet, d.pool, index + 1, row?.name ?? "Available", row?.academy ?? "", row?.categories ?? "", row?.paymentStatus ?? ""]
    }))
    const sheet = XLSX.utils.aoa_to_sheet([["Date", "Relay", "Rule set", "Pool", "Lane", "Shooter", "Academy / Club", "Categories", "Payment"], ...rows], { cellDates: true, dateNF: "dd mmm yyyy" })
    sheet["!cols"] = [18, 10, 12, 14, 8, 28, 32, 80, 15].map((wch) => ({ wch }))
    sheet["!autofilter"] = { ref: `A1:I${rows.length + 1}` }
    XLSX.utils.book_append_sheet(workbook, sheet, "Lane Details")
    return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer
}

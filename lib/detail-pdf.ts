import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import type { BookedDetail } from "@/lib/booked-details"

function clean(value: string) { return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim() }

export async function generateDetailPdf(title: string, venue: string, details: BookedDetail[], generatedAt: string) {
    const pdf = await PDFDocument.create()
    pdf.setTitle(`${title} - Detail sheets`)
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
    const widths = [42, 155, 140, 325, 100]
    const wrap = (text: string, width: number) => {
        const lines: string[] = []; let line = ""
        for (const word of clean(text).split(" ")) {
            // Split long identifiers too, so an unbroken name never escapes its cell.
            let piece = ""
            const pieces: string[] = []
            for (const char of word) { if (font.widthOfTextAtSize(piece + char, 8) > width - 12) { pieces.push(piece); piece = "" } piece += char }
            pieces.push(piece)
            for (const part of pieces) {
                const candidate = line ? `${line} ${part}` : part
                if (line && font.widthOfTextAtSize(candidate, 8) > width - 12) { lines.push(line); line = part } else line = candidate
            }
        }
        if (line) lines.push(line)
        return lines.length ? lines : [""]
    }
    for (const detail of details) {
        let page = pdf.addPage([841.89, 595.28]); let y = 0
        const header = (continued = false) => {
            const titleText = clean(title); let titleSize = 16
            while (titleSize > 9 && bold.widthOfTextAtSize(titleText, titleSize) > 762) titleSize--
            page.drawText(titleText, { x: 40, y: 552, font: bold, size: titleSize, color: rgb(0.04, 0.15, 0.25) })
            page.drawText(clean(`Relay ${detail.relay.number} (${detail.relay.ruleSet}) - ${detail.pool.toUpperCase()} LANES - ${detail.date}${continued ? " - continued" : ""}`), { x: 40, y: 529, font: bold, size: 11 })
            page.drawText(clean(venue), { x: 40, y: 509, font, size: 9 })
            page.drawText(`Report ${detail.relay.reportingTime}   Prepare ${detail.relay.preparationTime}   Start ${detail.relay.startTime}   End ${detail.relay.endTime}`, { x: 40, y: 489, font, size: 10 })
            page.drawText(`Capacity: ${detail.capacity}   Booked: ${detail.booked}   Available: ${detail.remaining}`, { x: 40, y: 469, font: bold, size: 10 })
            y = 446
            let x = 40
            ;["Lane", "Shooter", "Academy / Club", "Categories", "Payment"].forEach((label, index) => {
                page.drawRectangle({ x, y: y - 22, width: widths[index], height: 22, color: rgb(0.04, 0.15, 0.25) })
                page.drawText(label, { x: x + 6, y: y - 14, font: bold, size: 9, color: rgb(1, 1, 1) }); x += widths[index]
            }); y -= 22
        }
        header()
        for (let lane = 1; lane <= detail.capacity; lane++) {
            const row = detail.rows.find((r) => r.lane === lane)
            const cells = [String(lane), row?.name ?? "Available", row?.academy ?? "", row?.categories ?? "", row?.paymentStatus ?? ""]
            const lines = cells.map((value, index) => wrap(value, widths[index]))
            const height = Math.max(25, Math.max(...lines.map((l) => l.length)) * 11 + 12)
            if (y - height < 50) { page = pdf.addPage([841.89, 595.28]); header(true) }
            let x = 40
            lines.forEach((values, index) => {
                page.drawRectangle({ x, y: y - height, width: widths[index], height, borderColor: rgb(0.8, 0.82, 0.85), borderWidth: 0.5, color: row ? rgb(1, 1, 1) : rgb(0.95, 0.96, 0.97) })
                values.forEach((line, i) => page.drawText(line, { x: x + 6, y: y - 15 - i * 11, font, size: 8 }))
                x += widths[index]
            }); y -= height
        }
    }
    if (!details.length) {
        const page = pdf.addPage([841.89, 595.28]); page.drawText("No relays scheduled for this date.", { x: 40, y: 530, font, size: 14 })
    }
    const pages = pdf.getPages()
    pages.forEach((page, i) => {
        page.drawText(`Snapshot: ${clean(generatedAt)}    Page ${i + 1} of ${pages.length}`, { x: 40, y: 27, font, size: 8, color: rgb(0.4, 0.4, 0.4) })
    })
    return pdf.save()
}

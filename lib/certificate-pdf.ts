import { readFile } from "node:fs/promises"
import path from "node:path"
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib"
import { formatCompetitionDateRange, PublicCompetition } from "@/lib/competition"
import { DirectoryParticipant, MedalType, ParticipantEntry } from "@/lib/participants"

const A4_LANDSCAPE: [number, number] = [841.89, 595.28]
const NAVY = rgb(0.035, 0.12, 0.23)
const GOLD = rgb(0.73, 0.53, 0.13)
const GOLD_LIGHT = rgb(0.9, 0.77, 0.4)
const IVORY = rgb(0.985, 0.975, 0.94)
const MUTED = rgb(0.32, 0.36, 0.4)
const WHITE = rgb(1, 1, 1)

type CertificateCompetition = Pick<PublicCompetition, "title" | "shortTitle" | "startDate" | "endDate" | "venue">

function pdfText(value: string) {
    return value
        .normalize("NFKD")
        .replace(/[\u2010-\u2015]/g, "-")
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/\s+/g, " ")
        .trim()
}

function fitFontSize(text: string, font: PDFFont, maxWidth: number, preferred: number, minimum: number) {
    let size = preferred
    while (size > minimum && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5
    return size
}

function drawCentered(
    page: PDFPage,
    text: string,
    options: { y: number; font: PDFFont; size: number; color?: ReturnType<typeof rgb>; maxWidth?: number },
) {
    const clean = pdfText(text)
    const size = options.maxWidth
        ? fitFontSize(clean, options.font, options.maxWidth, options.size, Math.min(8, options.size))
        : options.size
    const width = options.font.widthOfTextAtSize(clean, size)
    page.drawText(clean, {
        x: (page.getWidth() - width) / 2,
        y: options.y,
        font: options.font,
        size,
        color: options.color ?? NAVY,
    })
}

function medalColor(medal: MedalType | null) {
    if (medal === "gold") return rgb(0.82, 0.61, 0.13)
    if (medal === "silver") return rgb(0.56, 0.6, 0.65)
    if (medal === "bronze") return rgb(0.64, 0.34, 0.14)
    return MUTED
}

function medalLabel(medal: MedalType | null) {
    if (!medal) return "Participation"
    return `${medal[0].toUpperCase()}${medal.slice(1)} Medal`
}

function entryLine(entry: ParticipantEntry) {
    const para = entry.isPara ? "Para - " : ""
    const result = entry.medal ? `${medalLabel(entry.medal)} - ${entry.positionLabel} Position` : "Participation"
    return `${result} | ${para}${entry.eventTitle} | ${entry.categoryCode} - ${entry.categoryLabel}`
}

function drawEntryGrid(page: PDFPage, entries: ParticipantEntry[], fonts: { regular: PDFFont; bold: PDFFont }) {
    const columnCount = entries.length > 4 ? 2 : 1
    const rowsPerColumn = Math.ceil(entries.length / columnCount)
    const gridX = 82
    const gridWidth = page.getWidth() - gridX * 2
    const gap = columnCount === 2 ? 18 : 0
    const columnWidth = (gridWidth - gap) / columnCount
    const availableHeight = 104
    const rowHeight = Math.min(24, availableHeight / Math.max(rowsPerColumn, 1))
    const startY = 258

    entries.forEach((entry, index) => {
        const column = Math.floor(index / rowsPerColumn)
        const row = index % rowsPerColumn
        const x = gridX + column * (columnWidth + gap)
        const y = startY - row * rowHeight
        const clean = pdfText(entryLine(entry))
        const fontSize = fitFontSize(clean, fonts.regular, columnWidth - 36, Math.min(10.5, rowHeight * 0.47), 6.5)
        const accent = medalColor(entry.medal)

        page.drawRectangle({
            x,
            y: y - 4,
            width: columnWidth,
            height: rowHeight - 3,
            color: WHITE,
            borderColor: entry.medal ? accent : rgb(0.82, 0.8, 0.72),
            borderWidth: entry.medal ? 1.1 : 0.55,
            opacity: 0.88,
        })
        page.drawCircle({ x: x + 13, y: y + rowHeight / 2 - 5, size: 4.2, color: accent })
        page.drawText(clean, {
            x: x + 25,
            y: y + rowHeight / 2 - fontSize / 2 - 4,
            font: entry.medal ? fonts.bold : fonts.regular,
            size: fontSize,
            color: NAVY,
        })
    })
}

function drawTargetMotif(page: PDFPage, x: number, y: number, scale: number) {
    ;[34, 25, 16, 7].forEach((radius, index) => {
        page.drawCircle({
            x,
            y,
            size: radius * scale,
            borderColor: index % 2 === 0 ? GOLD : NAVY,
            borderWidth: 0.8,
            opacity: 0.13,
        })
    })
    page.drawLine({ start: { x: x - 42 * scale, y }, end: { x: x + 42 * scale, y }, color: GOLD, thickness: 0.6, opacity: 0.1 })
    page.drawLine({ start: { x, y: y - 42 * scale }, end: { x, y: y + 42 * scale }, color: GOLD, thickness: 0.6, opacity: 0.1 })
}

function drawImageContained(page: PDFPage, image: PDFImage, box: { x: number; y: number; width: number; height: number }) {
    const scale = Math.min(box.width / image.width, box.height / image.height)
    const width = image.width * scale
    const height = image.height * scale
    page.drawImage(image, {
        x: box.x + (box.width - width) / 2,
        y: box.y + (box.height - height) / 2,
        width,
        height,
    })
}

export async function generateParticipantCertificate(
    competition: CertificateCompetition,
    participant: DirectoryParticipant,
) {
    const document = await PDFDocument.create()
    document.setTitle(`${participant.shooterName} - ${competition.shortTitle} Certificate`)
    document.setAuthor("Salvo Shooters Arena")
    document.setCreator("Salvo Shooters Arena")
    document.setSubject(participant.medalCount ? "Certificate of Achievement" : "Certificate of Participation")

    const page = document.addPage(A4_LANDSCAPE)
    const width = page.getWidth()
    const height = page.getHeight()
    const [times, timesBold, helvetica, helveticaBold] = await Promise.all([
        document.embedFont(StandardFonts.TimesRoman),
        document.embedFont(StandardFonts.TimesRomanBold),
        document.embedFont(StandardFonts.Helvetica),
        document.embedFont(StandardFonts.HelveticaBold),
    ])
    const [logoBytes, signatureBytes] = await Promise.all([
        readFile(path.join(process.cwd(), "public", "salvo-logo.png")),
        readFile(path.join(process.cwd(), "public", "certificates", "anjum-moudgil-signature.png")),
    ])
    const [logo, signature] = await Promise.all([document.embedPng(logoBytes), document.embedPng(signatureBytes)])

    page.drawRectangle({ x: 0, y: 0, width, height, color: IVORY })
    page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: NAVY, borderWidth: 2.2 })
    page.drawRectangle({ x: 26, y: 26, width: width - 52, height: height - 52, borderColor: GOLD, borderWidth: 1.2 })
    page.drawRectangle({ x: 31, y: 31, width: width - 62, height: height - 62, borderColor: GOLD_LIGHT, borderWidth: 0.5 })
    page.drawRectangle({ x: 34, y: height - 115, width: width - 68, height: 77, color: NAVY })

    drawTargetMotif(page, 79, 88, 1.55)
    drawTargetMotif(page, width - 76, height - 82, 1.25)
    drawImageContained(page, logo, { x: 52, y: height - 105, width: 146, height: 56 })

    const dateRange = formatCompetitionDateRange(competition.startDate, competition.endDate)
    page.drawText(pdfText(competition.title).toUpperCase(), {
        x: 218,
        y: height - 67,
        font: helveticaBold,
        size: fitFontSize(pdfText(competition.title).toUpperCase(), helveticaBold, 390, 17, 10),
        color: GOLD_LIGHT,
    })
    page.drawText(pdfText(`${dateRange} - ${competition.venue || "Salvo Shooters Arena"}`), {
        x: 218,
        y: height - 91,
        font: helvetica,
        size: fitFontSize(pdfText(`${dateRange} - ${competition.venue || "Salvo Shooters Arena"}`), helvetica, 500, 10, 7),
        color: WHITE,
    })

    const isAchievement = participant.medalCount > 0
    drawCentered(page, isAchievement ? "CERTIFICATE OF ACHIEVEMENT" : "CERTIFICATE OF PARTICIPATION", {
        y: 421,
        font: timesBold,
        size: 33,
        color: NAVY,
        maxWidth: 680,
    })
    drawCentered(page, isAchievement ? "IN RECOGNITION OF OUTSTANDING PERFORMANCE" : "IN RECOGNITION OF PARTICIPATION", {
        y: 396,
        font: helveticaBold,
        size: 9.5,
        color: GOLD,
        maxWidth: 560,
    })
    drawCentered(page, "This certificate is proudly presented to", { y: 366, font: times, size: 14, color: MUTED })
    drawCentered(page, participant.shooterName, { y: 324, font: timesBold, size: 35, color: NAVY, maxWidth: 650 })
    page.drawLine({ start: { x: 170, y: 315 }, end: { x: width - 170, y: 315 }, color: GOLD, thickness: 1.15 })
    drawCentered(page, isAchievement ? "OFFICIAL MEDAL RESULTS AND SCORED ENTRIES" : "OFFICIAL SCORED ENTRIES", {
        y: 292,
        font: helveticaBold,
        size: 8.5,
        color: MUTED,
        maxWidth: 500,
    })

    drawEntryGrid(page, participant.entries, { regular: helvetica, bold: helveticaBold })

    page.drawText("Issued by", { x: 155, y: 92, font: helvetica, size: 8, color: MUTED })
    page.drawText("SALVO SHOOTERS ARENA", { x: 155, y: 74, font: helveticaBold, size: 12, color: NAVY })
    page.drawText("Precision - Discipline - Excellence", { x: 155, y: 57, font: times, size: 9.5, color: GOLD })

    drawImageContained(page, signature, { x: width - 259, y: 73, width: 190, height: 84 })
    page.drawLine({ start: { x: width - 257, y: 75 }, end: { x: width - 69, y: 75 }, color: NAVY, thickness: 0.7 })
    drawCenteredInBox(page, "ANJUM MOUDGIL", width - 257, width - 69, 59, helveticaBold, 10.5, NAVY)
    drawCenteredInBox(page, "MENTOR - TWO-TIME OLYMPIAN - ARJUNA AWARDEE", width - 276, width - 50, 44, helvetica, 7.5, MUTED)

    return document.save()
}

function drawCenteredInBox(
    page: PDFPage,
    text: string,
    left: number,
    right: number,
    y: number,
    font: PDFFont,
    size: number,
    color: ReturnType<typeof rgb>,
) {
    const clean = pdfText(text)
    const fittedSize = fitFontSize(clean, font, right - left, size, 6)
    const textWidth = font.widthOfTextAtSize(clean, fittedSize)
    page.drawText(clean, { x: left + (right - left - textWidth) / 2, y, font, size: fittedSize, color })
}

export function certificateFileName(participantName: string, competitionSlug: string) {
    const safeName = participantName
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || "participant"
    const safeCompetition = competitionSlug.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "competition"
    return `${safeName}-${safeCompetition}-certificate.pdf`
}

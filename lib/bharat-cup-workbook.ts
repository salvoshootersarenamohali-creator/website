import * as XLSX from "xlsx"
import { createHash } from "node:crypto"

export const bharatCupMatchDays = [
    { sheet: "12_Nov", date: "2026-11-12", entries: 125 },
    { sheet: "13_Nov", date: "2026-11-13", entries: 155 },
    { sheet: "14 NOV", date: "2026-11-14", entries: 156 },
] as const

export class BharatCupImportError extends Error {}

export type BharatCupWorkbookRow = {
    matchDate: string
    sourceRow: number
    sourceDigest: string
    name: string
    academy: string
    reportedMatch: string
    categoryCode: string
    seriesScores: (number | null)[]
    totalScore: number | null
    innerTenCount: number
    flaggedSeriesTwo: number | null
}

export function normalizeBharatCupMatchCode(value: string) {
    const match = value.trim().match(/^([SR])[\s-]*(\d{1,2})(?:\s*\(\s*(mix)\s*\))?$/i)
    return match ? `${match[1].toUpperCase()}-${match[2].padStart(2, "0")}${match[3] ? " (Mix)" : ""}` : null
}

export function bharatCupEntryKey(name: string, academy: string, categoryCode: string) {
    return JSON.stringify([name, academy, categoryCode].map((value) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase()))
}

export function readBharatCupWorkbook(buffer: ArrayBuffer): BharatCupWorkbookRow[] {
    let workbook: XLSX.WorkBook
    try {
        workbook = XLSX.read(buffer, { type: "array", sheets: bharatCupMatchDays.map(({ sheet }) => sheet), sheetRows: 401 })
    } catch {
        throw new BharatCupImportError("The file could not be read as an Excel workbook.")
    }
    const keys = new Set<string>()
    return bharatCupMatchDays.flatMap(({ sheet, date, entries }) => {
        const worksheet = workbook.Sheets[sheet]
        if (!worksheet?.["!ref"]) throw new BharatCupImportError(`The workbook is missing the ${sheet} worksheet.`)
        const get = (column: string, index: number): unknown => worksheet[`${column}${index}`]?.v
        const headers = ["B", "C", "D", "K"].map((column) => String(get(column, 2)).trim().toLowerCase())
        if (headers[0] !== "shooter name" || headers[1] !== "academy name" || !/^match no\.?$/.test(headers[2]) || headers[3] !== "total") {
            throw new BharatCupImportError(`Unexpected column headers in ${sheet}.`)
        }
        const rows: BharatCupWorkbookRow[] = []
        const end = XLSX.utils.decode_range(worksheet["!ref"]).e.r + 1
        for (let row = 3; row <= end; row++) {
            const where = `${sheet}, row ${row}`
            const [name, academy, reportedMatch] = ["B", "C", "D"].map((column) => String(get(column, row) ?? "").trim())
            const rawSeries = ["E", "F", "G", "H", "I", "J"].map((column) => get(column, row))
            const rawTenCount = String(get("L", row) ?? "").trim()
            if (!name && !academy && !reportedMatch && !rawTenCount && rawSeries.every((score) => score == null || score === "")) continue
            const categoryCode = normalizeBharatCupMatchCode(reportedMatch)
            if (!name || !academy || !categoryCode) throw new BharatCupImportError(`Missing shooter, academy, or match number in ${where}.`)
            const key = bharatCupEntryKey(name, academy, categoryCode)
            if (keys.has(key)) throw new BharatCupImportError(`Duplicate shooter, academy, and match in ${where}.`)
            keys.add(key)

            const recordedTotal = get("K", row)
            const flagged = sheet === "13_Nov" && row === 121 && categoryCode === "R-03" && rawSeries[1] === 1045 && recordedTotal === 624.3
            const seriesScores = rawSeries.map((score, index) => {
                if (score == null || score === "" || (flagged && index === 1)) return null
                if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 109) {
                    throw new BharatCupImportError(`Invalid series ${index + 1} score in ${where}.`)
                }
                return score
            })
            while (seriesScores.length && seriesScores.at(-1) === null) seriesScores.pop()
            if (typeof recordedTotal !== "number" || !Number.isFinite(recordedTotal)) {
                throw new BharatCupImportError(`Invalid total in ${where}.`)
            }
            const sum = seriesScores.reduce<number>((total, score) => total + (score ?? 0), 0)
            if (!flagged && Math.abs(recordedTotal - sum) > 1e-7) throw new BharatCupImportError(`Series and total disagree in ${where}.`)
            const tens = rawTenCount.match(/^(\d+)\s*x$/i)
            if (rawTenCount && (!tens || Number(tens[1]) > 60)) throw new BharatCupImportError(`Invalid 10x count in ${where}.`)
            const data = {
                matchDate: date, sourceRow: row, name, academy, reportedMatch, categoryCode, seriesScores,
                totalScore: seriesScores.length ? Number(recordedTotal.toFixed(1)) : null,
                innerTenCount: tens ? Number(tens[1]) : 0,
                flaggedSeriesTwo: flagged ? 1045 : null,
            }
            const sourceDigest = createHash("sha256").update(JSON.stringify(data)).digest("hex")
            rows.push({ ...data, sourceDigest })
        }
        if (rows.length !== entries) throw new BharatCupImportError(`${sheet} contains ${rows.length} entries. Expected ${entries}.`)
        return rows
    })
}

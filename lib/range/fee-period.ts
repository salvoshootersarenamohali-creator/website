import { dateField, RangeError } from "./shared"
export function feeMonths(value: unknown) {
    if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 120) throw new RangeError("Enter between 1 and 120 months.")
    return value as number
}
export function suggestedCoverageEnd(start: string, months: number) {
    dateField(start); feeMonths(months)
    const date = new Date(`${start}T00:00:00Z`), target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
    return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(date.getUTCDate() - 1, lastDay))).toISOString().slice(0, 10)
}

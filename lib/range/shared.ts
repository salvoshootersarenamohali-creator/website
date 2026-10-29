export type RangeActor = { id: string; name: string; phone: string | null; username?: string | null; role: string; mustChangePassword: boolean }
export type LocationOption = { id: string; name: string; slug: string; timeZone: string }

export class RangeError extends Error {
    constructor(message: string, public status = 400) { super(message) }
}

export function textField(value: unknown, label: string, max = 200) {
    if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new RangeError(`${label} is required (maximum ${max} characters).`)
    return value.trim()
}

export function normalizePhone(value: unknown) {
    const phone = typeof value === "string" ? value.replace(/[\s()-]/g, "") : ""
    const result = /^\d{10}$/.test(phone) ? `+91${phone}` : phone
    if (!/^\+[1-9]\d{7,14}$/.test(result)) throw new RangeError("Enter a valid phone number, including country code for numbers outside India.")
    return result
}

export function normalizeUsername(value: unknown) {
    const username = typeof value === "string" ? value.trim().toLowerCase() : ""
    if (!/^[a-z][a-z0-9._-]{2,31}$/.test(username)) throw new RangeError("Use a username of 3 to 32 letters, numbers, dots, underscores or hyphens, starting with a letter.")
    return username
}

export function loginIdentity(value: unknown): { phone: string } | { username: string } {
    const identity = typeof value === "string" ? value.trim() : ""
    return /^[a-z]/i.test(identity) ? { username: normalizeUsername(identity) } : { phone: normalizePhone(identity) }
}

export function rangeDay(value = new Date()) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(value)
}

export function formatRangeTime(value: string | Date) {
    return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

export function dateField(value: unknown, label = "Date") {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError(`${label} is invalid.`)
    const parsed = new Date(`${value}T00:00:00Z`)
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new RangeError(`${label} is invalid.`)
    return value
}
export function indiaTime(value: unknown) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new RangeError("Enter a valid date and time in India time.")
    dateField(value.slice(0, 10))
    if (Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59) throw new RangeError("Invalid time.")
    const date = new Date(`${value}:00+05:30`)
    if (date.getTime() > Date.now() + 120000) throw new RangeError("Attendance cannot be in the future.")
    return date
}
export function toIndiaInput(value: string | Date) {
    return new Date(new Date(value).getTime() + 330 * 60000).toISOString().slice(0, 16)
}
export function dateWindow(from: unknown, to: unknown) {
    const first = dateField(from), last = dateField(to)
    if (first > last) throw new RangeError("Start date must be before end date.")
    return { gte: new Date(`${first}T00:00:00+05:30`), lt: new Date(new Date(`${last}T00:00:00+05:30`).getTime() + 86400000) }
}

export function dailyShiftTotals(shifts: { userId: string; inAt: string | Date; outAt: string | Date | null }[]) {
    const totals = new Map<string, { userId: string; day: string; milliseconds: number }>()
    for (const shift of shifts) {
        if (!shift.outAt) continue
        let cursor = new Date(shift.inAt).getTime()
        const end = new Date(shift.outAt).getTime()
        while (cursor < end) {
            const day = rangeDay(new Date(cursor)), next = new Date(`${day}T00:00:00+05:30`).getTime() + 86400000
            const key = `${shift.userId}:${day}`, item = totals.get(key) || { userId: shift.userId, day, milliseconds: 0 }
            item.milliseconds += Math.min(end, next) - cursor
            totals.set(key, item); cursor = next
        }
    }
    return [...totals.values()]
}

export type RangeActor = { id: string; name: string; phone: string; role: string; mustChangePassword: boolean }
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

export function rangeDay(value = new Date()) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(value)
}

export function formatRangeTime(value: string | Date) {
    return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

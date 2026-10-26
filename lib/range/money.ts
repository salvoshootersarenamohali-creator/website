import { RangeError } from "./shared"
export function paise(value: unknown, allowZero = false, allowNegative = false) {
    if (!Number.isSafeInteger(value) || Math.abs(value as number) > 2000000000 || (!allowNegative && (value as number) < 0) || (!allowZero && value === 0)) throw new RangeError("Enter a valid amount within ₹2 crore.")
    return value as number
}
export function parseMoney(value: string, allowNegative = false) {
    const match = (allowNegative ? /^(-?)(\d{1,8})(?:\.(\d{1,2}))?$/ : /^()(\d{1,8})(?:\.(\d{1,2}))?$/).exec(value.trim())
    if (!match) throw new RangeError("Enter a rupee amount with at most two decimal places.")
    return paise((Number(match[2]) * 100 + Number((match[3] || "").padEnd(2, "0"))) * (match[1] === "-" ? -1 : 1), true, allowNegative)
}
export function formatMoney(value: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value / 100) }
export function moneyInput(value: number) { return (value / 100).toFixed(2) }

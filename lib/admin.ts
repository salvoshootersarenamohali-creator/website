import { NextRequest } from "next/server"

export const coachNames = ["piyush", "anshul", "ayush", "yogesh", "vansh", "kamal", "rahul"] as const

export type CoachName = typeof coachNames[number]

export function isAdminRequest(request: NextRequest) {
    const configuredPin = process.env.ADMIN_PIN
    if (!configuredPin) return false
    return request.headers.get("x-admin-pin") === configuredPin
}

export function adminUnauthorized() {
    return Response.json({ error: "Invalid admin PIN." }, { status: 401 })
}

export function isCoachName(value: string): value is CoachName {
    return coachNames.includes(value as CoachName)
}

export function isValidCoachCode(coachName: string, coachCode: string) {
    if (!isCoachName(coachName)) return false

    try {
        const configuredCodes = JSON.parse(process.env.COACH_PAYMENT_CODES ?? "{}") as Record<string, string>
        const configuredCode = configuredCodes[coachName]
        return Boolean(configuredCode) && configuredCode === coachCode
    } catch {
        return false
    }
}

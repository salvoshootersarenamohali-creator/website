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

function getConfiguredCoachCodes() {
    const individualCodes = Object.fromEntries(
        coachNames.flatMap((coachName) => {
            const envName = `COACH_CODE_${coachName.toUpperCase()}`
            const code = process.env[envName]?.trim()
            return code ? [[coachName, code]] : []
        })
    )
    const rawCodes = process.env.COACH_PAYMENT_CODES
    if (!rawCodes) return individualCodes

    let parsed: unknown
    try {
        parsed = JSON.parse(rawCodes)
    } catch {
        return individualCodes
    }

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return {
            ...individualCodes,
            ...Object.fromEntries(
            Object.entries(parsed as Record<string, unknown>).map(([name, code]) => [
                name.trim().toLowerCase(),
                String(code ?? "").trim(),
            ])
            ),
        }
    }

    if (Array.isArray(parsed)) {
        return {
            ...individualCodes,
            ...Object.fromEntries(parsed.flatMap((item, index) => {
            if (typeof item === "string" || typeof item === "number") {
                const coachName = coachNames[index]
                return coachName ? [[coachName, String(item).trim()]] : []
            }

            if (item && typeof item === "object") {
                const record = item as Record<string, unknown>
                const name = String(record.name ?? record.coachName ?? "").trim().toLowerCase()
                const code = String(record.code ?? record.coachCode ?? "").trim()
                return name && code ? [[name, code]] : []
            }

            return []
            })),
        }
    }

    return individualCodes
}

export function isValidCoachCode(coachName: string, coachCode: string) {
    if (!isCoachName(coachName)) return false

    try {
        const configuredCodes = getConfiguredCoachCodes()
        const configuredCode = configuredCodes[coachName]
        return Boolean(configuredCode) && configuredCode === coachCode.trim()
    } catch {
        return false
    }
}

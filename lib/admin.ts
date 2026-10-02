import { createHmac, timingSafeEqual } from "node:crypto"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export const coachNames = ["piyush", "anshul", "ayush", "yogesh", "vansh", "kamal", "rahul"] as const

export type CoachName = typeof coachNames[number]

export const competitionAdminPinPattern = /^\d{4,8}$/

function constantTimeEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left)
    const rightBuffer = Buffer.from(right)
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export function validateCompetitionAdminPin(pin: string) {
    if (!competitionAdminPinPattern.test(pin)) {
        return "Competition admin PIN must contain 4 to 8 digits."
    }

    const masterPin = process.env.ADMIN_PIN
    if (masterPin && constantTimeEqual(pin, masterPin)) {
        return "Competition admin PIN must be different from the master PIN."
    }

    return null
}

export function createCompetitionAdminPinDigest(
    pin: string,
    secret = process.env.COMPETITION_PIN_SECRET,
) {
    if (!secret) {
        throw new Error("COMPETITION_PIN_SECRET is not configured.")
    }

    return createHmac("sha256", secret).update(pin, "utf8").digest("hex")
}

export function isAdminRequest(request: NextRequest) {
    const configuredPin = process.env.ADMIN_PIN
    if (!configuredPin) return false
    const suppliedPin = request.headers.get("x-admin-pin")
    if (!suppliedPin) return false
    return constantTimeEqual(suppliedPin, configuredPin)
}

function getScopedCompetitionSlug(request: NextRequest) {
    const segments = request.nextUrl.pathname.split("/").filter(Boolean)
    if (segments[0] !== "api" || segments[1] !== "admin" || segments[2] !== "competitions" || !segments[3]) {
        return null
    }

    try {
        return decodeURIComponent(segments[3])
    } catch {
        return null
    }
}

export async function isCompetitionAdminRequest(request: NextRequest) {
    if (isAdminRequest(request)) return true

    const suppliedPin = request.headers.get("x-admin-pin")?.trim()
    const slug = getScopedCompetitionSlug(request)
    if (!suppliedPin || !slug || validateCompetitionAdminPin(suppliedPin)) return false

    let suppliedDigest: string
    try {
        suppliedDigest = createCompetitionAdminPinDigest(suppliedPin)
    } catch {
        return false
    }

    const competition = await prisma.competition.findUnique({
        where: { slug },
        select: { adminPinDigest: true },
    })
    if (!competition?.adminPinDigest) return false
    return constantTimeEqual(suppliedDigest, competition.adminPinDigest)
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

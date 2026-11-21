export const BHARAT_CUP_SLUG = "1st-bharat-cup"

// Archived rows stay available to database maintenance, outside the web application.
export function webCompetitionKey(slug: string) {
    return slug === BHARAT_CUP_SLUG ? { slug, status: { not: "archived" } } : { slug }
}

export const BHARAT_CUP_REGISTRATION_FIELDS = ["name", "phone", "dateOfBirth", "academy", "coachName", "gender"] as const

export const UNRECORDED_PAYMENT = "Unrecorded"

export function bharatCupShooterKey(name: string, academy: string) {
    return normalizedBharatCupKey([name, academy])
}

export function bharatCupEntryKey(name: string, academy: string, categoryCode: string) {
    return normalizedBharatCupKey([name, academy, categoryCode])
}

function normalizedBharatCupKey(fields: string[]) {
    return JSON.stringify(fields.map((value) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase()))
}

export type Discipline = "pistol" | "rifle"
export type RuleSet = "NR" | "ISSF"
export type Gender = "male" | "female"
export type PaymentMode = "cash" | "upi"
export type PaymentStatus = "Pending" | "Paid"

export type CompetitionEvent = {
    id: string
    discipline: Discipline
    ruleSet: RuleSet
    title: string
    prizes: [number, number, number]
}

export type CategoryOption = {
    code: string
    label: string
    bracket: AgeBracket
    gender: Gender
    ruleSet: RuleSet
    discipline: Discipline
}

export type SelectedEntry = {
    eventId: string
    categoryCode: string
}

export type AgeBracket = "little-standing" | "little-sitting" | "sub-youth" | "youth" | "junior" | "senior" | "master"

const COMPETITION_YEAR = 2026

export const ENTRY_FEE = 1000

export const competitionEvents: CompetitionEvent[] = [
    {
        id: "issf-air-pistol",
        discipline: "pistol",
        ruleSet: "ISSF",
        title: "ISSF Air Pistol",
        prizes: [7100, 5100, 3100],
    },
    {
        id: "issf-air-rifle",
        discipline: "rifle",
        ruleSet: "ISSF",
        title: "ISSF Air Rifle",
        prizes: [5100, 3100, 2100],
    },
    {
        id: "nr-air-pistol",
        discipline: "pistol",
        ruleSet: "NR",
        title: "NR Air Pistol",
        prizes: [5100, 3100, 2100],
    },
    {
        id: "nr-air-rifle",
        discipline: "rifle",
        ruleSet: "NR",
        title: "NR Air Rifle",
        prizes: [5100, 3100, 2100],
    },
]

const bracketLabels: Record<AgeBracket, string> = {
    "little-standing": "Standing Little Champ",
    "little-sitting": "Sitting Under 12 Little Champ",
    "sub-youth": "Sub Youth",
    youth: "Youth",
    junior: "Junior",
    senior: "Senior",
    master: "Master",
}

const ladder: AgeBracket[] = ["sub-youth", "youth", "junior", "senior"]

export const slotOptions = [
    { date: "2026-06-05", label: "June 5, 2026", slots: ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 5:00 PM", "5:00 PM - 8:00 PM"] },
    { date: "2026-06-06", label: "June 6, 2026", slots: ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 5:00 PM", "5:00 PM - 8:00 PM"] },
    { date: "2026-06-07", label: "June 7, 2026", slots: ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 4:00 PM"] },
]

export function getAgeFromDobYear(dob: string) {
    const year = Number(dob.slice(0, 4))
    if (!year || Number.isNaN(year)) return null
    return COMPETITION_YEAR - year
}

export function getBaseBracket(age: number): AgeBracket | null {
    if (age >= 45) return "master"
    if (age >= 21) return "senior"
    if (age >= 19) return "junior"
    if (age >= 16) return "youth"
    if (age >= 12) return "sub-youth"
    if (age >= 10) return "little-standing"
    return null
}

export function getEligibleBrackets(age: number, ruleSet: RuleSet): AgeBracket[] {
    const base = getBaseBracket(age)
    if (!base) return []

    if (base === "master") return ["senior", "master"]
    if (base === "senior") return ["senior"]
    if (base === "little-standing") {
        return ruleSet === "NR" ? ["little-standing", "little-sitting", "sub-youth", "youth", "junior", "senior"] : []
    }

    const index = ladder.indexOf(base)
    return index >= 0 ? ladder.slice(index) : []
}

export function getSeriesCount(ruleSet: RuleSet) {
    return ruleSet === "ISSF" ? 6 : 4
}

export function getEventById(eventId: string) {
    return competitionEvents.find((event) => event.id === eventId)
}

export function buildCategoryCode(discipline: Discipline, ruleSet: RuleSet, bracket: AgeBracket, gender: Gender) {
    const offset = discipline === "pistol" ? "S" : "R"
    const genderOffset = gender === "male" ? 0 : 1
    let number: number

    if (ruleSet === "ISSF") {
        const map: Partial<Record<AgeBracket, number>> = {
            senior: 1,
            junior: 3,
            youth: 5,
            "sub-youth": 7,
            master: 9,
        }
        number = (map[bracket] ?? 0) + genderOffset
    } else {
        const map: Partial<Record<AgeBracket, number>> = {
            senior: 11,
            junior: 13,
            youth: 15,
            "sub-youth": 17,
            "little-standing": 19,
            "little-sitting": 21,
            master: 23,
        }
        number = (map[bracket] ?? 0) + genderOffset
    }

    return number ? `${offset}-${String(number).padStart(2, "0")}` : ""
}

export function buildCategoryLabel(event: CompetitionEvent, bracket: AgeBracket, gender: Gender) {
    const personLabel = gender === "male"
        ? bracket.startsWith("little") ? "Boys" : "Men"
        : bracket.startsWith("little") ? "Girls" : "Women"

    return `${event.title} ${bracketLabels[bracket]} ${personLabel}`
}

export function getEligibleCategories(event: CompetitionEvent, age: number, gender: Gender): CategoryOption[] {
    return getEligibleBrackets(age, event.ruleSet)
        .map((bracket) => ({
            code: buildCategoryCode(event.discipline, event.ruleSet, bracket, gender),
            label: buildCategoryLabel(event, bracket, gender),
            bracket,
            gender,
            ruleSet: event.ruleSet,
            discipline: event.discipline,
        }))
        .filter((category) => Boolean(category.code))
}

export function validateSelection(entries: SelectedEntry[]) {
    const events = entries.map((entry) => getEventById(entry.eventId)).filter(Boolean) as CompetitionEvent[]
    const disciplines = new Set(events.map((event) => event.discipline))
    if (disciplines.size > 1) return "Choose either pistol or rifle entries, not both."

    const hasIssf = events.some((event) => event.ruleSet === "ISSF")
    const hasNr = events.some((event) => event.ruleSet === "NR")
    const onlyIssfEventIds = new Set(entries.filter((entry) => getEventById(entry.eventId)?.ruleSet === "ISSF").map((entry) => entry.eventId))
    const onlyNrEventIds = new Set(entries.filter((entry) => getEventById(entry.eventId)?.ruleSet === "NR").map((entry) => entry.eventId))
    if (hasIssf && hasNr && onlyIssfEventIds.size > 0 && onlyNrEventIds.size > 0) return null
    return null
}

export function formatCurrency(amount: number) {
    return `Rs. ${amount.toLocaleString("en-IN")}`
}

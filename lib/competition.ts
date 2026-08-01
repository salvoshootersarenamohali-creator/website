export type Discipline = "pistol" | "rifle"
export type RuleSet = "NR" | "ISSF"
export type Gender = "male" | "female"
export type PaymentMode = "cash" | "upi"
export type CategoryGender = Gender | "open"
export type PaymentStatus = "Pending" | "Paid"

export type SlotOption = {
    date: string
    label: string
    slots: string[]
}

export type CompetitionEvent = {
    id: string
    discipline: Discipline
    ruleSet: RuleSet
    title: string
    prizes: [number, number, number]
    categories?: CompetitionCategoryConfig[]
}

export type CompetitionCategoryConfig = {
    code: string
    label: string
    bracket: AgeBracket
    gender: CategoryGender
    minAge?: number
    appliesToAllEligible?: boolean
}

export type RequiredDocumentConfig = {
    birthCertificate: boolean
    aadhaarCard: boolean
}

export type DetailDefaultsConfig = {
    firstSightingTimes: Record<RuleSet, string>
}

export type CompetitionConfig = {
    competitionYear: number
    entryFee: number
    littleChampEntryFee: number
    events: CompetitionEvent[]
    slotOptions: SlotOption[]
    feesByRuleSet: Record<RuleSet, number | null>
    allowedPaymentModes: PaymentMode[]
    noCashPrizes: boolean
    awardsNote: string
    matchStartTime: string
    minAge: number | null
    requiredDocuments: RequiredDocumentConfig
    requiresGuardianDetails: boolean
    requiresAddress: boolean
    teamEntriesEnabled: boolean
    rules: string[]
    registrationNotes: string[]
    contactName: string | null
    contactPhone: string | null
    detailDefaults: DetailDefaultsConfig
}

export type PublicCompetition = {
    id: string
    slug: string
    title: string
    shortTitle: string
    description: string | null
    venue: string | null
    startDate: string
    endDate: string
    status: string
    isPublished: boolean
    registrationOpen: boolean
    resultsPublished: boolean
    paymentQrPath: string | null
    heroImagePath: string | null
    config: CompetitionConfig
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

export const DEFAULT_COMPETITION_YEAR = 2026

export const ENTRY_FEE = 1000
export const LITTLE_CHAMP_ENTRY_FEE = 800

export const competitionEvents: CompetitionEvent[] = [
    {
        id: "issf-air-pistol",
        discipline: "pistol",
        ruleSet: "ISSF",
        title: "ISSF Air Pistol",
        prizes: [11000, 7100, 5100],
    },
    {
        id: "nr-air-pistol",
        discipline: "pistol",
        ruleSet: "NR",
        title: "NR Air Pistol",
        prizes: [7100, 5100, 3100],
    },
    {
        id: "issf-air-rifle",
        discipline: "rifle",
        ruleSet: "ISSF",
        title: "ISSF Air Rifle",
        prizes: [7100, 5100, 3100],
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

function isAgeBracket(value: unknown): value is AgeBracket {
    return typeof value === "string" && value in bracketLabels
}

const ladder: AgeBracket[] = ["sub-youth", "youth", "junior", "senior"]

export const slotOptions: SlotOption[] = [
    { date: "2026-07-31", label: "31st July 2026", slots: ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 5:00 PM", "5:00 PM - 8:00 PM"] },
    { date: "2026-08-01", label: "1st August 2026", slots: ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 5:00 PM", "5:00 PM - 8:00 PM"] },
    { date: "2026-08-02", label: "2nd August 2026", slots: ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 4:00 PM"] },
]

export const defaultCompetitionConfig: CompetitionConfig = {
    competitionYear: DEFAULT_COMPETITION_YEAR,
    entryFee: ENTRY_FEE,
    littleChampEntryFee: LITTLE_CHAMP_ENTRY_FEE,
    events: competitionEvents,
    slotOptions,
    feesByRuleSet: { NR: null, ISSF: null },
    allowedPaymentModes: ["upi", "cash"],
    noCashPrizes: false,
    awardsNote: "All winners receive an official event medal, championship trophy, and premium gift hamper in addition to the listed cash prize.",
    matchStartTime: "8:00 AM",
    minAge: null,
    requiredDocuments: {
        birthCertificate: false,
        aadhaarCard: false,
    },
    requiresGuardianDetails: false,
    requiresAddress: false,
    teamEntriesEnabled: true,
    rules: [],
    registrationNotes: [],
    contactName: null,
    contactPhone: null,
    detailDefaults: {
        firstSightingTimes: {
            NR: "08:30",
            ISSF: "08:30",
        },
    },
}

function readStringArray(value: unknown) {
    if (!Array.isArray(value)) return []
    return value.map((item) => String(item ?? "").trim()).filter(Boolean)
}

function readOptionalString(value: unknown) {
    const text = String(value ?? "").trim()
    return text || null
}

function readPositiveInteger(value: unknown, fallback: number | null) {
    if (
        value === null
        || value === undefined
        || (typeof value === "string" && !value.trim())
    ) {
        return fallback
    }

    const number = Number(value)
    return Number.isInteger(number) && number >= 0 ? number : fallback
}

function readRequiredDocuments(value: unknown): RequiredDocumentConfig {
    const raw = typeof value === "object" && value !== null ? value as Partial<RequiredDocumentConfig> : {}
    return {
        birthCertificate: raw.birthCertificate === true,
        aadhaarCard: raw.aadhaarCard === true,
    }
}

function readDetailDefaults(value: unknown): DetailDefaultsConfig {
    const raw = typeof value === "object" && value !== null ? value as Partial<DetailDefaultsConfig> : {}
    const times = typeof raw.firstSightingTimes === "object" && raw.firstSightingTimes !== null
        ? raw.firstSightingTimes as Partial<Record<RuleSet, unknown>>
        : {}

    return {
        firstSightingTimes: {
            NR: typeof times.NR === "string" && /^\d{2}:\d{2}$/.test(times.NR) ? times.NR : defaultCompetitionConfig.detailDefaults.firstSightingTimes.NR,
            ISSF: typeof times.ISSF === "string" && /^\d{2}:\d{2}$/.test(times.ISSF) ? times.ISSF : defaultCompetitionConfig.detailDefaults.firstSightingTimes.ISSF,
        },
    }
}

function readCategories(value: unknown): CompetitionCategoryConfig[] {
    if (!Array.isArray(value)) return []

    return value.flatMap((category) => {
        const candidate = category as Partial<CompetitionCategoryConfig>
        if (
            typeof candidate.code !== "string"
            || typeof candidate.label !== "string"
            || !candidate.code.trim()
            || !candidate.label.trim()
        ) {
            return []
        }

        const gender = candidate.gender === "female" || candidate.gender === "male" || candidate.gender === "open"
            ? candidate.gender
            : "open"
        const bracket = isAgeBracket(candidate.bracket) ? candidate.bracket : "senior"
        const minAge = readPositiveInteger(candidate.minAge, null)

        return [{
            code: candidate.code.trim(),
            label: candidate.label.trim(),
            bracket,
            gender,
            minAge: minAge ?? undefined,
            appliesToAllEligible: candidate.appliesToAllEligible === true,
        }]
    })
}

function readEvents(value: unknown) {
    if (!Array.isArray(value)) return []

    return value.flatMap((event) => {
        const candidate = event as Partial<CompetitionEvent>
        if (
            typeof candidate.id !== "string"
            || !candidate.id.trim()
            || (candidate.discipline !== "pistol" && candidate.discipline !== "rifle")
            || (candidate.ruleSet !== "NR" && candidate.ruleSet !== "ISSF")
            || typeof candidate.title !== "string"
            || !candidate.title.trim()
            || !Array.isArray(candidate.prizes)
            || candidate.prizes.length !== 3
            || !candidate.prizes.every((prize) => typeof prize === "number")
        ) {
            return []
        }

        const categories = readCategories(candidate.categories)
        return [{
            id: candidate.id.trim(),
            discipline: candidate.discipline,
            ruleSet: candidate.ruleSet,
            title: candidate.title.trim(),
            prizes: [...candidate.prizes] as [number, number, number],
            ...(categories.length ? { categories } : {}),
        }]
    })
}

function readSlots(value: unknown) {
    if (!Array.isArray(value)) return []

    return value.filter((slot): slot is SlotOption => {
        const candidate = slot as Partial<SlotOption>
        return typeof candidate.date === "string"
            && typeof candidate.label === "string"
            && Array.isArray(candidate.slots)
            && candidate.slots.every((item) => typeof item === "string")
    })
}

function readPaymentModes(value: unknown) {
    const modes = Array.isArray(value)
        ? value.filter((mode): mode is PaymentMode => mode === "cash" || mode === "upi")
        : []
    const unique = Array.from(new Set(modes))
    return unique.length ? unique : defaultCompetitionConfig.allowedPaymentModes
}

function readFeesByRuleSet(value: unknown): Record<RuleSet, number | null> {
    const raw = typeof value === "object" && value !== null ? value as Partial<Record<RuleSet, unknown>> : {}
    return {
        NR: readPositiveInteger(raw.NR, null),
        ISSF: readPositiveInteger(raw.ISSF, null),
    }
}

export function normalizeCompetitionConfig(value: unknown): CompetitionConfig {
    const raw = typeof value === "object" && value !== null ? value as Partial<CompetitionConfig> : {}
    const events = readEvents(raw.events)
    const slots = readSlots(raw.slotOptions)

    return {
        competitionYear: Number.isInteger(raw.competitionYear) ? Number(raw.competitionYear) : DEFAULT_COMPETITION_YEAR,
        entryFee: Number.isInteger(raw.entryFee) ? Number(raw.entryFee) : ENTRY_FEE,
        littleChampEntryFee: Number.isInteger(raw.littleChampEntryFee) ? Number(raw.littleChampEntryFee) : LITTLE_CHAMP_ENTRY_FEE,
        events: events.length ? events : competitionEvents,
        slotOptions: slots.length ? slots : slotOptions,
        feesByRuleSet: readFeesByRuleSet(raw.feesByRuleSet),
        allowedPaymentModes: readPaymentModes(raw.allowedPaymentModes),
        noCashPrizes: raw.noCashPrizes === true,
        awardsNote: String(raw.awardsNote ?? defaultCompetitionConfig.awardsNote).trim() || defaultCompetitionConfig.awardsNote,
        matchStartTime: String(raw.matchStartTime ?? defaultCompetitionConfig.matchStartTime).trim() || defaultCompetitionConfig.matchStartTime,
        minAge: readPositiveInteger(raw.minAge, null),
        requiredDocuments: readRequiredDocuments(raw.requiredDocuments),
        requiresGuardianDetails: raw.requiresGuardianDetails === true,
        requiresAddress: raw.requiresAddress === true,
        teamEntriesEnabled: raw.teamEntriesEnabled !== false,
        rules: readStringArray(raw.rules),
        registrationNotes: readStringArray(raw.registrationNotes),
        contactName: readOptionalString(raw.contactName),
        contactPhone: readOptionalString(raw.contactPhone),
        detailDefaults: readDetailDefaults(raw.detailDefaults),
    }
}

export function getAgeFromDobYear(dob: string, competitionYear = DEFAULT_COMPETITION_YEAR) {
    const year = Number(dob.slice(0, 4))
    if (!year || Number.isNaN(year)) return null
    return competitionYear - year - 1
}

export function getBaseBracket(age: number): AgeBracket | null {
    if (age >= 45) return "master"
    if (age >= 21) return "senior"
    if (age >= 19) return "junior"
    if (age >= 16) return "youth"
    if (age >= 12) return "sub-youth"
    if (age >= 0) return "little-standing"
    return null
}

export function getEligibleBrackets(age: number, config: Pick<CompetitionConfig, "minAge"> = defaultCompetitionConfig): AgeBracket[] {
    if (config.minAge !== null && age < config.minAge) return []

    const base = getBaseBracket(age)
    if (!base) return []

    if (base === "master") return ["senior", "master"]
    if (base === "senior") return ["senior"]
    if (base === "little-standing") {
            return ["little-standing", "little-sitting", "sub-youth", "youth", "junior", "senior"]
    }

    const index = ladder.indexOf(base)
    return index >= 0 ? ladder.slice(index) : []
}

export function getSeriesCount(ruleSet: RuleSet) {
    return ruleSet === "ISSF" ? 6 : 4
}

type ScoringCategory = {
    categoryCode?: string | null
    categoryLabel?: string | null
    code?: string | null
    label?: string | null
    bracket?: AgeBracket | string | null
}

export function isLittleChampCategory(category: ScoringCategory) {
    const bracket = String(category.bracket ?? "")
    const code = String(category.categoryCode ?? category.code ?? "")
    const label = String(category.categoryLabel ?? category.label ?? "")

    return bracket.startsWith("little")
        || /little champ/i.test(label)
        || /^[RS]-(19|20|21|22|25|26|27|28)$/.test(code)
}

export function getScoringSeriesCount(ruleSet: RuleSet, category: ScoringCategory) {
    return isLittleChampCategory(category) ? 2 : getSeriesCount(ruleSet)
}

export const SHOTS_PER_SERIES = 10

export function getShotCount(ruleSet: RuleSet) {
    return getSeriesCount(ruleSet) * SHOTS_PER_SERIES
}

export function getEventById(eventId: string, config: CompetitionConfig = defaultCompetitionConfig) {
    return config.events.find((event) => event.id === eventId)
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

export function getEligibleCategories(event: CompetitionEvent, age: number, gender: Gender, config: CompetitionConfig = defaultCompetitionConfig): CategoryOption[] {
    const eligibleBrackets = getEligibleBrackets(age, config)
    if (!eligibleBrackets.length) return []

    if (event.categories?.length) {
        return event.categories
            .filter((category) => {
                const minimumAge = category.minAge ?? config.minAge ?? 0
                if (age < minimumAge) return false
                if (category.gender !== "open" && category.gender !== gender) return false
                return category.appliesToAllEligible || eligibleBrackets.includes(category.bracket)
            })
            .map((category) => ({
                code: category.code,
                label: category.label,
                bracket: category.bracket,
                gender,
                ruleSet: event.ruleSet,
                discipline: event.discipline,
            }))
            .filter((category) => Boolean(category.code))
    }

    return eligibleBrackets
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

export function getEntryFee(category: Pick<CategoryOption, "bracket">, config: CompetitionConfig = defaultCompetitionConfig) {
    if ("ruleSet" in category) {
        const fee = config.feesByRuleSet[category.ruleSet as RuleSet]
        if (typeof fee === "number") return fee
    }

    return category.bracket.startsWith("little") ? config.littleChampEntryFee : config.entryFee
}

export function validateSelection(entries: SelectedEntry[], config: CompetitionConfig = defaultCompetitionConfig) {
    const events = entries.map((entry) => getEventById(entry.eventId, config)).filter(Boolean) as CompetitionEvent[]
    const disciplines = new Set(events.map((event) => event.discipline))
    if (disciplines.size > 1) return "Choose either pistol or rifle entries, not both."

    const hasIssf = events.some((event) => event.ruleSet === "ISSF")
    const hasNr = events.some((event) => event.ruleSet === "NR")
    const onlyIssfEventIds = new Set(entries.filter((entry) => getEventById(entry.eventId, config)?.ruleSet === "ISSF").map((entry) => entry.eventId))
    const onlyNrEventIds = new Set(entries.filter((entry) => getEventById(entry.eventId, config)?.ruleSet === "NR").map((entry) => entry.eventId))
    if (hasIssf && hasNr && onlyIssfEventIds.size > 0 && onlyNrEventIds.size > 0) return null
    return null
}

export function formatCurrency(amount: number) {
    return `Rs. ${amount.toLocaleString("en-IN")}`
}

type CompetitionStatusLike = {
    endDate: string | Date
    status: string
    isPublished?: boolean
    registrationOpen: boolean
    resultsPublished?: boolean
}

function dateOnlyText(value: string | Date) {
    if (value instanceof Date) return value.toISOString().slice(0, 10)
    return String(value).slice(0, 10)
}

export function getCompetitionEndBoundary(endDate: string | Date) {
    const [year, month, day] = dateOnlyText(endDate).split("-").map(Number)
    if (!year || !month || !day) return null
    return new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0))
}

export function hasCompetitionEnded(endDate: string | Date, now = new Date()) {
    const boundary = getCompetitionEndBoundary(endDate)
    return boundary ? now.getTime() >= boundary.getTime() : false
}

export function isCompetitionClosed(competition: CompetitionStatusLike, now = new Date()) {
    return competition.status === "closed" || hasCompetitionEnded(competition.endDate, now)
}

export function isCompetitionRegistrationAvailable(competition: CompetitionStatusLike, now = new Date()) {
    return competition.isPublished !== false
        && competition.registrationOpen
        && !isCompetitionClosed(competition, now)
}

export function getCompetitionStatusLabel(competition: CompetitionStatusLike, now = new Date()) {
    if (isCompetitionClosed(competition, now)) return "Closed"
    if (competition.registrationOpen) return "Registration Open"
    if (competition.resultsPublished) return "Results"
    return competition.status || "Draft"
}

export function formatCompetitionDateRange(startDate: string | Date, endDate: string | Date) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return ""
    const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
    const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth()

    if (sameMonth) {
        const month = start.toLocaleString("en-IN", { month: "long", timeZone: "UTC" })
        return `${start.getUTCDate()}-${end.getUTCDate()} ${month} ${start.getUTCFullYear()}`
    }

    const formatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: sameYear ? undefined : "numeric", timeZone: "UTC" })
    return `${formatter.format(start)} - ${formatter.format(end)}${sameYear ? ` ${start.getUTCFullYear()}` : ""}`
}

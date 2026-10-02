export type Discipline = "pistol" | "rifle"
export type RuleSet = "NR" | "ISSF"
export type Gender = "male" | "female"
export type PaymentMode = "cash" | "upi"
export type CategoryGender = Gender | "open"
export type PaymentStatus = "Pending" | "Paid"
export type CashPrizeMode = "event-wide" | "custom-groups" | "none"
export type PrizeAmounts = [number, number, number]

export type CashPrizeTarget =
    | { type: "event"; eventId: string }
    | { type: "categories"; eventId: string; categoryCodes: string[] }
    | { type: "team" }
    | { type: "general" }

export type CashPrizeGroup = {
    id: string
    title: string
    tag: string | null
    prizes: PrizeAmounts
    target: CashPrizeTarget
}

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
    prizes: PrizeAmounts
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
    teamEntryFee: number
    events: CompetitionEvent[]
    slotOptions: SlotOption[]
    feesByRuleSet: Record<RuleSet, number | null>
    allowedPaymentModes: PaymentMode[]
    cashPrizeMode: CashPrizeMode
    cashPrizeTitle: string
    cashPrizeNote: string
    cashPrizeGroups: CashPrizeGroup[]
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

export type CompetitionPrizeCategory = {
    code: string
    label: string
    bracket: AgeBracket
    gender: CategoryGender
}

export type SelectedEntry = {
    eventId: string
    categoryCode: string
}

export type AgeBracket = "little-standing" | "little-sitting" | "sub-youth" | "youth" | "junior" | "senior" | "master"

export const DEFAULT_COMPETITION_YEAR = 2026

export const ENTRY_FEE = 1000
export const LITTLE_CHAMP_ENTRY_FEE = 800
export const DEFAULT_TEAM_ENTRY_FEE = 900

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
const competitionCategoryBrackets: AgeBracket[] = ["little-standing", "little-sitting", "sub-youth", "youth", "junior", "senior", "master"]

export const slotOptions: SlotOption[] = [
    { date: "2026-09-25", label: "25th September 2026", slots: ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 5:00 PM", "5:00 PM - 8:00 PM"] },
    { date: "2026-09-26", label: "26th September 2026", slots: ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 5:00 PM", "5:00 PM - 8:00 PM"] },
    { date: "2026-09-27", label: "27th September 2026", slots: ["8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 4:00 PM"] },
]

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseCompetitionDate(value: string | Date) {
    const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
    const match = DATE_ONLY_PATTERN.exec(text)
    if (!match) return null

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(Date.UTC(year, month - 1, day))
    if (
        date.getUTCFullYear() !== year
        || date.getUTCMonth() !== month - 1
        || date.getUTCDate() !== day
    ) {
        return null
    }
    return date
}

export function formatCompetitionDateLabel(value: string | Date) {
    const date = parseCompetitionDate(value)
    if (!date) return ""
    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(date)
}

export function buildCompetitionSlotsForDateRange(
    startValue: string | Date,
    endValue: string | Date,
    templates: SlotOption[] = slotOptions,
) {
    const start = parseCompetitionDate(startValue)
    const end = parseCompetitionDate(endValue)
    if (!start || !end || end.getTime() < start.getTime()) return []

    const existingByDate = new Map(templates.map((option) => [option.date, option]))
    const firstTemplateSlots = templates[0]?.slots ?? slotOptions[0].slots
    const middleTemplateSlots = templates[1]?.slots ?? firstTemplateSlots
    const lastTemplateSlots = templates.at(-1)?.slots ?? firstTemplateSlots
    const dayCount = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1

    return Array.from({ length: dayCount }, (_, index) => {
        const date = new Date(start.getTime() + index * 86_400_000)
        const dateText = date.toISOString().slice(0, 10)
        const existing = existingByDate.get(dateText)
        const fallbackSlots = dayCount === 1
            ? firstTemplateSlots
            : index === dayCount - 1
                ? lastTemplateSlots
                : index === 0
                    ? firstTemplateSlots
                    : middleTemplateSlots

        return {
            date: dateText,
            label: formatCompetitionDateLabel(dateText),
            slots: [...(existing?.slots.length ? existing.slots : fallbackSlots)],
        }
    })
}

export const defaultCompetitionConfig: CompetitionConfig = {
    competitionYear: DEFAULT_COMPETITION_YEAR,
    entryFee: ENTRY_FEE,
    littleChampEntryFee: LITTLE_CHAMP_ENTRY_FEE,
    teamEntryFee: DEFAULT_TEAM_ENTRY_FEE,
    events: competitionEvents,
    slotOptions,
    feesByRuleSet: { NR: null, ISSF: null },
    allowedPaymentModes: ["upi", "cash"],
    cashPrizeMode: "event-wide",
    cashPrizeTitle: "Cash Prize Schedule",
    cashPrizeNote: "",
    cashPrizeGroups: [],
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

function readPrizeAmounts(value: unknown): PrizeAmounts | null {
    if (
        !Array.isArray(value)
        || value.length !== 3
        || !value.every((prize) => Number.isInteger(prize) && prize >= 0)
    ) {
        return null
    }

    return [...value] as PrizeAmounts
}

function readCategoryPrizes(value: unknown): Record<string, PrizeAmounts> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {}

    return Object.fromEntries(
        Object.entries(value).flatMap(([code, prizes]) => {
            const normalizedCode = code.trim()
            const normalizedPrizes = readPrizeAmounts(prizes)
            return normalizedCode && normalizedPrizes ? [[normalizedCode, normalizedPrizes]] : []
        }),
    )
}

type ParsedCompetitionEvent = CompetitionEvent & {
    legacyCategoryPrizes: Record<string, PrizeAmounts>
}

function readEvents(value: unknown): ParsedCompetitionEvent[] {
    if (!Array.isArray(value)) return []

    return value.flatMap((event) => {
        const candidate = event as Partial<CompetitionEvent> & { categoryPrizes?: unknown }
        if (
            typeof candidate.id !== "string"
            || !candidate.id.trim()
            || (candidate.discipline !== "pistol" && candidate.discipline !== "rifle")
            || (candidate.ruleSet !== "NR" && candidate.ruleSet !== "ISSF")
            || typeof candidate.title !== "string"
            || !candidate.title.trim()
        ) {
            return []
        }

        const prizes = readPrizeAmounts(candidate.prizes)
        if (!prizes) return []

        const categories = readCategories(candidate.categories)
        return [{
            id: candidate.id.trim(),
            discipline: candidate.discipline,
            ruleSet: candidate.ruleSet,
            title: candidate.title.trim(),
            prizes,
            legacyCategoryPrizes: readCategoryPrizes(candidate.categoryPrizes),
            ...(categories.length ? { categories } : {}),
        }]
    })
}

function stripLegacyCategoryPrizes(event: ParsedCompetitionEvent): CompetitionEvent {
    return {
        id: event.id,
        discipline: event.discipline,
        ruleSet: event.ruleSet,
        title: event.title,
        prizes: [...event.prizes],
        ...(event.categories ? { categories: event.categories.map((category) => ({ ...category })) } : {}),
    }
}

function readCashPrizeTarget(value: unknown, events: CompetitionEvent[]): CashPrizeTarget | null {
    if (typeof value !== "object" || value === null) return null
    const candidate = value as Partial<CashPrizeTarget> & { eventId?: unknown; categoryCodes?: unknown }

    if (candidate.type === "general" || candidate.type === "team") return { type: candidate.type }
    if (candidate.type !== "event" && candidate.type !== "categories") return null

    const eventId = String(candidate.eventId ?? "").trim()
    const event = events.find((item) => item.id === eventId)
    if (!event) return null
    if (candidate.type === "event") return { type: "event", eventId }

    const validCodes = new Set(getCompetitionCategories(event).map((category) => category.code))
    const categoryCodes = Array.isArray(candidate.categoryCodes)
        ? Array.from(new Set(candidate.categoryCodes.map((code) => String(code ?? "").trim()).filter((code) => validCodes.has(code))))
        : []
    return categoryCodes.length ? { type: "categories", eventId, categoryCodes } : null
}

function readCashPrizeGroups(value: unknown, events: CompetitionEvent[]): CashPrizeGroup[] {
    if (!Array.isArray(value)) return []

    const seenIds = new Set<string>()
    return value.flatMap((group) => {
        if (typeof group !== "object" || group === null) return []
        const candidate = group as Partial<CashPrizeGroup>
        const id = String(candidate.id ?? "").trim()
        const title = String(candidate.title ?? "").trim()
        const prizes = readPrizeAmounts(candidate.prizes)
        const target = readCashPrizeTarget(candidate.target, events)
        if (!id || seenIds.has(id) || !title || !prizes || !target) return []

        seenIds.add(id)
        const tag = String(candidate.tag ?? "").trim() || null
        return [{ id, title, tag, prizes, target }]
    })
}

function legacyCategoryPrizeGroups(events: ParsedCompetitionEvent[]): CashPrizeGroup[] {
    return events.flatMap((event) => {
        const categories = new Map(getCompetitionCategories(event).map((category) => [category.code, category]))
        return Object.entries(event.legacyCategoryPrizes).map(([categoryCode, prizes]) => {
            const category = categories.get(categoryCode)
            const safeId = `${event.id}-${categoryCode}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
            return {
                id: `legacy-${safeId}`,
                title: category?.label ?? `${event.title} ${categoryCode}`,
                tag: event.ruleSet,
                prizes,
                target: category
                    ? { type: "categories" as const, eventId: event.id, categoryCodes: [categoryCode] }
                    : { type: "general" as const },
            }
        })
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
    const parsedEvents = readEvents(raw.events)
    const events = parsedEvents.length ? parsedEvents.map(stripLegacyCategoryPrizes) : competitionEvents
    const slots = readSlots(raw.slotOptions)
    const isLegacyCategoryMode = (raw.cashPrizeMode as string | undefined) === "category-specific"
    const cashPrizeMode = raw.cashPrizeMode === "event-wide" || raw.cashPrizeMode === "custom-groups" || raw.cashPrizeMode === "none"
        ? raw.cashPrizeMode
        : isLegacyCategoryMode ? "custom-groups"
        : raw.noCashPrizes === true ? "none" : "event-wide"
    const configuredCashPrizeGroups = readCashPrizeGroups(raw.cashPrizeGroups, events)
    const cashPrizeGroups = isLegacyCategoryMode && !configuredCashPrizeGroups.length
        ? legacyCategoryPrizeGroups(parsedEvents)
        : configuredCashPrizeGroups

    return {
        competitionYear: Number.isInteger(raw.competitionYear) ? Number(raw.competitionYear) : DEFAULT_COMPETITION_YEAR,
        entryFee: readPositiveInteger(raw.entryFee, ENTRY_FEE) ?? ENTRY_FEE,
        littleChampEntryFee: readPositiveInteger(raw.littleChampEntryFee, LITTLE_CHAMP_ENTRY_FEE) ?? LITTLE_CHAMP_ENTRY_FEE,
        teamEntryFee: readPositiveInteger(raw.teamEntryFee, DEFAULT_TEAM_ENTRY_FEE) ?? DEFAULT_TEAM_ENTRY_FEE,
        events,
        slotOptions: slots.length ? slots : slotOptions,
        feesByRuleSet: readFeesByRuleSet(raw.feesByRuleSet),
        allowedPaymentModes: readPaymentModes(raw.allowedPaymentModes),
        cashPrizeMode,
        cashPrizeTitle: String(raw.cashPrizeTitle ?? defaultCompetitionConfig.cashPrizeTitle).trim() || defaultCompetitionConfig.cashPrizeTitle,
        cashPrizeNote: String(raw.cashPrizeNote ?? "").trim(),
        cashPrizeGroups,
        noCashPrizes: cashPrizeMode === "none",
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

export function validateCashPrizeConfiguration(value: unknown) {
    if (typeof value !== "object" || value === null) return null
    const raw = value as Record<string, unknown>
    if (raw.cashPrizeMode !== "custom-groups") return null

    if (!String(raw.cashPrizeTitle ?? "").trim()) return "Enter a title for the custom cash prize schedule."
    if (!Array.isArray(raw.cashPrizeGroups) || raw.cashPrizeGroups.length === 0) {
        return "Add at least one cash prize group."
    }

    const events = readEvents(raw.events).map(stripLegacyCategoryPrizes)
    const seenIds = new Set<string>()
    for (const rawGroup of raw.cashPrizeGroups) {
        if (typeof rawGroup !== "object" || rawGroup === null) return "Every cash prize group must be valid."
        const group = rawGroup as Record<string, unknown>
        const id = String(group.id ?? "").trim()
        if (!id || seenIds.has(id)) return "Every cash prize group must have a unique ID."
        seenIds.add(id)
        if (!String(group.title ?? "").trim()) return "Every cash prize group must have a title."
        if (!readPrizeAmounts(group.prizes)) return "Every cash prize group must have three non-negative whole-number amounts."
        if (!readCashPrizeTarget(group.target, events)) return "Every cash prize group must have a valid display association."
    }

    return null
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
    return isLittleChampCategory(category) ? 4 : getSeriesCount(ruleSet)
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

export function getCompetitionCategories(event: CompetitionEvent): CompetitionPrizeCategory[] {
    if (event.categories?.length) {
        return event.categories.map((category) => ({
            code: category.code,
            label: category.label,
            bracket: category.bracket,
            gender: category.gender,
        }))
    }

    return competitionCategoryBrackets.flatMap((bracket) =>
        (["male", "female"] as const).flatMap((gender) => {
            const code = buildCategoryCode(event.discipline, event.ruleSet, bracket, gender)
            return code ? [{ code, label: buildCategoryLabel(event, bracket, gender), bracket, gender }] : []
        }),
    )
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

export function isCompetitionRegistrationAvailable(competition: CompetitionStatusLike) {
    return competition.isPublished !== false
        && competition.registrationOpen
}

export function getCompetitionStatusLabel(competition: CompetitionStatusLike, now = new Date()) {
    if (competition.registrationOpen) return "Registration Open"
    if (isCompetitionClosed(competition, now)) return "Closed"
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

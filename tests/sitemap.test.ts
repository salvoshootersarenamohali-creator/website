import { beforeEach, describe, expect, it, vi } from "vitest"
import sitemap from "@/app/sitemap"
import robots from "@/app/robots"

const db = vi.hoisted(() => ({ competitions: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { competition: { findMany: db.competitions } } }))

beforeEach(() => {
    vi.resetAllMocks()
})

describe("search engine discovery", () => {
    it("lists public pages and published competition features without private or duplicate routes", async () => {
        const updatedAt = new Date("2026-10-27T12:00:00Z")
        db.competitions.mockResolvedValue([
            { slug: "open-cup", updatedAt, registrationOpen: true, resultsPublished: false },
            { slug: "finished-cup", updatedAt, registrationOpen: false, resultsPublished: true },
        ])

        const entries = await sitemap()
        const paths = entries.map((entry) => new URL(entry.url).pathname)

        expect(db.competitions).toHaveBeenCalledWith(expect.objectContaining({ where: { isPublished: true } }))
        expect(paths).toEqual(expect.arrayContaining([
            "/", "/about", "/courses", "/competitions", "/contact",
            "/courses/intro-to-10m-air-pistol", "/technique/10m-air-rifle",
            "/competitions/open-cup", "/competitions/open-cup/register",
            "/competitions/finished-cup", "/competitions/finished-cup/results",
        ]))
        expect(paths).not.toContain("/competitions/open-cup/results")
        expect(paths).not.toContain("/competitions/finished-cup/register")
        expect(paths.some((path) => /^\/(admin|api|range|uploads)(\/|$)/.test(path))).toBe(false)
        expect(paths).not.toContain("/register")
        expect(paths).not.toContain("/results")
        expect(paths.some((path) => path.endsWith("/tv"))).toBe(false)
        expect(new Set(paths).size).toBe(paths.length)
        expect(entries.every((entry) => new URL(entry.url).origin === "https://salvoshootersarena.com")).toBe(true)
        expect(entries.find((entry) => entry.url.endsWith("/competitions/open-cup"))?.lastModified).toEqual(updatedAt)
        expect(entries.find((entry) => entry.url.endsWith("/competitions/finished-cup/results"))?.lastModified).toBeUndefined()
        expect(robots().sitemap).toBe("https://salvoshootersarena.com/sitemap.xml")
    })

    it("retains academy pages when there are no published competitions", async () => {
        db.competitions.mockResolvedValue([])
        const entries = await sitemap()
        expect(entries.some((entry) => new URL(entry.url).pathname === "/")).toBe(true)
        expect(entries.some((entry) => new URL(entry.url).pathname.startsWith("/competitions/"))).toBe(false)
    })

    it("lets crawlers retry a database outage instead of serving an incomplete sitemap", async () => {
        db.competitions.mockRejectedValue(new Error("Database unavailable"))
        await expect(sitemap()).rejects.toThrow("Database unavailable")
    })
})

import { readFileSync } from "node:fs"
import { createElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import CompetitionPage from "@/app/competitions/[slug]/page"
import { getTemplatePublicCompetition } from "@/lib/competition-server"

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { competition: { findUnique } } }))
vi.mock("next/image", () => ({
    default: ({ src, alt }: { src: string; alt: string }) => createElement("img", { src, alt }),
}))
vi.mock("next/link", () => ({
    default: ({ children, ...props }: { children: ReactNode; href: string }) => createElement("a", props, children),
}))

function competitionRecord(slug: string) {
    const template = getTemplatePublicCompetition()
    const sql = readFileSync("prisma/migrations/20261012010000_add_nehra_memorial/migration.sql", "utf8")
    return {
        ...template,
        id: slug,
        slug,
        title: "2nd Shri Baru Ram Nehra Memorial Shooting Championship 2026",
        startDate: new Date("2026-11-01T00:00:00.000Z"),
        endDate: new Date("2026-11-06T00:00:00.000Z"),
        heroImagePath: "/nehra-2026-entry-poster.png",
        paymentQrPath: "/nehra-2026-payment-qr.png",
        config: JSON.parse(sql.match(/'(\{[\s\S]*\})'::jsonb/)![1]),
    }
}

describe("competition detail images", () => {
    it("hides Nehra artwork while retaining structured information and registration links", async () => {
        findUnique.mockResolvedValueOnce(competitionRecord("nehra-memorial-2026"))
        const html = renderToStaticMarkup(await CompetitionPage({ params: Promise.resolve({ slug: "nehra-memorial-2026" }) }))
        expect(html).not.toContain("<img")
        expect(html).not.toContain("Official Entry Circular")
        expect(html).not.toContain("Official Relay Circular")
        expect(html).not.toContain("Official Prize and Entry Fee Circular")
        expect(html).toContain("Daily Relay Schedule")
        expect(html).toContain("Nehra Memorial Cash Prize Schedule")
        expect(html).toContain("21:35")
        expect(html).toContain("/competitions/nehra-memorial-2026/register")
    })

    it("keeps hero and circular images available for other competitions", async () => {
        findUnique.mockResolvedValueOnce(competitionRecord("another-competition"))
        const html = renderToStaticMarkup(await CompetitionPage({ params: Promise.resolve({ slug: "another-competition" }) }))
        expect(html.match(/<img /g)).toHaveLength(4)
        expect(html).toContain("Official Entry Circular")
        expect(html).toContain("Official Relay Circular")
        expect(html).toContain("Official Prize and Entry Fee Circular")
    })
})

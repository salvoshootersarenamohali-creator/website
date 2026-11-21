import { getCompetitionSlugFromRequest } from "@/lib/competition-server"
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import { proxy } from "@/proxy"
import { BHARAT_CUP_SLUG, webCompetitionKey } from "@/lib/bharat-cup"

describe("database-only competition", () => {
    it.each([
        "/competitions/1st-bharat-cup", "/competitions/1st-bharat-cup/register",
        "/competitions/1st-bharat-cup/results/tv", "/competitions/1st-bharat-cup/recorded-results",
        "/admin/competitions/1st-bharat-cup", "/api/admin/competitions/1st-bharat-cup/export",
        "/api/competitions/1st-bharat-cup/participants/example/certificate",
        "/api/admin/registrations?competition=1st-bharat-cup", "/api/results?competition=1st-bharat-cup",
        "/api/competitions/%31st-bharat-cup/results",
    ])("returns 404 before serving %s", path => {
        expect(proxy(new NextRequest("https://example.test" + path, { headers: { "x-admin-pin": "staff" } })).status).toBe(404)
    })
    it("keeps other archives and similarly named competitions independent", () => {
        expect(proxy(new NextRequest("https://example.test/competitions/1st-bharat-cup-junior")).status).toBe(200)
        expect(webCompetitionKey(BHARAT_CUP_SLUG)).toEqual({ slug: BHARAT_CUP_SLUG, status: { not: "archived" } })
        expect(webCompetitionKey("another-event")).toEqual({ slug: "another-event" })
    })
})

it("binds admin roster lookups to the event in the authorized route", () => {
    expect(getCompetitionSlugFromRequest(new NextRequest("https://example.test/api/admin/competitions/spring/registrations?competition=summer"))).toBe("spring")
    expect(getCompetitionSlugFromRequest(new NextRequest("https://example.test/api/results?competition=summer"))).toBe("summer")
})

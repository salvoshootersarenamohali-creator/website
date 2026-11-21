import { afterEach, beforeEach, expect, it, vi } from "vitest"

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllGlobals())

it("shares concurrent reads and fetches fresh data on the next refresh", async () => {
    const response = Promise.withResolvers<Response>()
    const fetch = vi.fn().mockReturnValueOnce(response.promise).mockResolvedValueOnce(Response.json({ version: 2 }))
    vi.stubGlobal("fetch", fetch)
    const { rangeApi } = await import("@/lib/range-api")
    const first = rangeApi("finance/meta?locationId=a")
    const second = rangeApi("finance/meta?locationId=a")
    expect(fetch).toHaveBeenCalledTimes(1)
    response.resolve(Response.json({ version: 1 }))
    expect(await first).toEqual(await second)
    expect(await rangeApi("finance/meta?locationId=a")).toEqual({ version: 2 })
    expect(fetch).toHaveBeenCalledTimes(2)
})

it("keeps locations independent and retries a failed read", async () => {
    const fetch = vi.fn()
        .mockResolvedValueOnce(Response.json({ error: "Unavailable" }, { status: 503 }))
        .mockResolvedValueOnce(Response.json({ location: "b" }))
        .mockResolvedValueOnce(Response.json({ location: "a" }))
    vi.stubGlobal("fetch", fetch)
    const { rangeApi } = await import("@/lib/range-api")
    await expect(rangeApi("session")).rejects.toThrow("Unavailable")
    expect(await rangeApi("finance/meta?locationId=b")).toEqual({ location: "b" })
    expect(await rangeApi("session")).toEqual({ location: "a" })
})

it("never joins a refresh to a read started before or during a mutation", async () => {
    const old = Promise.withResolvers<Response>(), write = Promise.withResolvers<Response>(), during = Promise.withResolvers<Response>()
    const fetch = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(write.promise).mockReturnValueOnce(during.promise)
        .mockResolvedValueOnce(Response.json({ version: 3 }))
    vi.stubGlobal("fetch", fetch)
    const { rangeApi } = await import("@/lib/range-api")
    const first = rangeApi("finance")
    const save = rangeApi("finance", { amount: 20 })
    const concurrent = rangeApi("finance")
    write.resolve(Response.json({ saved: true }))
    await save
    const refresh = rangeApi("finance")
    old.resolve(Response.json({ version: 1 }))
    during.resolve(Response.json({ version: 2 }))
    expect(await first).toEqual({ version: 1 })
    expect(await concurrent).toEqual({ version: 2 })
    expect(await refresh).toEqual({ version: 3 })
    expect(fetch).toHaveBeenCalledTimes(4)
})

it("keeps separate mutations separate", async () => {
    const fetch = vi.fn().mockImplementation(async () => Response.json({ saved: true }))
    vi.stubGlobal("fetch", fetch)
    const { rangeApi } = await import("@/lib/range-api")
    await Promise.all([rangeApi("fees", { amount: 10 }), rangeApi("fees", { amount: 10 })])
    expect(fetch).toHaveBeenCalledTimes(2)
})

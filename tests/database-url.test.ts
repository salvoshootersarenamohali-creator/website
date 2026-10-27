import { describe, expect, it } from "vitest"
import { databaseUrlForRuntime } from "@/lib/database-url"

describe("database connection pools", () => {
    const original = "postgresql://test:encoded%40password@localhost:55432/test?sslmode=require&schema=public"
    it("defaults Vercel PostgreSQL pools to one connection while preserving credentials and TLS", () => {
        const url = new URL(databaseUrlForRuntime(original, true)!)
        expect(url.searchParams.get("connection_limit")).toBe("1")
        expect(url.searchParams.get("sslmode")).toBe("require")
        expect(url.searchParams.get("schema")).toBe("public")
        expect(url.password).toBe("encoded%40password")
        expect(url.pathname).toBe("/test")
    })
    it("preserves an explicitly configured pool size", () => {
        const configured = `${original}&connection_limit=2`
        expect(databaseUrlForRuntime(configured, true)).toBe(configured)
    })
    it("leaves local and other deployment environments unchanged", () => {
        expect(databaseUrlForRuntime(original, false)).toBe(original)
    })
    it("leaves missing and non-PostgreSQL connection URLs unchanged", () => {
        expect(databaseUrlForRuntime(undefined, true)).toBeUndefined()
        expect(databaseUrlForRuntime("prisma://example.test/?api_key=placeholder", true)).toBe("prisma://example.test/?api_key=placeholder")
    })
    it("preserves unresolved build-time secrets for Prisma to validate when connecting", () => {
        expect(databaseUrlForRuntime("unresolved-build-secret", true)).toBe("unresolved-build-secret")
    })
})

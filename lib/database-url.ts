export function databaseUrlForRuntime(value: string | undefined, vercel: boolean) {
    if (!value || !vercel) return value
    let url: URL
    try { url = new URL(value) } catch { throw new Error("DATABASE_URL must be a valid connection string.") }
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.searchParams.has("connection_limit")) return value
    url.searchParams.set("connection_limit", "1")
    return url.toString()
}

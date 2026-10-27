export function databaseUrlForRuntime(value: string | undefined, vercel: boolean) {
    if (!value || !vercel) return value
    let url: URL
    // Prebuilt Vercel artifacts can contain unresolved secrets during build.
    // Preserve Prisma's lazy connection validation for those values.
    try { url = new URL(value) } catch { return value }
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.searchParams.has("connection_limit")) return value
    url.searchParams.set("connection_limit", "1")
    return url.toString()
}

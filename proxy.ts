import { NextRequest, NextResponse } from "next/server"
import { BHARAT_CUP_SLUG } from "@/lib/bharat-cup"

export function proxy(request: NextRequest) {
    const parts = request.nextUrl.pathname.split("/")
    const index = parts.indexOf("competitions")
    let slug: string
    try { slug = decodeURIComponent(parts[index + 1] ?? "") }
    catch { return new NextResponse("Invalid URL.", { status: 400 }) }
    if ((index >= 0 && slug === BHARAT_CUP_SLUG) ||
        request.nextUrl.searchParams.get("competition") === BHARAT_CUP_SLUG) {
        return new NextResponse("Competition not found.", { status: 404, headers: { "Cache-Control": "no-store" } })
    }
    return NextResponse.next()
}

export const config = {
    matcher: [
        "/competitions/:slug/:path*", "/admin/competitions/:slug/:path*",
        "/api/competitions/:slug/:path*", "/api/admin/competitions/:slug/:path*",
        { source: "/api/:path*", has: [{ type: "query", key: "competition" }] },
    ],
}

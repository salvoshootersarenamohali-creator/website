import { NextRequest } from "next/server"
import { currentActor, login, logout, changePassword, listLocations, staffAction, locationAction } from "@/lib/range/auth"
import { assertSameOrigin, failure } from "@/lib/range/server"
import { RangeError } from "@/lib/range/shared"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ path: string[] }> }

async function handle(request: NextRequest, context: Context) {
    try {
        if (request.method !== "GET") assertSameOrigin(request)
        const path = (await context.params).path.join("/")
        if (path === "login" && request.method === "POST") return await login(request)
        if (path === "logout" && request.method === "POST") return await logout(request)
        const actor = await currentActor(request)
        if (path === "session" && request.method === "GET") return Response.json({ user: actor, locations: await listLocations(actor) })
        if (path === "password" && request.method === "POST") return await changePassword(request, actor)
        if (actor.mustChangePassword) throw new RangeError("Change your temporary password first.", 403)
        if (path === "staff") return await staffAction(request, actor)
        if (path === "locations") return await locationAction(request, actor)
        throw new RangeError("Not found.", 404)
    } catch (error) { return failure(error) }
}

export async function GET(request: NextRequest, context: Context) { const response = await handle(request, context); response.headers.set("Cache-Control", "private, no-store"); return response }
export async function POST(request: NextRequest, context: Context) { const response = await handle(request, context); response.headers.set("Cache-Control", "private, no-store"); return response }

import { Prisma } from "@prisma/client"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { RangeActor, RangeError } from "./shared"

export async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
        try { return await prisma.$transaction(work, { isolationLevel: "Serializable", timeout: 15000 }) }
        catch (error) {
            if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt >= 3) throw error
        }
    }
}

export function ownerOnly(actor: RangeActor) {
    if (actor.role !== "owner") throw new RangeError("Owner access required.", 403)
}

export function staffOnly(actor: RangeActor) {
    if (!["owner", "coach"].includes(actor.role)) throw new RangeError("Staff access required.", 403)
}

export async function locationAccess(actor: RangeActor, locationId: string, db: Prisma.TransactionClient = prisma) {
    staffOnly(actor)
    const location = await db.rangeLocation.findUnique({ where: { id: locationId } })
    if (!location?.active) throw new RangeError("Location not found.", 404)
    if (actor.role !== "owner" && !await db.rangeMembership.findUnique({ where: { userId_locationId: { userId: actor.id, locationId } } })) throw new RangeError("Location access denied.", 403)
    return location
}

export function assertSameOrigin(request: NextRequest) {
    if (request.headers.get("origin") !== request.nextUrl.origin) throw new RangeError("Request origin is not allowed.", 403)
}

export async function jsonBody(request: NextRequest): Promise<Record<string, unknown>> {
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new RangeError("JSON request required.", 415)
    const body = await request.json().catch(() => { throw new RangeError("Invalid JSON.") })
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new RangeError("Invalid request.")
    return body
}

export function snapshot(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) }

export async function audit(db: Prisma.TransactionClient, actor: RangeActor, action: string, entityId: string, before?: unknown, after?: unknown, locationId?: string, reason?: string) {
    await db.rangeAudit.create({ data: { actorId: actor.id, locationId, action, entityId, before: before === undefined ? undefined : snapshot(before), after: after === undefined ? undefined : snapshot(after), reason } })
}

export function failure(error: unknown) {
    if (error instanceof RangeError) return Response.json({ error: error.message }, { status: error.status })
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return Response.json({ error: "This record already exists. Refresh and try again." }, { status: 409 })
    console.error("Range request failed", error instanceof Error ? error.name : "Unknown error")
    return Response.json({ error: "Unable to complete this request. Please try again." }, { status: 500 })
}

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { RangeActor, dateField, dateWindow, rangeDay, textField } from "./shared"
import { locationAccess, ownerOnly } from "./server"

export async function reportScope(request: NextRequest, actor: RangeActor) {
    const locationId = textField(request.nextUrl.searchParams.get("locationId"), "Location")
    if (locationId === "all") { ownerOnly(actor); return prisma.rangeLocation.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }) }
    const location = await locationAccess(actor, locationId)
    return [{ id: location.id, name: location.name }]
}
export function reportDates(request: NextRequest, singleDay = false) {
    const from = dateField(request.nextUrl.searchParams.get("from") || (singleDay ? rangeDay() : `${rangeDay().slice(0, 7)}-01`)), to = dateField(request.nextUrl.searchParams.get("to") || (singleDay ? from : rangeDay()))
    return { from, to, window: dateWindow(from, to) }
}

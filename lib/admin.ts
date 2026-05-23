import { NextRequest } from "next/server"

export function isAdminRequest(request: NextRequest) {
    const configuredPin = process.env.ADMIN_PIN
    if (!configuredPin) return false
    return request.headers.get("x-admin-pin") === configuredPin
}

export function adminUnauthorized() {
    return Response.json({ error: "Invalid admin PIN." }, { status: 401 })
}

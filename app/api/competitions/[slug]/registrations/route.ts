import { NextRequest } from "next/server"
import { submitRegistration } from "@/lib/registration-submit"
export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
    return submitRegistration(request, (await context.params).slug)
}

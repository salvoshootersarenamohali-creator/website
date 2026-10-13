import { NextRequest } from "next/server"
import { submitRegistration } from "@/lib/registration-submit"
export async function POST(request: NextRequest) {
    return submitRegistration(request, request.nextUrl.searchParams.get("competition"))
}

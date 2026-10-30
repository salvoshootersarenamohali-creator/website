import { NextRequest } from "next/server"
import { currentActor, login, logout, changePassword, listLocations, staffAction, locationAction } from "@/lib/range/auth"
import { assertSameOrigin, failure, staffOnly } from "@/lib/range/server"
import { RangeError } from "@/lib/range/shared"
import { attendanceList, attendanceChallenge, attendancePunch, attendancePhoto, attendanceCorrect } from "@/lib/range/attendance"
import { correctionsAction, rejectCorrection } from "@/lib/range/corrections"
import { studentsAction, studentAttendance, studentHistory } from "@/lib/range/students"
import { financeList, financeMeta, financePost, financeReceipt, financeSettings, financeVoid } from "@/lib/range/finance"
import { feeList, feePost, feeVoid } from "@/lib/range/fees"
import { transferList, transferPost, transferResolve } from "@/lib/range/transfers"
import { salaryList, salaryPost, salaryVoid } from "@/lib/range/salaries"
import { dashboard } from "@/lib/range/dashboard"
import { reportMeta, reports } from "@/lib/range/reports"
import { deleteMoneyAccount } from "@/lib/range/accounts"
import { studentAccounts, trainingAssignments, trainingRoster } from "@/lib/range/training-management"
import { previewPlans, trainingPlanHistory, trainingPlans } from "@/lib/range/training-plans"
import { trainingAnalytics, trainingReview, trainingSessionHistory, trainingSessions } from "@/lib/range/training-sessions"
import { trainingMedia } from "@/lib/range/training-media"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60
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
        if (path === "training/roster" && request.method === "GET") return await trainingRoster(actor)
        if (path === "training/accounts" && request.method === "POST") return await studentAccounts(request, actor)
        if (path === "training/assignments") return await trainingAssignments(request, actor)
        if (path === "training/plans/preview" && request.method === "POST") return await previewPlans(request, actor)
        if (path === "training/plans/history" && request.method === "GET") return await trainingPlanHistory(request, actor)
        if (path === "training/plans") return await trainingPlans(request, actor)
        if (path === "training/sessions/history" && request.method === "GET") return await trainingSessionHistory(request, actor)
        if (path === "training/sessions") return await trainingSessions(request, actor)
        if (path === "training/reviews" && request.method === "POST") return await trainingReview(request, actor)
        if (path === "training/media") return await trainingMedia(request, actor)
        if (path === "training/analytics" && request.method === "GET") return await trainingAnalytics(request, actor)
        staffOnly(actor)
        if (path === "staff") return await staffAction(request, actor)
        if (path === "locations") return await locationAction(request, actor)
        if (path === "attendance" && request.method === "GET") return await attendanceList(request, actor)
        if (path === "attendance/challenge" && request.method === "POST") return await attendanceChallenge(request, actor)
        if (path === "attendance/punch" && request.method === "POST") return await attendancePunch(request, actor)
        if (path === "attendance/photo" && request.method === "GET") return await attendancePhoto(request, actor)
        if (path === "attendance/correct" && request.method === "POST") return await attendanceCorrect(request, actor)
        if (path === "corrections") return await correctionsAction(request, actor)
        if (path === "corrections/reject" && request.method === "POST") return await rejectCorrection(request, actor)
        if (path === "students") return await studentsAction(request, actor)
        if (path === "students/attendance" && request.method === "POST") return await studentAttendance(request, actor)
        if (path === "students/history" && request.method === "GET") return await studentHistory(request, actor)
        if (path === "finance" && request.method === "GET") return await financeList(request, actor)
        if (path === "finance" && request.method === "POST") return await financePost(request, actor)
        if (path === "finance/meta" && request.method === "GET") return await financeMeta(request, actor)
        if (path === "finance/settings" && request.method === "POST") return await financeSettings(request, actor)
        if (path === "finance/accounts/delete" && request.method === "POST") return await deleteMoneyAccount(request, actor)
        if (path === "finance/correct" && request.method === "POST") return await financePost(request, actor, true)
        if (path === "finance/void" && request.method === "POST") return await financeVoid(request, actor)
        if (path === "finance/receipt" && request.method === "GET") return await financeReceipt(request, actor)
        if (path === "fees" && request.method === "GET") return await feeList(request, actor)
        if (path === "fees" && request.method === "POST") return await feePost(request, actor)
        if (path === "fees/correct" && request.method === "POST") return await feePost(request, actor, true)
        if (path === "fees/void" && request.method === "POST") return await feeVoid(request, actor)
        if (path === "transfers" && request.method === "GET") return await transferList(request, actor)
        if (path === "transfers" && request.method === "POST") return await transferPost(request, actor)
        if (path === "transfers/resolve" && request.method === "POST") return await transferResolve(request, actor)
        if (path === "salaries" && request.method === "GET") return await salaryList(request, actor)
        if (path === "salaries" && request.method === "POST") return await salaryPost(request, actor)
        if (path === "salaries/correct" && request.method === "POST") return await salaryPost(request, actor, true)
        if (path === "salaries/void" && request.method === "POST") return await salaryVoid(request, actor)
        if (path === "dashboard" && request.method === "GET") return await dashboard(request, actor)
        if (path === "reports/meta" && request.method === "GET") return await reportMeta(request, actor)
        if (path === "reports" && request.method === "GET") return await reports(request, actor)
        throw new RangeError("Not found.", 404)
    } catch (error) { return failure(error) }
}

export async function GET(request: NextRequest, context: Context) { const response = await handle(request, context); response.headers.set("Cache-Control", "private, no-store"); return response }
export async function POST(request: NextRequest, context: Context) { const response = await handle(request, context); response.headers.set("Cache-Control", "private, no-store"); return response }

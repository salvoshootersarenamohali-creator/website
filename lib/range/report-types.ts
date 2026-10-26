export const reportLabels = { finance: "Finance ledger", coachAttendance: "Coach attendance", studentAttendance: "Student attendance marks", dailyRoll: "Daily student roll", fees: "Admission and renewal payments", transfers: "Money handovers", salaries: "Salary payments", audit: "Change history" } as const
export type RangeReportType = keyof typeof reportLabels
export type ReportRow = Record<string, string | number>
export type ReportResult = { report: RangeReportType; title: string; from: string; to: string; scope: string; rows: ReportRow[]; total: number; page: number; pageSize: number; summary: Record<string, number>; hint: string }
export const summaryLabels: Record<string, { label: string; money?: boolean }> = { incomePaise: { label: "Income in view", money: true }, expensePaise: { label: "Expenses in view", money: true }, transferNetPaise: { label: "Net transfer movement", money: true }, netPaise: { label: "Net movement in view", money: true }, completedHours: { label: "Completed hours in period" }, present: { label: "Present" }, absent: { label: "Absent" }, leave: { label: "Leave" }, unmarked: { label: "Not marked" }, pending: { label: "Pending" }, confirmed: { label: "Confirmed" }, rejected: { label: "Rejected" }, reversed: { label: "Reversed" } }
export function reportStatuses(type: RangeReportType) {
    if (["finance", "fees", "salaries"].includes(type)) return ["all", "posted", "void"]
    if (type === "coachAttendance") return ["all", "open", "completed"]
    if (["studentAttendance", "dailyRoll"].includes(type)) return ["all", "present", "absent", "leave", "unmarked"]
    if (type === "transfers") return ["all", "pending", "confirmed", "rejected", "reversed"]
    return ["all"]
}

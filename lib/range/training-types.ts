export type TrainingAsset = { id: string; name: string; mimeType: string; bytes: number }
export type TrainingPerson = { id: string; name: string }
export type TrainingStudent = TrainingPerson & {
    trainingVersion: number
    account: { id: string; username: string; active: boolean; mustChangePassword: boolean; version: number } | null
    trainingCoaches: { coachId: string; coach: TrainingPerson & { active: boolean } }[]
}
export type PlanRevision = { id: string; version: number; title: string; instructions: string; author: TrainingPerson; createdAt: string; attachments: TrainingAsset[] }
export type TrainingPlan = { id: string; profileId: string; date: string; version: number; revisions: PlanRevision[] }
export type SessionRevision = {
    id: string; version: number; date: string; discipline: string; label: string; notes: string
    durationMinutes: number | null; shotCount: number | null; score: string | number | null; maximumScore: string | number | null
    planRevision: PlanRevision | null; attachments: TrainingAsset[]; createdAt: string
}
export type TrainingReview = { id: string; coachId: string; version: number; sessionVersion: number; remarks: string; reviewed: boolean; updatedAt: string; coach: TrainingPerson; revisions?: { id: string; version: number; sessionVersion: number; remarks: string; reviewed: boolean; createdAt: string }[] }
export type TrainingSession = { id: string; profileId: string; date: string; discipline: string; version: number; revisions: SessionRevision[]; reviews: TrainingReview[]; reviewStatus: "unreviewed" | "reviewed" | "changed" }
export type TrainingAnalytics = {
    summary: { sessions: number; trainingDays: number; percentage: number | null; durationMinutes: number | null; shotCount: number | null }
    series: { date: string; sessions: number; percentage: number | null; score: number | null; maximumScore: number | null; durationMinutes: number | null; shotCount: number | null }[]
    records: { id: string; date: string; discipline: string; label: string; score: string | number | null; maximumScore: string | number | null; durationMinutes: number | null; shotCount: number | null }[]
}

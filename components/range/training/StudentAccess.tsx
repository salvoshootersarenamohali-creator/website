"use client"
import { TrainingPerson, TrainingStudent } from "@/lib/range/training-types"
import { ActionForm, Field, LoadingState, Panel } from "../shared"
import { TrainingError, useTrainingData, useTrainingMutation } from "./shared"

export function StudentAccess({ student, reload }: { student: TrainingStudent; reload: () => Promise<void> }) {
    const coaches = useTrainingData<{ coaches: TrainingPerson[] }>("training/assignments")
    const submitAccount = useTrainingMutation(), submitAssignments = useTrainingMutation()
    return <div className="training-columns"><Panel title={student.account ? "Student account" : "Create student account"} description={`Access for ${student.name}. Share the temporary password privately.`}><ActionForm key={`${student.id}-${student.account?.version || 0}`} submit={student.account ? "Save account changes" : "Create student account"} onSubmit={async form => {
        const data = new FormData(form)
        await submitAccount("training/accounts", { profileId: student.id, version: student.account?.version || 0, username: data.get("username"), password: data.get("password"), active: data.get("active") === "on" })
        await reload()
    }}><Field label="Unique username"><input name="username" className="field" autoComplete="off" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={32} pattern="[a-zA-Z][a-zA-Z0-9._-]{2,31}" defaultValue={student.account?.username} /></Field><Field label={student.account ? "Reset temporary password (leave blank to keep)" : "Temporary password (12+ characters)"}><input name="password" className="field" type="password" autoComplete="new-password" required={!student.account} minLength={12} maxLength={128} /></Field><label><input name="active" type="checkbox" defaultChecked={student.account?.active ?? true} />Account active</label>{student.account?.mustChangePassword && <p className="range-muted">A password change is required at the next sign-in.</p>}</ActionForm></Panel>
    <Panel title="Assigned coaches" description="Selected coaches can view all training history, edit plans, and review sessions."><TrainingError error={coaches.error} retry={coaches.reload} />{coaches.loading ? <LoadingState /> : <ActionForm key={`${student.id}-${student.trainingVersion}`} submit="Save coach assignments" onSubmit={async form => {
        const data = new FormData(form)
        await submitAssignments("training/assignments", { profileId: student.id, version: student.trainingVersion, coachIds: data.getAll("coachIds") })
        await reload()
    }}><div className="training-checklist">{coaches.data?.coaches.map(coach => <label key={coach.id}><input type="checkbox" name="coachIds" value={coach.id} defaultChecked={student.trainingCoaches.some(link => link.coachId === coach.id)} />{coach.name}</label>)}{!coaches.data?.coaches.length && <p className="range-muted">Create active coaches in Staff & locations first.</p>}</div><p className="range-muted text-sm">Removing a coach also removes their access to past sessions. Previous remarks remain in the diary.</p></ActionForm>}</Panel></div>
}

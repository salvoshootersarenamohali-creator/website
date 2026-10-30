"use client"
import { useState } from "react"
import { RangeActor } from "@/lib/range/shared"
import { TrainingStudent } from "@/lib/range/training-types"
import { Button } from "@/components/ui/button"
import { EmptyState, Field, LoadingState } from "./shared"
import { PlanComposer, PlanList } from "./training/Plans"
import { Diary } from "./training/Diary"
import { TrainingProgress } from "./training/Progress"
import { StudentAccess } from "./training/StudentAccess"
import { TrainingError, useTrainingData } from "./training/shared"

export function Training({ user }: { user: RangeActor }) {
    const roster = useTrainingData<{ students: TrainingStudent[] }>("training/roster")
    const [tab, setTab] = useState("plans"), [selected, setSelected] = useState(""), [planGeneration, setPlanGeneration] = useState(0)
    const students = roster.data?.students || [], student = students.find(student => student.id === selected) || students[0]
    const tabs = [{ key: "plans", label: "Daily plans" }, { key: "diary", label: "Diary & review" }, { key: "progress", label: "Progress" }, ...(user.role === "owner" ? [{ key: "access", label: "Student access" }] : [])]
    return <div className="space-y-5"><nav className="training-tabs" aria-label="Training sections">{tabs.map(item => <Button key={item.key} variant={item.key === tab ? "default" : "outline"} aria-pressed={item.key === tab} onClick={() => setTab(item.key)}>{item.label}</Button>)}</nav><TrainingError error={roster.error} retry={roster.reload} />{roster.loading ? <LoadingState label="Loading training roster…" /> : !students.length ? <EmptyState title={user.role === "owner" ? "Add students to get started" : "No students assigned yet"} description={user.role === "owner" ? "Add student profiles in Students & attendance, then create their accounts and assign coaches here." : "Ask the owner to assign students to you. Their training will then appear here."} /> : <>{tab === "plans" && <PlanComposer key={students.map(student => student.id).join(",")} students={students} onSaved={() => setPlanGeneration(value => value + 1)} />}<div className="training-profile-picker"><Field label={`Student · ${students.length} available`}><select className="field" value={student.id} onChange={event => setSelected(event.target.value)}>{students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}</select></Field><p className="range-muted text-sm">{student.trainingCoaches.filter(link => link.coach.active).map(link => link.coach.name).join(" · ") || "No active coaches assigned"}</p></div>{tab === "plans" && <PlanList key={`${student.id}-${planGeneration}`} profileId={student.id} />}{tab === "diary" && <Diary key={student.id} user={user} profileId={student.id} />}{tab === "progress" && <TrainingProgress key={student.id} profileId={student.id} />}{tab === "access" && user.role === "owner" && <StudentAccess key={student.id} student={student} reload={roster.reload} />}</>}</div>
}

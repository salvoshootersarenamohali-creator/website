"use client"

import * as React from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { formatCurrency, type Discipline, type PaymentMode } from "@/lib/competition"
import { getDisciplineLabel, getTeamEntryFee, getTeamEntryMemberCount, getTeamEntryTypeLabel, normalizeAcademyKey, supportsMixedTeamEntries, type TeamEntryType } from "@/lib/team-entries"
import { toProperCase } from "@/lib/registration-validation"
import { categorySortValue } from "@/lib/results"
import { readResponseJson, scopedAdminPath, paymentModeLabel, type AdminRegistration, type AdminTeamEntry, type PaymentStatus } from "@/lib/admin-desk"

export default function TeamEntriesView({
    registrations,
    teamEntries,
    adminPin,
    competitionSlug,
    teamEntryFee,
    onChanged,
}: {
    registrations: AdminRegistration[]
    teamEntries: AdminTeamEntry[]
    adminPin: string
    competitionSlug: string
    teamEntryFee: number
    onChanged: () => void
}) {
    const [teamName, setTeamName] = React.useState("")
    const [teamType, setTeamType] = React.useState<TeamEntryType>("standard")
    const [discipline, setDiscipline] = React.useState<Discipline>("pistol")
    const [paymentMode, setPaymentMode] = React.useState<PaymentMode>("cash")
    const [paymentStatus, setPaymentStatus] = React.useState<PaymentStatus>("Pending")
    const [memberEntryIds, setMemberEntryIds] = React.useState(["", "", ""])
    const [saving, setSaving] = React.useState(false)
    const [deletingId, setDeletingId] = React.useState("")
    const [error, setError] = React.useState("")
    const [message, setMessage] = React.useState("")
    const mixedTeamsEnabled = supportsMixedTeamEntries(competitionSlug)
    const isMixedTeam = teamType === "mixed"
    const memberCount = getTeamEntryMemberCount(teamType)

    React.useEffect(() => {
        setMemberEntryIds(Array(memberCount).fill(""))
        setError("")
        setMessage("")
    }, [discipline, memberCount])

    React.useEffect(() => {
        if (paymentMode === "upi" && paymentStatus === "Sponsored") {
            setPaymentStatus("Pending")
        }
    }, [paymentMode, paymentStatus])

    const eligibleOptions = React.useMemo(() => {
        return registrations
            .flatMap((registration) =>
                registration.entries
                    .filter((entry) => entry.discipline === discipline)
                    .map((entry) => ({ registration, entry }))
            )
            .sort((a, b) =>
                a.registration.academy.localeCompare(b.registration.academy)
                || a.registration.name.localeCompare(b.registration.name)
                || categorySortValue(a.entry.categoryCode).localeCompare(categorySortValue(b.entry.categoryCode))
            )
    }, [discipline, registrations])

    const selectedOptions = memberEntryIds.map((entryId) => eligibleOptions.find((option) => option.entry.id === entryId) ?? null)
    const selectedRegistrations = selectedOptions.flatMap((option) => option ? [option.registration.id] : [])
    const selectedAcademyKeys = selectedOptions.flatMap((option) => option ? [normalizeAcademyKey(option.registration.academy)] : [])
    const hasAllMembers = selectedOptions.length === memberCount && selectedOptions.every(Boolean)
    const hasUniqueStudents = new Set(selectedRegistrations).size === selectedRegistrations.length
    const hasSameClub = new Set(selectedAcademyKeys).size <= 1
    const hasMixedGenders = selectedOptions.filter((option) => option?.registration.gender === "male").length === 1
        && selectedOptions.filter((option) => option?.registration.gender === "female").length === 1
    const canSubmit = hasAllMembers && hasUniqueStudents && (isMixedTeam ? hasMixedGenders : hasSameClub) && !saving

    const updateMember = (index: number, value: string) => {
        setMemberEntryIds((current) => current.map((entryId, memberIndex) => memberIndex === index ? value : entryId))
        setError("")
        setMessage("")
    }

    const createTeamEntry = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError("")
        setMessage("")
        if (!hasAllMembers) {
            setError(`Select exactly ${memberCount} students for the team.`)
            return
        }
        if (!hasUniqueStudents) {
            setError(`Choose ${memberCount} different students for a team entry.`)
            return
        }
        if (!isMixedTeam && !hasSameClub) {
            setError("All 3 students must be from the same shooting club.")
            return
        }
        if (isMixedTeam && !hasMixedGenders) {
            setError("A mixed team requires one male and one female student.")
            return
        }

        setSaving(true)
        try {
            const members = selectedOptions.map((option) => ({
                registrationId: option?.registration.id,
                registrationEntryId: option?.entry.id,
            }))
            const response = await fetch(scopedAdminPath(competitionSlug, "/team-entries"), {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
                body: JSON.stringify({ name: teamName, teamType, discipline, paymentMode, paymentStatus, members }),
            })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to create team entry.")
            setTeamName("")
            setMemberEntryIds(Array(memberCount).fill(""))
            setPaymentMode("cash")
            setPaymentStatus("Pending")
            setMessage(isMixedTeam ? "Mixed team entry created." : "Team entry created.")
            onChanged()
        } catch (createError) {
            setError(createError instanceof Error ? createError.message : "Unable to create team entry.")
        } finally {
            setSaving(false)
        }
    }

    const deleteTeamEntry = async (teamEntry: AdminTeamEntry) => {
        const confirmed = window.confirm(`Delete ${teamEntry.name}?`)
        if (!confirmed) return

        setDeletingId(teamEntry.id)
        setError("")
        setMessage("")
        try {
            const response = await fetch(scopedAdminPath(competitionSlug, `/team-entries/${teamEntry.id}`), {
                method: "DELETE",
                headers: { "x-admin-pin": adminPin },
            })
            const data = await readResponseJson(response)
            if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to delete team entry.")
            setMessage("Team entry deleted.")
            onChanged()
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "Unable to delete team entry.")
        } finally {
            setDeletingId("")
        }
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-lg border border-white/10 bg-neutral-950 p-5">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-black">Create Team Entry</h2>
                        <p className="mt-1 text-sm text-white/50">
                            {isMixedTeam
                                ? "Select one male and one female student in the same discipline. They can be from different clubs."
                                : "Select 3 students from the same club and same discipline."}
                        </p>
                    </div>
                    <p className="rounded-md border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-2 text-sm font-bold text-[#E5C558]">
                        {formatCurrency(getTeamEntryFee(teamType, teamEntryFee))}
                    </p>
                </div>

                <form onSubmit={createTeamEntry} className="space-y-4">
                    {mixedTeamsEnabled && (
                        <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-white/70">Team Type</span>
                            <select value={teamType} onChange={(event) => setTeamType(event.target.value as TeamEntryType)} className="field">
                                <option value="standard">Standard Team — 3 shooters</option>
                                <option value="mixed">Mixed Team — 1 male + 1 female</option>
                            </select>
                        </label>
                    )}
                    <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-white/70">Team Name</span>
                        <input value={teamName} onChange={(event) => setTeamName(toProperCase(event.target.value))} className="field" placeholder="Optional" />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <label>
                            <span className="mb-2 block text-sm font-semibold text-white/70">Discipline</span>
                            <select value={discipline} onChange={(event) => setDiscipline(event.target.value as Discipline)} className="field">
                                <option value="pistol">Pistol</option>
                                <option value="rifle">Rifle</option>
                            </select>
                        </label>
                        <label>
                            <span className="mb-2 block text-sm font-semibold text-white/70">Payment Mode</span>
                            <select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as PaymentMode)} className="field">
                                <option value="cash">Cash</option>
                                <option value="upi">Online</option>
                            </select>
                        </label>
                        <label>
                            <span className="mb-2 block text-sm font-semibold text-white/70">Payment Status</span>
                            <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)} className="field">
                                <option value="Pending">Pending</option>
                                <option value="Paid">Paid</option>
                                {paymentMode === "cash" && <option value="Sponsored">Sponsored</option>}
                            </select>
                        </label>
                    </div>

                    <div className="space-y-3">
                        {Array.from({ length: memberCount }, (_, index) => (
                            <label key={index} className="block">
                                <span className="mb-2 block text-sm font-semibold text-white/70">{isMixedTeam ? index === 0 ? "Male Shooter" : "Female Shooter" : `Student ${index + 1}`}</span>
                                <select value={memberEntryIds[index]} onChange={(event) => updateMember(index, event.target.value)} className="field">
                                    <option value="">Select registered student</option>
                                    {eligibleOptions.filter(({ registration }) => !isMixedTeam || registration.gender === (index === 0 ? "male" : "female")).map(({ registration, entry }) => (
                                        <option key={`${index}-${entry.id}`} value={entry.id}>
                                            {registration.academy} - {registration.name} - {entry.categoryCode} ({entry.eventTitle})
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ))}
                    </div>

                    {eligibleOptions.length === 0 && (
                        <p className="rounded-md border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                            No registered students with individual {getDisciplineLabel(discipline)} entries yet.
                        </p>
                    )}
                    {!hasUniqueStudents && selectedRegistrations.length > 0 && (
                        <p className="rounded-md border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
                            The same student cannot be selected twice in one team.
                        </p>
                    )}
                    {isMixedTeam && (["male", "female"] as const).map((gender) => !eligibleOptions.some(({ registration }) => registration.gender === gender) && (
                        <p key={gender} className="rounded-md border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                            No registered {gender} students with individual {getDisciplineLabel(discipline)} entries yet.
                        </p>
                    ))}
                    {!isMixedTeam && !hasSameClub && selectedAcademyKeys.length > 1 && (
                        <p className="rounded-md border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
                            Selected students must be from the same shooting club.
                        </p>
                    )}
                    {error && <p className="text-sm text-red-300">{error}</p>}
                    {message && <p className="text-sm text-emerald-200">{message}</p>}

                    <button disabled={!canSubmit} className="admin-button gold disabled:opacity-50">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        {saving ? "Creating..." : isMixedTeam ? "Create Mixed Team Entry" : "Create Team Entry"}
                    </button>
                </form>
            </section>

            <section className="rounded-lg border border-white/10 bg-neutral-950 p-5">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-black">Team Entries</h2>
                        <p className="mt-1 text-sm text-white/50">{teamEntries.length} team{teamEntries.length === 1 ? "" : "s"} entered.</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {teamEntries.length ? teamEntries.map((teamEntry) => (
                        <div key={teamEntry.id} className="rounded-md border border-white/10 bg-black/25 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-lg font-black">{teamEntry.name}</p>
                                    <p className="mt-1 text-sm text-white/55">{teamEntry.academy} | {getDisciplineLabel(teamEntry.discipline)} | {getTeamEntryTypeLabel(teamEntry.teamType)}</p>
                                    <p className="mt-1 text-sm text-[#D4AF37]">{formatCurrency(teamEntry.amount)} ({paymentModeLabel(teamEntry.paymentMode)} - {teamEntry.paymentStatus})</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => deleteTeamEntry(teamEntry)}
                                    disabled={deletingId === teamEntry.id}
                                    className="inline-flex h-10 items-center gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 text-sm font-bold text-red-200 disabled:opacity-60"
                                >
                                    {deletingId === teamEntry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    Delete
                                </button>
                            </div>
                            <div className="mt-4 grid gap-2">
                                {teamEntry.members.map((member, index) => (
                                    <div key={member.id} className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                                        <p className="font-bold">{index + 1}. {member.registration.name}</p>
                                        {teamEntry.teamType === "mixed" && <p className="text-sm text-white/55">{member.registration.gender === "male" ? "Male" : "Female"} | {member.registration.academy}</p>}
                                        <p className="text-sm text-white/55">{member.registrationEntry.categoryCode} - {member.registrationEntry.categoryLabel}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )) : (
                        <p className="rounded-md border border-white/10 bg-white/[0.03] p-6 text-white/50">No team entries yet.</p>
                    )}
                </div>
            </section>
        </div>
    )
}

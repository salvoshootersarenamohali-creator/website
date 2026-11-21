import type { Discipline } from "@/lib/competition"
import { getTeamEntryMemberCount, type TeamEntryType } from "@/lib/team-entries"

type TeamRoster = {
    id: string
    name: string
    academy: string
    discipline: string
    teamType: string
    members: { registrationEntryId: string }[]
}

type MemberResult = {
    id: string
    shooterName: string
    scored: boolean
    totalScore: number | null
    displayTotal: string
}

export type TeamStandingGroup = {
    teamType: TeamEntryType
    discipline: Discipline
    rows: {
        id: string
        name: string
        academy: string
        rank: number | null
        totalScore: number | null
        members: { id: string; name: string; score: string | null }[]
    }[]
}

export function buildTeamStandings(teams: TeamRoster[], results: MemberResult[]): TeamStandingGroup[] {
    const byEntry = new Map(results.map(row => [row.id, row]))
    const groups: TeamStandingGroup[] = []
    for (const teamType of ["standard", "mixed"] as const) {
        for (const discipline of ["pistol", "rifle"] as const) {
            const rows: TeamStandingGroup["rows"] = teams
                .filter(team => team.teamType === teamType && team.discipline === discipline)
                .map(team => {
                    let totalTenths = 0
                    const members = team.members.map(({ registrationEntryId }) => {
                        const row = byEntry.get(registrationEntryId)
                        const member = { id: registrationEntryId, name: row?.shooterName ?? "Unknown member" }
                        if (!row?.scored || typeof row.totalScore !== "number" || !Number.isFinite(row.totalScore)) {
                            return { ...member, score: null }
                        }
                        totalTenths += Math.round(row.totalScore * 10)
                        return { ...member, score: row.displayTotal }
                    })
                    const complete = members.length === getTeamEntryMemberCount(teamType) && members.every(member => member.score !== null)
                    return { id: team.id, name: team.name, academy: team.academy, members, totalScore: complete ? totalTenths / 10 : null, rank: null }
                })
            if (!rows.length) continue
            rows.sort((a, b) => (b.totalScore ?? -1) - (a.totalScore ?? -1) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
            rows.forEach((row, index) => {
                if (row.totalScore === null) return
                const previous = rows[index - 1]
                row.rank = previous?.totalScore === row.totalScore ? previous.rank : index + 1
            })
            groups.push({ teamType, discipline, rows })
        }
    }
    return groups
}

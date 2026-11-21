"use client"

import * as React from "react"
import { FileSpreadsheet, Loader2, Plus, Printer, RefreshCw, X } from "lucide-react"
import type { CompetitionConfig } from "@/lib/competition"
import { MiniCount } from "./MiniCount"
import { readResponseJson, scopedAdminPath, type AdminRegistration } from "@/lib/admin-desk"
import {
    buildDetailSchedule,
    defaultDetailLanes,
    DetailLaneConfig,
    DetailScheduleConfig,
    formatClockLabel,
    formatDisplayDate,
    getLaneType,
    RuleSet,
} from "@/lib/details"

export default function DetailsView({
    registrations,
    adminPin,
    competitionSlug,
    competitionTitle,
    config,
}: {
    registrations: AdminRegistration[]
    adminPin: string
    competitionSlug: string
    competitionTitle: string
    config: CompetitionConfig
}) {
    const firstDate = config.slotOptions[0]?.date ?? new Date().toISOString().slice(0, 10)
    const configuredFirstSightingTimes = config.detailDefaults.firstSightingTimes
    const [selectedDate, setSelectedDate] = React.useState(firstDate)
    const [ruleSetMode, setRuleSetMode] = React.useState<"both" | RuleSet>("both")
    const [lanes, setLanes] = React.useState<DetailLaneConfig>(defaultDetailLanes)
    const [firstSightingTimes, setFirstSightingTimes] = React.useState<Record<RuleSet, string>>(configuredFirstSightingTimes)
    const [generatedConfig, setGeneratedConfig] = React.useState<DetailScheduleConfig>(() => ({
        date: firstDate,
        ruleSets: ["NR", "ISSF"],
        lanes: defaultDetailLanes,
        firstSightingTimes: configuredFirstSightingTimes,
    }))
    const [downloadState, setDownloadState] = React.useState<"idle" | "saving">("idle")
    const [message, setMessage] = React.useState("")

    const selectedRuleSets = React.useMemo<RuleSet[]>(
        () => ruleSetMode === "both" ? ["NR", "ISSF"] : [ruleSetMode],
        [ruleSetMode]
    )
    const schedule = React.useMemo(() => buildDetailSchedule(registrations, generatedConfig), [registrations, generatedConfig])
    const totalDetails = schedule.details.length
    const totalRows = schedule.details.reduce((sum, detail) => sum + detail.rows.length, 0)

    React.useEffect(() => {
        setSelectedDate(firstDate)
        setFirstSightingTimes(configuredFirstSightingTimes)
        setGeneratedConfig((current) => ({
            ...current,
            date: firstDate,
            firstSightingTimes: configuredFirstSightingTimes,
        }))
    }, [firstDate, configuredFirstSightingTimes])

    const updateLane = (laneType: keyof DetailLaneConfig, index: number, value: string) => {
        setLanes((current) => ({
            ...current,
            [laneType]: current[laneType].map((lane, laneIndex) => laneIndex === index ? value : lane),
        }))
    }

    const addLane = (laneType: keyof DetailLaneConfig) => {
        setLanes((current) => {
            const prefix = laneType === "manual" ? "M" : "E"
            return { ...current, [laneType]: [...current[laneType], `${prefix}${current[laneType].length + 1}`] }
        })
    }

    const removeLane = (laneType: keyof DetailLaneConfig, index: number) => {
        setLanes((current) => ({
            ...current,
            [laneType]: current[laneType].filter((_, laneIndex) => laneIndex !== index),
        }))
    }

    const generate = () => {
        setMessage("")
        setGeneratedConfig({
            date: selectedDate,
            ruleSets: selectedRuleSets,
            lanes: {
                manual: [...lanes.manual],
                electronic: [...lanes.electronic],
            },
            firstSightingTimes: { ...firstSightingTimes },
        })
    }

    const downloadDetails = async () => {
        setDownloadState("saving")
        setMessage("")
        try {
            const response = await fetch(scopedAdminPath(competitionSlug, "/details/export"), {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
                body: JSON.stringify(generatedConfig),
            })
            if (!response.ok) {
                const data = await readResponseJson(response)
                throw new Error(typeof data.error === "string" ? data.error : "Detail export failed.")
            }

            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `${competitionSlug}-details-${generatedConfig.date}.xlsx`
            link.click()
            URL.revokeObjectURL(url)
        } catch (downloadError) {
            setMessage(downloadError instanceof Error ? downloadError.message : "Detail export failed.")
        } finally {
            setDownloadState("idle")
        }
    }

    return (
        <div className="space-y-6">
            <section className="no-print rounded-lg border border-white/10 bg-neutral-950 p-5">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black">Detail Sheets</h2>
                        <p className="mt-1 text-sm text-white/50">Generate lane-wise NR and ISSF details from all registered entries for a selected day.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={generate} className="admin-button gold">
                            <RefreshCw className="h-4 w-4" />
                            Generate
                        </button>
                        <button onClick={() => window.print()} disabled={!totalDetails} className="admin-button disabled:opacity-50">
                            <Printer className="h-4 w-4" />
                            Print
                        </button>
                        <button onClick={downloadDetails} disabled={!totalDetails || downloadState === "saving"} className="admin-button disabled:opacity-50">
                            {downloadState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                            Excel
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="grid gap-4 md:grid-cols-3">
                        <label>
                            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/40">Day</span>
                            <select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="field">
                                {config.slotOptions.map((option) => (
                                    <option key={option.date} value={option.date}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/40">Details</span>
                            <select value={ruleSetMode} onChange={(event) => setRuleSetMode(event.target.value as "both" | RuleSet)} className="field">
                                <option value="both">NR + ISSF</option>
                                <option value="NR">NR Manual</option>
                                <option value="ISSF">ISSF Electronic</option>
                            </select>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label>
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/40">NR Sighting</span>
                                <input
                                    value={firstSightingTimes.NR}
                                    onChange={(event) => setFirstSightingTimes((current) => ({ ...current, NR: event.target.value }))}
                                    type="time"
                                    className="field"
                                />
                            </label>
                            <label>
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/40">ISSF Sighting</span>
                                <input
                                    value={firstSightingTimes.ISSF}
                                    onChange={(event) => setFirstSightingTimes((current) => ({ ...current, ISSF: event.target.value }))}
                                    type="time"
                                    className="field"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <MiniCount label="Entries" value={totalRows} />
                        <MiniCount label="Details" value={totalDetails} />
                        <MiniCount label="Date" value={formatDisplayDate(generatedConfig.date)} />
                    </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <LaneEditor
                        title="Manual NR Lanes"
                        laneType="manual"
                        lanes={lanes.manual}
                        onAdd={() => addLane("manual")}
                        onRemove={(index) => removeLane("manual", index)}
                        onUpdate={(index, value) => updateLane("manual", index, value)}
                    />
                    <LaneEditor
                        title="Electronic ISSF Lanes"
                        laneType="electronic"
                        lanes={lanes.electronic}
                        onAdd={() => addLane("electronic")}
                        onRemove={(index) => removeLane("electronic", index)}
                        onUpdate={(index, value) => updateLane("electronic", index, value)}
                    />
                </div>

                {schedule.warnings.length > 0 && (
                    <div className="mt-5 rounded-md border border-amber-400/20 bg-amber-400/[0.07] p-3 text-sm text-amber-100">
                        {schedule.warnings.map((warning) => <p key={warning}>{warning}</p>)}
                    </div>
                )}
                {message && <p className="mt-4 rounded-md border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{message}</p>}
            </section>

            <section className="print-details rounded-lg border border-white/10 bg-white p-4 text-black">
                <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 text-black">
                    <div>
                        <h3 className="text-xl font-black">Preview</h3>
                        <p className="text-sm text-black/55">{totalRows ? `${totalRows} entries across ${totalDetails} details.` : "No entries match the generated settings."}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(["NR", "ISSF"] as RuleSet[]).map((ruleSet) => (
                            <span key={ruleSet} className="rounded-full border border-black/10 px-3 py-1 text-xs font-bold">
                                {ruleSet}: {schedule.totals[ruleSet]} entries
                            </span>
                        ))}
                    </div>
                </div>
                {schedule.details.length ? (
                    <div className="detail-print-stack">
                        {schedule.details.map((detail) => <PrintableDetailSheet key={detail.id} detail={detail} competitionTitle={competitionTitle} />)}
                    </div>
                ) : (
                    <div className="p-8 text-center text-black/55">Generate detail sheets after choosing a date, lanes, and first sighting time.</div>
                )}
            </section>
        </div>
    )
}

function LaneEditor({
    title,
    laneType,
    lanes,
    onAdd,
    onRemove,
    onUpdate,
}: {
    title: string
    laneType: keyof DetailLaneConfig
    lanes: string[]
    onAdd: () => void
    onRemove: (index: number) => void
    onUpdate: (index: number, value: string) => void
}) {
    return (
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <p className="font-bold">{title}</p>
                    <p className="text-sm text-white/45">{lanes.length} configured {laneType} lanes</p>
                </div>
                <button onClick={onAdd} className="admin-button h-10 px-3">
                    <Plus className="h-4 w-4" />
                    Lane
                </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {lanes.map((lane, index) => (
                    <label key={`${laneType}-${index}`} className="grid grid-cols-[1fr_40px] gap-2">
                        <input value={lane} onChange={(event) => onUpdate(index, event.target.value)} className="field px-3 py-2" placeholder={`Lane ${index + 1}`} />
                        <button onClick={() => onRemove(index)} type="button" className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 text-white/70 hover:border-red-300 hover:text-red-200">
                            <X className="h-4 w-4" />
                        </button>
                    </label>
                ))}
            </div>
        </div>
    )
}

function PrintableDetailSheet({ detail, competitionTitle }: { detail: ReturnType<typeof buildDetailSchedule>["details"][number]; competitionTitle: string }) {
    return (
        <article className="detail-sheet">
            <h2>{competitionTitle.toUpperCase()}</h2>
            <div className="detail-meta-grid">
                <p><span>DETAIL NO.</span> {detail.detailNumber} ({detail.ruleSet})</p>
                <p><span>REPORTING TIME:</span> {formatClockLabel(detail.reportingTime)}</p>
                <p><span>DATE:</span> {formatDisplayDate(detail.date)}</p>
                <p><span>SIGHTING TIME:</span> {formatClockLabel(detail.sightingTime)}</p>
                <p><span>LANES:</span> {getLaneType(detail.ruleSet).toUpperCase()}</p>
                <p><span>MATCH TIME:</span> {formatClockLabel(detail.matchTime)}</p>
                {detail.matchEndTime && <p className="detail-meta-end"><span>MATCH END:</span> {formatClockLabel(detail.matchEndTime)}</p>}
            </div>
            <p className="detail-venue">SALVO SHOOTERS ARENA SEC- 86, MOHALI</p>
            <table className="detail-table">
                <thead>
                    <tr>
                        <th>SR. NO.</th>
                        <th>NAME</th>
                        <th>MATCH NO.</th>
                        <th>NAME OF ACADEMY/CLUB</th>
                        <th>LANE NO.</th>
                    </tr>
                </thead>
                <tbody>
                    {detail.rows.map((row) => (
                        <tr key={row.entryId}>
                            <td>{row.serial}</td>
                            <td>{row.name}</td>
                            <td>{row.matchNo}</td>
                            <td>{row.academy}</td>
                            <td>{row.laneNo}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </article>
    )
}

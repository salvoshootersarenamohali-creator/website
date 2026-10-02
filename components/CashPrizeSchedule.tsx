import { CompetitionConfig, formatCurrency } from "@/lib/competition"

type CashPrizeScheduleProps = {
    config: CompetitionConfig
    className?: string
}

function getAssociationLabel(group: CompetitionConfig["cashPrizeGroups"][number], config: CompetitionConfig) {
    if (group.target.type === "team") return "Team event"
    if (group.target.type === "general") return ""

    const eventId = group.target.type === "event" || group.target.type === "categories" ? group.target.eventId : null
    const event = config.events.find((candidate) => candidate.id === eventId)
    if (!event) return ""
    if (group.target.type === "event") return event.title
    return `${event.title} · ${group.target.categoryCodes.join(", ")}`
}

export function CashPrizeSchedule({ config, className = "" }: CashPrizeScheduleProps) {
    if (config.cashPrizeMode !== "custom-groups" || !config.cashPrizeGroups.length) return null

    return (
        <section className={`rounded-lg border border-[#D4AF37]/25 bg-neutral-950 p-5 ${className}`}>
            <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Prize Schedule</p>
                <h2 className="mt-1 text-2xl font-black">{config.cashPrizeTitle}</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {config.cashPrizeGroups.map((group) => {
                    const associationLabel = getAssociationLabel(group, config)
                    return (
                        <article key={group.id} className="overflow-hidden rounded-md border border-white/10 bg-white/[0.035]">
                            <div className="flex min-h-12 items-center justify-between gap-3 bg-[#0b5d1e] px-4 py-3">
                                <h3 className="font-black uppercase tracking-[0.04em] text-white">{group.title}</h3>
                                {group.tag && <span className="rounded bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#0b5d1e]">{group.tag}</span>}
                            </div>
                            {associationLabel && <p className="border-b border-white/10 px-4 py-2 text-xs text-white/45">{associationLabel}</p>}
                            <ol className="grid grid-cols-3" aria-label={`${group.title} cash prizes`}>
                                {group.prizes.map((prize, index) => (
                                    <li key={index} className="border-r border-white/10 px-2 py-4 text-center last:border-r-0">
                                        <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">{["1st", "2nd", "3rd"][index]}</span>
                                        <strong className="mt-2 block text-lg text-[#E5C558]">{formatCurrency(prize)}</strong>
                                    </li>
                                ))}
                            </ol>
                        </article>
                    )
                })}
            </div>

            {config.cashPrizeNote && (
                <p className="mt-4 rounded-md border-l-4 border-[#D4AF37] bg-[#D4AF37]/10 px-4 py-3 text-sm leading-relaxed text-white/75">
                    {config.cashPrizeNote}
                </p>
            )}
        </section>
    )
}

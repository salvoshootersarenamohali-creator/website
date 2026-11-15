import type { BharatCupFinal } from "@/lib/bharat-cup-finals"

export function BharatCupFinalists({ finals }: { finals: BharatCupFinal[] }) {
    return (
        <section className="mb-10" aria-labelledby="finalists-title">
            <h2 id="finalists-title" className="text-2xl font-black">Current Finals Qualifiers</h2>
            <p className="mb-4 mt-1 text-sm text-white/65">
                Updates as scores are posted. Ties go to the higher last series, then the higher second-last series.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
                {finals.map(({ id, title, boys, girls }) => (
                    <section key={id} aria-labelledby={id} className="rounded-lg border border-[#E5C558]/25 bg-white/[0.035] p-4 sm:p-5">
                        <h3 id={id} className="text-lg font-black text-[#E5C558]">{title}</h3>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                            <FinalistList label="Boys" group={boys} />
                            <FinalistList label="Girls" group={girls} />
                        </div>
                    </section>
                ))}
            </div>
        </section>
    )
}

function FinalistList({ label, group: { limit, qualifiers, cutoffTie } }: { label: string; group: BharatCupFinal["boys"] }) {
    const placesLeft = limit - qualifiers.length
    return (
        <div className="min-w-0">
            <h4 className="border-b border-white/10 pb-2 text-sm font-bold">
                {label} <span className="font-normal text-white/60">· {limit} places</span>
            </h4>
            {qualifiers.length > 0 && (
                <ol aria-label={`${label} qualifiers`} className="divide-y divide-white/10">
                    {qualifiers.map(({ id, rank, name, academy, total }) => (
                        <li key={id} value={rank} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-baseline gap-2 py-2 text-sm">
                            <span className="tabular-nums text-white/65">{rank}.</span>
                            <div>
                                <p className="break-words font-semibold">{name}</p>
                                {academy && <p className="break-words text-xs text-white/65">{academy}</p>}
                            </div>
                            <span className="font-bold tabular-nums text-[#E5C558]">{total}</span>
                        </li>
                    ))}
                </ol>
            )}
            {cutoffTie.length > 0 && (
                <p className="mt-2 text-sm text-amber-200">
                    Tie for {placesLeft} remaining {placesLeft === 1 ? "place" : "places"}: {cutoffTie.map(({ name }) => name).join(", ")}.
                </p>
            )}
            {qualifiers.length === 0 && cutoffTie.length === 0 && <p className="mt-2 text-sm text-white/60">No completed scores yet.</p>}
        </div>
    )
}

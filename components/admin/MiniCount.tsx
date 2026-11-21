export function MiniCount({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">{label}</p>
            <p className="mt-1 font-bold">{value}</p>
        </div>
    )
}

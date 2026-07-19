"use client"

// Animated SVG scenes for the 10m Air Rifle technique. Same visual language
// as the pistol scenes: gold-on-black minimal line art.

const GOLD = "hsl(46, 65%, 52%)"
const GOLD_DIM = "hsla(46, 65%, 52%, 0.35)"
const WHITE = "rgba(255,255,255,0.85)"
const GREY = "rgba(255,255,255,0.25)"

const svgProps = {
    viewBox: "0 0 400 480",
    className: "w-full h-full",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
} as const

/* ------------------------------------------------------------------ */
/* 01 — THE STANCE                                                     */
/* ------------------------------------------------------------------ */
export function RifleStance() {
    return (
        <svg {...svgProps} aria-label="Rifle stance animation">
            {/* target */}
            <g opacity="0.5">
                <circle cx="368" cy="140" r="14" stroke={GREY} strokeWidth="2" />
                <circle cx="368" cy="140" r="7" stroke={GREY} strokeWidth="2" />
                <circle cx="368" cy="140" r="1.5" fill={GOLD} />
            </g>
            {/* ground */}
            <line x1="50" y1="400" x2="350" y2="400" stroke={GREY} strokeWidth="2" />

            {/* figure — classic standing rifle position, slight back-lean */}
            <g className="ta-sway" style={{ transformOrigin: "180px 400px" }}>
                {/* head */}
                <circle cx="196" cy="106" r="19" stroke={WHITE} strokeWidth="3" />
                {/* torso with back-lean (hip pushed toward target) */}
                <path d="M192 125 L176 252" stroke={WHITE} strokeWidth="3" strokeLinecap="round" />
                {/* rifle line — held up, supported */}
                <path d="M150 158 L320 138" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
                {/* support arm — elbow propped on hip, forearm vertical under rifle */}
                <path d="M188 145 L170 205 L194 162" stroke={WHITE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {/* trigger arm — out to the grip */}
                <path d="M196 140 L240 178 L250 150" stroke={WHITE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {/* legs */}
                <path d="M176 252 L150 396" stroke={WHITE} strokeWidth="3" strokeLinecap="round" />
                <path d="M176 252 L212 396" stroke={WHITE} strokeWidth="3" strokeLinecap="round" />
                {/* feet */}
                <path d="M150 398 L134 398" stroke={WHITE} strokeWidth="4" strokeLinecap="round" />
                <path d="M212 398 L228 398" stroke={WHITE} strokeWidth="4" strokeLinecap="round" />
            </g>

            {/* hip-to-target arrow */}
            <g className="ta-fade-in-late" stroke={GOLD} strokeWidth="1.5">
                <line x1="196" y1="252" x2="260" y2="252" strokeDasharray="4 5" />
                <path d="M252 246 L260 252 L252 258" />
            </g>
            <text x="268" y="256" fill={GOLD} fontSize="10" letterSpacing="1.5" className="ta-fade-in-late">HIP → TARGET</text>

            {/* zero point marker */}
            <g className="ta-pulse-soft">
                <circle cx="181" cy="400" r="6" stroke={GOLD} strokeWidth="2" />
            </g>
            <text x="180" y="452" textAnchor="middle" fill={GOLD} fontSize="11" letterSpacing="2" className="ta-fade-in-late">
                FIND YOUR ZERO POINT
            </text>
        </svg>
    )
}

/* ------------------------------------------------------------------ */
/* 02 — BUTTPLATE POSITION                                             */
/* ------------------------------------------------------------------ */
export function RiflePosition() {
    return (
        <svg {...svgProps} aria-label="Buttplate position animation">
            {/* shoulder / upper torso close-up */}
            <g stroke={WHITE} strokeWidth="3" strokeLinecap="round">
                {/* head + neck */}
                <circle cx="150" cy="110" r="26" stroke={WHITE} strokeWidth="3" fill="none" />
                <path d="M150 136 L148 170" />
                {/* shoulder slope */}
                <path d="M148 170 C180 176 210 196 226 232" fill="none" />
                {/* chest line */}
                <path d="M148 170 L140 330" />
            </g>

            {/* shoulder pocket highlight */}
            <g className="ta-ring-pulse" style={{ transformOrigin: "218px 218px" }}>
                <circle cx="218" cy="218" r="18" stroke={GOLD} strokeWidth="2" />
            </g>

            {/* rifle butt — slides into the pocket */}
            <g className="ta-seat">
                <g stroke={GOLD} strokeWidth="3" strokeLinejoin="round">
                    {/* buttplate */}
                    <path d="M238 186 C228 206 228 234 238 254" fill="none" strokeWidth="5" />
                    {/* stock */}
                    <path d="M238 186 L330 176 L360 190 L360 214 L336 240 L238 254" fill="none" />
                    {/* cheekpiece hint */}
                    <path d="M262 182 L318 177" strokeWidth="4" />
                </g>
            </g>

            {/* HIGH placement arrow */}
            <g className="ta-fade-in-late" stroke={GOLD} strokeWidth="1.5">
                <line x1="286" y1="300" x2="286" y2="248" />
                <path d="M280 256 L286 248 L292 256" />
            </g>
            <text x="286" y="322" textAnchor="middle" fill={GOLD} fontSize="10" letterSpacing="1.5" className="ta-fade-in-late">SEAT HIGH</text>

            {/* head-up posture guide */}
            <g className="ta-fade-in-late">
                <line x1="150" y1="70" x2="150" y2="40" stroke={GOLD_DIM} strokeWidth="1.5" strokeDasharray="4 5" />
                <text x="162" y="52" fill={GOLD} fontSize="10" letterSpacing="1.5">HEAD UP</text>
            </g>

            <text x="200" y="440" textAnchor="middle" fill={GOLD} fontSize="11" letterSpacing="2">
                HIGH IN THE SHOULDER POCKET
            </text>
        </svg>
    )
}

/* ------------------------------------------------------------------ */
/* 03 — CHEEK WELD                                                     */
/* ------------------------------------------------------------------ */
export function RifleCheek() {
    return (
        <svg {...svgProps} aria-label="Cheek weld animation">
            {/* rifle stock + cheekpiece (static) */}
            <g stroke={WHITE} strokeWidth="3" strokeLinejoin="round">
                <path d="M40 260 L250 250 L330 258 L330 286 L254 306 L40 288 Z" />
                {/* cheekpiece riser */}
                <path d="M120 250 L226 246 L232 252 L124 258 Z" stroke={GOLD} strokeWidth="3" />
                {/* rear aperture sight */}
                <circle cx="66" cy="236" r="12" stroke={WHITE} strokeWidth="3" />
                <circle cx="66" cy="236" r="4" stroke={GOLD} strokeWidth="2" />
            </g>

            {/* head — lowers onto the cheekpiece */}
            <g className="ta-cheek-lower">
                <circle cx="176" cy="204" r="42" stroke={WHITE} strokeWidth="3" />
                {/* eye */}
                <circle cx="150" cy="194" r="4" fill={GOLD} />
            </g>

            {/* contact pulse where cheek meets cheekpiece */}
            <g className="ta-ring-pulse-late" style={{ transformOrigin: "176px 248px" }}>
                <circle cx="176" cy="248" r="14" stroke={GOLD} strokeWidth="2" />
            </g>

            {/* eye-to-sight alignment line draws in once welded */}
            <line
                x1="146" y1="200" x2="66" y2="236"
                stroke={GOLD} strokeWidth="1.5" strokeDasharray="5 6"
                pathLength={100}
                className="ta-draw-late"
            />
            {/* sight line continues to target */}
            <g className="ta-fade-in-late">
                <line x1="54" y1="242" x2="24" y2="256" stroke={GOLD_DIM} strokeWidth="1.5" strokeDasharray="5 6" />
            </g>

            <text x="200" y="400" textAnchor="middle" fill={GOLD} fontSize="11" letterSpacing="2">
                EYE ALIGNS NATURALLY
            </text>
            <text x="200" y="422" textAnchor="middle" fill={GREY} fontSize="10" letterSpacing="1.5">
                SAME SPOT, EVERY SHOT
            </text>
        </svg>
    )
}

/* ------------------------------------------------------------------ */
/* 04 — RELAXATION                                                     */
/* ------------------------------------------------------------------ */
export function RifleRelax() {
    return (
        <svg {...svgProps} aria-label="Relaxation animation">
            {/* ground */}
            <line x1="50" y1="410" x2="350" y2="410" stroke={GREY} strokeWidth="2" />

            {/* figure holding rifle */}
            <g>
                <circle cx="196" cy="120" r="19" stroke={WHITE} strokeWidth="3" />
                <path d="M192 139 L178 262" stroke={WHITE} strokeWidth="3" strokeLinecap="round" />
                <path d="M178 262 L152 406" stroke={WHITE} strokeWidth="3" strokeLinecap="round" />
                <path d="M178 262 L212 406" stroke={WHITE} strokeWidth="3" strokeLinecap="round" />
                <path d="M190 160 L170 208 L174 172" stroke={WHITE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {/* rifle — settles from wobble to still */}
            <g className="ta-settle-damp" style={{ transformOrigin: "170px 168px" }}>
                <path d="M152 172 L330 148" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
            </g>

            {/* tension marks around the shoulders — fade away */}
            <g className="ta-tension-fade" stroke={GOLD} strokeWidth="2" strokeLinecap="round">
                <path d="M166 132 L154 120" />
                <path d="M160 152 L144 148" />
                <path d="M224 130 L234 118" />
                <path d="M228 150 L242 146" />
            </g>

            {/* exhale — breath circle shrinking */}
            <circle
                cx="196" cy="200" r="20"
                stroke={GOLD_DIM} strokeWidth="2"
                className="ta-exhale"
                style={{ transformOrigin: "196px 200px" }}
            />

            {/* skeleton support note */}
            <line x1="196" y1="100" x2="182" y2="408" stroke={GOLD_DIM} strokeWidth="1.5" strokeDasharray="5 7" className="ta-fade-in-late" />

            <text x="200" y="448" textAnchor="middle" fill={GOLD} fontSize="11" letterSpacing="2">
                EXHALE — LET IT SETTLE
            </text>
            <text x="200" y="468" textAnchor="middle" fill={GREY} fontSize="10" letterSpacing="1.5">
                BONES, NOT MUSCLE
            </text>
        </svg>
    )
}

/* ------------------------------------------------------------------ */
/* 05 — TRIGGER CONTROL                                                */
/* ------------------------------------------------------------------ */
export function RifleTrigger() {
    return (
        <svg {...svgProps} aria-label="Rifle trigger control animation">
            {/* aperture sight picture — ring front sight with target centred */}
            <g className="ta-micro-hold" style={{ transformOrigin: "200px 190px" }}>
                {/* outer aperture */}
                <circle cx="200" cy="190" r="96" stroke={WHITE} strokeWidth="8" />
                {/* front ring element */}
                <circle cx="200" cy="190" r="44" stroke={GOLD} strokeWidth="3" />
                {/* target dot */}
                <circle cx="200" cy="190" r="16" fill={WHITE} opacity="0.9" />
            </g>

            {/* shot-break flash ring */}
            <g className="ta-shot-flash" style={{ transformOrigin: "200px 190px" }}>
                <circle cx="200" cy="190" r="60" stroke={GOLD} strokeWidth="2.5" />
            </g>

            {/* concentric alignment guides */}
            <g className="ta-pulse-soft">
                <path d="M200 82 L200 66" stroke={GOLD_DIM} strokeWidth="2" />
                <path d="M200 298 L200 314" stroke={GOLD_DIM} strokeWidth="2" />
                <path d="M92 190 L76 190" stroke={GOLD_DIM} strokeWidth="2" />
                <path d="M308 190 L324 190" stroke={GOLD_DIM} strokeWidth="2" />
            </g>

            {/* pressure bar */}
            <g>
                <rect x="70" y="366" width="260" height="10" rx="5" stroke={GREY} strokeWidth="1.5" />
                <rect x="72" y="368" width="256" height="6" rx="3" fill={GOLD} className="ta-pressure" style={{ transformOrigin: "72px 371px" }} />
                <text x="70" y="354" fill={WHITE} fontSize="10" letterSpacing="2">PRESSURE</text>
                <text x="330" y="354" textAnchor="end" fill={GOLD} fontSize="10" letterSpacing="2" className="ta-shot-flash">BREAK</text>
            </g>

            <text x="200" y="430" textAnchor="middle" fill={GOLD} fontSize="11" letterSpacing="2">
                SQUEEZE — KEEP THE PICTURE
            </text>
        </svg>
    )
}

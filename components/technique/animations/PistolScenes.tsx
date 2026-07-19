"use client"

// Minimalist diagrammatic SVG animation scenes for the 10m Air Pistol technique.
// Gold-on-black line art matching the site theme. Animations are pure CSS keyframes
// (defined in animations.css) so they restart cleanly whenever a scene mounts.

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
export function PistolStance() {
    return (
        <svg {...svgProps} aria-label="Stance animation">
            {/* target far right */}
            <g opacity="0.5">
                <circle cx="368" cy="150" r="14" stroke={GREY} strokeWidth="2" />
                <circle cx="368" cy="150" r="7" stroke={GREY} strokeWidth="2" />
                <circle cx="368" cy="150" r="1.5" fill={GOLD} />
            </g>
            {/* ground */}
            <line x1="60" y1="400" x2="340" y2="400" stroke={GREY} strokeWidth="2" />

            {/* swaying figure that settles into balance */}
            <g className="ta-sway" style={{ transformOrigin: "180px 400px" }}>
                {/* head (side profile, facing target) */}
                <circle cx="184" cy="112" r="20" stroke={WHITE} strokeWidth="3" />
                {/* torso */}
                <path d="M181 132 L177 250" stroke={WHITE} strokeWidth="3" strokeLinecap="round" />
                {/* relaxed arm down at side */}
                <path d="M180 160 L186 235" stroke={WHITE} strokeWidth="3" strokeLinecap="round" />
                {/* legs — shoulder width apart */}
                <path d="M177 250 L152 396" stroke={WHITE} strokeWidth="3" strokeLinecap="round" />
                <path d="M177 250 L208 396" stroke={WHITE} strokeWidth="3" strokeLinecap="round" />
                {/* feet */}
                <path d="M152 398 L136 398" stroke={WHITE} strokeWidth="4" strokeLinecap="round" />
                <path d="M208 398 L224 398" stroke={WHITE} strokeWidth="4" strokeLinecap="round" />
            </g>

            {/* centre-of-gravity line */}
            <line
                x1="180" y1="90" x2="180" y2="400"
                stroke={GOLD_DIM} strokeWidth="1.5" strokeDasharray="5 7"
                className="ta-fade-in-late"
            />

            {/* shoulder-width markers under feet */}
            <g className="ta-pulse-soft">
                <circle cx="146" cy="400" r="6" stroke={GOLD} strokeWidth="2" />
                <circle cx="214" cy="400" r="6" stroke={GOLD} strokeWidth="2" />
            </g>
            {/* width arrows */}
            <g stroke={GOLD} strokeWidth="1.5" className="ta-fade-in-late">
                <line x1="152" y1="428" x2="208" y2="428" />
                <path d="M158 424 L152 428 L158 432" />
                <path d="M202 424 L208 428 L202 432" />
            </g>
            <text x="180" y="452" textAnchor="middle" fill={GOLD} fontSize="11" letterSpacing="2" className="ta-fade-in-late" style={{ textTransform: "uppercase" }}>
                Shoulder width
            </text>
        </svg>
    )
}

/* ------------------------------------------------------------------ */
/* 02 — THE GRIP                                                       */
/* ------------------------------------------------------------------ */
export function PistolGrip() {
    return (
        <svg {...svgProps} aria-label="Grip animation">
            {/* pistol — side profile, muzzle right */}
            <g stroke={WHITE} strokeWidth="3" strokeLinejoin="round">
                {/* slide */}
                <path d="M70 150 L330 150 L330 190 L160 190 L70 190 Z" />
                {/* front + rear sights */}
                <path d="M306 150 L306 140 L314 140 L314 150" />
                <path d="M84 150 L84 140 L94 140 L94 150" />
                {/* grip (angled back-left) */}
                <path d="M160 190 L225 190 L180 320 L115 320 Z" />
                {/* trigger guard */}
                <path d="M228 194 C224 240 272 246 285 202" fill="none" />
                {/* trigger */}
                <path d="M255 198 L248 222" strokeWidth="3" />
            </g>

            {/* hand wrapping the grip — squeezes gently */}
            <g className="ta-squeeze" style={{ transformOrigin: "170px 260px" }}>
                {/* palm along the backstrap */}
                <path d="M148 214 C122 244 116 282 128 306" stroke={GOLD} strokeWidth="4" strokeLinecap="round" opacity="0.6" />
                {/* three wrapping fingers across the front strap */}
                <path d="M150 235 L218 235" stroke={GOLD} strokeWidth="9" strokeLinecap="round" />
                <path d="M140 262 L208 262" stroke={GOLD} strokeWidth="9" strokeLinecap="round" />
                <path d="M130 289 L198 289" stroke={GOLD} strokeWidth="9" strokeLinecap="round" />
                {/* thumb resting along the frame */}
                <path d="M168 202 L224 202" stroke={GOLD} strokeWidth="7" strokeLinecap="round" opacity="0.85" />
            </g>

            {/* web-of-hand marker, high on the backstrap */}
            <g className="ta-ring-pulse" style={{ transformOrigin: "155px 196px" }}>
                <circle cx="155" cy="196" r="12" stroke={GOLD} strokeWidth="2" />
            </g>
            <g className="ta-fade-in-late">
                <line x1="110" y1="128" x2="150" y2="186" stroke={GOLD_DIM} strokeWidth="1.5" />
                <text x="46" y="108" fill={GOLD} fontSize="11" letterSpacing="1.5">HIGH ON</text>
                <text x="46" y="122" fill={GOLD} fontSize="11" letterSpacing="1.5">BACKSTRAP</text>
            </g>

            {/* pressure gauge — firm, not tight */}
            <g>
                <path d="M120 420 A80 80 0 0 1 280 420" stroke={GREY} strokeWidth="6" strokeLinecap="round" />
                <path
                    d="M120 420 A80 80 0 0 1 280 420"
                    stroke={GOLD} strokeWidth="6" strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray="100"
                    className="ta-gauge"
                />
                <text x="200" y="416" textAnchor="middle" fill={WHITE} fontSize="12" letterSpacing="2">FIRM</text>
                <text x="200" y="434" textAnchor="middle" fill={GREY} fontSize="10" letterSpacing="2">NOT TIGHT</text>
            </g>
        </svg>
    )
}

/* ------------------------------------------------------------------ */
/* 03 — THE LIFT                                                       */
/* ------------------------------------------------------------------ */
export function PistolLift() {
    return (
        <svg {...svgProps} aria-label="Lift animation">
            {/* target */}
            <g opacity="0.7">
                <circle cx="360" cy="170" r="16" stroke={GREY} strokeWidth="2" />
                <circle cx="360" cy="170" r="8" stroke={GREY} strokeWidth="2" />
                <circle cx="360" cy="170" r="2" fill={GOLD} />
            </g>
            {/* ground */}
            <line x1="50" y1="420" x2="350" y2="420" stroke={GREY} strokeWidth="2" />

            {/* body */}
            <circle cx="132" cy="150" r="20" stroke={WHITE} strokeWidth="3" />
            <path d="M129 170 L125 290" stroke={WHITE} strokeWidth="3" strokeLinecap="round" />
            <path d="M125 290 L104 416" stroke={WHITE} strokeWidth="3" strokeLinecap="round" />
            <path d="M125 290 L150 416" stroke={WHITE} strokeWidth="3" strokeLinecap="round" />

            {/* chest expands on inhale */}
            <circle cx="128" cy="215" r="16" stroke={GOLD_DIM} strokeWidth="2" className="ta-inhale" style={{ transformOrigin: "128px 215px" }} />

            {/* sweep arc (dashed guide) */}
            <path d="M232 300 A105 105 0 0 0 236 176" stroke={GOLD_DIM} strokeWidth="1.5" strokeDasharray="4 6" />
            <path d="M231 182 L236 174 L241 183" stroke={GOLD_DIM} strokeWidth="1.5" />

            {/* lifting arm with pistol — pivots at shoulder */}
            <g className="ta-lift" style={{ transformOrigin: "130px 182px" }}>
                {/* arm */}
                <path d="M130 182 L238 182" stroke={WHITE} strokeWidth="3" strokeLinecap="round" />
                {/* pistol at hand */}
                <g stroke={GOLD} strokeWidth="3" strokeLinejoin="round">
                    <path d="M238 172 L286 172 L286 184 L252 184 L248 196 L238 192 Z" />
                </g>
            </g>

            <text x="200" y="456" textAnchor="middle" fill={GOLD} fontSize="11" letterSpacing="2">
                LIFT SMOOTHLY — INHALE
            </text>
        </svg>
    )
}

/* ------------------------------------------------------------------ */
/* 04 — BREATH CONTROL                                                 */
/* ------------------------------------------------------------------ */
export function PistolBreath() {
    return (
        <svg {...svgProps} aria-label="Breath control animation">
            {/* breathing circle */}
            <circle cx="200" cy="160" r="58" stroke={GOLD_DIM} strokeWidth="1.5" />
            <circle
                cx="200" cy="160" r="44"
                stroke={GOLD} strokeWidth="3"
                className="ta-breathe"
                style={{ transformOrigin: "200px 160px" }}
            />

            {/* breathing waveform: inhale, half exhale, hold */}
            <g transform="translate(0, 40)">
                <line x1="50" y1="340" x2="350" y2="340" stroke={GREY} strokeWidth="1.5" />
                {/* hold zone */}
                <rect x="240" y="286" width="110" height="28" rx="4" fill="hsla(46, 65%, 52%, 0.08)" stroke={GOLD_DIM} strokeWidth="1" strokeDasharray="3 4" />
                <path
                    d="M50 340 C90 340 100 250 130 250 C160 250 170 300 220 300 L350 300"
                    stroke={GOLD} strokeWidth="3" strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray="100"
                    className="ta-draw-loop"
                />
                {/* labels */}
                <text x="105" y="238" textAnchor="middle" fill={WHITE} fontSize="10" letterSpacing="1.5">INHALE</text>
                <text x="185" y="326" textAnchor="middle" fill={WHITE} fontSize="10" letterSpacing="1.5">EXHALE ½</text>
                <text x="295" y="280" textAnchor="middle" fill={GOLD} fontSize="10" letterSpacing="1.5">HOLD &amp; AIM</text>
            </g>
        </svg>
    )
}

/* ------------------------------------------------------------------ */
/* 05 — SIGHT ALIGNMENT                                                */
/* ------------------------------------------------------------------ */
export function PistolAim() {
    return (
        <svg {...svgProps} aria-label="Sight alignment animation">
            {/* target — drifts out of focus (focus belongs on the front sight) */}
            <g className="ta-defocus">
                <circle cx="200" cy="150" r="52" stroke={WHITE} strokeWidth="2.5" />
                <circle cx="200" cy="150" r="34" stroke={WHITE} strokeWidth="2.5" />
                <circle cx="200" cy="150" r="16" fill={WHITE} opacity="0.9" />
            </g>

            {/* rear sight posts */}
            <rect x="60" y="300" width="88" height="120" fill="#0a0a0a" stroke={WHITE} strokeWidth="2.5" />
            <rect x="252" y="300" width="88" height="120" fill="#0a0a0a" stroke={WHITE} strokeWidth="2.5" />

            {/* front sight post — settles into centre */}
            <g className="ta-settle">
                <rect x="178" y="268" width="44" height="152" fill="#111" stroke={GOLD} strokeWidth="3" />
            </g>

            {/* equal light gaps */}
            <g className="ta-pulse-soft">
                <path d="M154 388 L172 388" stroke={GOLD} strokeWidth="2" />
                <path d="M228 388 L246 388" stroke={GOLD} strokeWidth="2" />
            </g>

            <text x="200" y="452" textAnchor="middle" fill={GOLD} fontSize="11" letterSpacing="2">
                FOCUS ON THE FRONT SIGHT
            </text>
        </svg>
    )
}

/* ------------------------------------------------------------------ */
/* 06 — TRIGGER SQUEEZE                                                */
/* ------------------------------------------------------------------ */
export function PistolTrigger() {
    return (
        <svg {...svgProps} aria-label="Trigger squeeze animation">
            {/* frame + trigger guard close-up (muzzle left, shooter right) */}
            <g stroke={WHITE} strokeWidth="3" strokeLinejoin="round">
                <path d="M60 120 L340 120 L340 168 L232 168 L220 180 L60 168 Z" />
                <path d="M205 180 C182 258 258 274 288 226" fill="none" />
            </g>

            {/* trigger blade — eases straight back */}
            <g className="ta-trigger-pull">
                <path d="M230 184 C227 200 223 212 218 224" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
            </g>

            {/* finger — enters the guard from the right, follows the trigger */}
            <g className="ta-trigger-pull">
                <path d="M330 258 C292 248 258 230 234 204" stroke={WHITE} strokeWidth="9" strokeLinecap="round" />
            </g>

            {/* straight-back direction arrow (rearward = right) */}
            <g stroke={GOLD_DIM} strokeWidth="1.5" className="ta-fade-in-late">
                <line x1="250" y1="296" x2="310" y2="296" />
                <path d="M302 290 L310 296 L302 302" />
                <text x="280" y="320" textAnchor="middle" fill={GOLD} fontSize="10" letterSpacing="1.5">STRAIGHT BACK</text>
            </g>

            {/* shot-break flash */}
            <g className="ta-shot-flash" style={{ transformOrigin: "52px 144px" }}>
                <path d="M52 132 L28 144 L52 156 M46 128 L34 116 M46 160 L34 172" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
            </g>

            {/* pressure bar */}
            <g>
                <rect x="70" y="356" width="260" height="10" rx="5" stroke={GREY} strokeWidth="1.5" />
                <rect x="72" y="358" width="256" height="6" rx="3" fill={GOLD} className="ta-pressure" style={{ transformOrigin: "72px 361px" }} />
                <text x="70" y="344" fill={WHITE} fontSize="10" letterSpacing="2">PRESSURE</text>
                <text x="330" y="344" textAnchor="end" fill={GOLD} fontSize="10" letterSpacing="2" className="ta-shot-flash">BREAK</text>
            </g>

            <text x="200" y="420" textAnchor="middle" fill={GOLD} fontSize="11" letterSpacing="2">
                SMOOTH INCREASING PRESSURE
            </text>
        </svg>
    )
}

/* ------------------------------------------------------------------ */
/* 07 — FOLLOW THROUGH                                                 */
/* ------------------------------------------------------------------ */
export function PistolFollow() {
    return (
        <svg {...svgProps} aria-label="Follow through animation">
            {/* steady sight picture stays after the shot */}
            <g opacity="0.85">
                <circle cx="200" cy="180" r="60" stroke={GREY} strokeWidth="2" />
                <circle cx="200" cy="180" r="38" stroke={GREY} strokeWidth="2" />
                <circle cx="200" cy="180" r="14" fill={WHITE} opacity="0.85" />
            </g>

            {/* shot flash at start of loop */}
            <g className="ta-shot-flash" style={{ transformOrigin: "200px 180px" }}>
                <circle cx="200" cy="180" r="26" stroke={GOLD} strokeWidth="3" />
            </g>
            {/* shot hole appears */}
            <circle cx="205" cy="172" r="5" fill={GOLD} className="ta-appear" />

            {/* sights remain aligned — held steady */}
            <g className="ta-micro-hold" style={{ transformOrigin: "200px 300px" }}>
                <rect x="96" y="288" width="60" height="70" fill="#0a0a0a" stroke={WHITE} strokeWidth="2.5" />
                <rect x="244" y="288" width="60" height="70" fill="#0a0a0a" stroke={WHITE} strokeWidth="2.5" />
                <rect x="178" y="270" width="44" height="88" fill="#111" stroke={GOLD} strokeWidth="3" />
            </g>

            {/* one-second hold timer ring */}
            <g transform="translate(0, 6)">
                <circle cx="200" cy="424" r="22" stroke={GREY} strokeWidth="3" />
                <circle
                    cx="200" cy="424" r="22"
                    stroke={GOLD} strokeWidth="3" strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray="100"
                    transform="rotate(-90 200 424)"
                    className="ta-timer"
                />
                <text x="200" y="429" textAnchor="middle" fill={WHITE} fontSize="12">1s</text>
            </g>
            <text x="200" y="472" textAnchor="middle" fill={GOLD} fontSize="11" letterSpacing="2">
                HOLD AFTER THE SHOT
            </text>
        </svg>
    )
}

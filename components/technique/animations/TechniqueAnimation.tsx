"use client"

import {
    PistolStance, PistolGrip, PistolLift, PistolBreath,
    PistolAim, PistolTrigger, PistolFollow,
} from "./PistolScenes"
import {
    RifleStance, RiflePosition, RifleCheek, RifleRelax, RifleTrigger,
} from "./RifleScenes"

const SCENES: Record<string, () => React.JSX.Element> = {
    // 10m Air Pistol
    "10m-air-pistol/stance": PistolStance,
    "10m-air-pistol/grip": PistolGrip,
    "10m-air-pistol/lift": PistolLift,
    "10m-air-pistol/breath": PistolBreath,
    "10m-air-pistol/aim warning": PistolAim,
    "10m-air-pistol/trigger": PistolTrigger,
    "10m-air-pistol/follow-through": PistolFollow,
    // 10m Air Rifle
    "10m-air-rifle/stance": RifleStance,
    "10m-air-rifle/position": RiflePosition,
    "10m-air-rifle/cheek": RifleCheek,
    "10m-air-rifle/relax": RifleRelax,
    "10m-air-rifle/trigger": RifleTrigger,
}

interface TechniqueAnimationProps {
    slug: string
    stepId: string
}

export function TechniqueAnimation({ slug, stepId }: TechniqueAnimationProps) {
    const Scene = SCENES[`${slug}/${stepId}`]

    if (!Scene) {
        return (
            <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs uppercase tracking-widest">
                Animation coming soon
            </div>
        )
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
            <Scene />
        </>
    )
}

/* Shared keyframes for every scene. Classes are prefixed "ta-" (technique animation). */
const KEYFRAMES = `
@keyframes ta-sway-kf {
  0% { transform: rotate(1.6deg); }
  25% { transform: rotate(-1.2deg); }
  50% { transform: rotate(0.7deg); }
  70% { transform: rotate(-0.3deg); }
  85%, 100% { transform: rotate(0deg); }
}
.ta-sway { animation: ta-sway-kf 5s ease-in-out infinite; }

@keyframes ta-fade-in-late-kf {
  0%, 35% { opacity: 0; }
  55%, 100% { opacity: 1; }
}
.ta-fade-in-late { animation: ta-fade-in-late-kf 5s ease both infinite; }
.ta-draw-late { animation: ta-fade-in-late-kf 5s ease both infinite; }

@keyframes ta-pulse-soft-kf {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}
.ta-pulse-soft { animation: ta-pulse-soft-kf 2.4s ease-in-out infinite; }

@keyframes ta-ring-pulse-kf {
  0% { transform: scale(0.6); opacity: 0; }
  35% { opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}
.ta-ring-pulse { animation: ta-ring-pulse-kf 2.2s ease-out infinite; }
.ta-ring-pulse-late { animation: ta-ring-pulse-kf 2.2s ease-out 1.4s infinite both; opacity: 0; }

@keyframes ta-squeeze-kf {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.97); }
}
.ta-squeeze { animation: ta-squeeze-kf 2.6s ease-in-out infinite; }

@keyframes ta-gauge-kf {
  0% { stroke-dashoffset: 100; }
  45%, 85% { stroke-dashoffset: 35; }
  100% { stroke-dashoffset: 100; }
}
.ta-gauge { animation: ta-gauge-kf 5s ease-in-out infinite; }

@keyframes ta-lift-kf {
  0%, 8% { transform: rotate(42deg); }
  45%, 88% { transform: rotate(0deg); }
  100% { transform: rotate(42deg); }
}
.ta-lift { animation: ta-lift-kf 5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }

@keyframes ta-inhale-kf {
  0%, 8% { transform: scale(1); opacity: 0.4; }
  45%, 88% { transform: scale(1.35); opacity: 1; }
  100% { transform: scale(1); opacity: 0.4; }
}
.ta-inhale { animation: ta-inhale-kf 5s ease-in-out infinite; }

@keyframes ta-breathe-kf {
  0% { transform: scale(1); }
  30% { transform: scale(1.28); }
  50% { transform: scale(1.12); }
  55%, 90% { transform: scale(1.12); }
  100% { transform: scale(1); }
}
.ta-breathe { animation: ta-breathe-kf 6s ease-in-out infinite; }

@keyframes ta-draw-loop-kf {
  0% { stroke-dashoffset: 100; }
  60%, 92% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 100; }
}
.ta-draw-loop { animation: ta-draw-loop-kf 6s ease-in-out infinite; }

@keyframes ta-defocus-kf {
  0%, 20% { filter: blur(0px); opacity: 0.9; }
  55%, 100% { filter: blur(3.5px); opacity: 0.5; }
}
.ta-defocus { animation: ta-defocus-kf 4.5s ease both infinite; }

@keyframes ta-settle-kf {
  0% { transform: translateX(-26px); }
  30% { transform: translateX(14px); }
  55% { transform: translateX(-6px); }
  75%, 100% { transform: translateX(0); }
}
.ta-settle { animation: ta-settle-kf 4.5s ease-out infinite; }

@keyframes ta-trigger-pull-kf {
  0%, 10% { transform: translateX(0); }
  78%, 88% { transform: translateX(9px); }
  95%, 100% { transform: translateX(0); }
}
.ta-trigger-pull { animation: ta-trigger-pull-kf 4.5s ease-in-out infinite; }

@keyframes ta-pressure-kf {
  0%, 8% { transform: scaleX(0); }
  80%, 90% { transform: scaleX(1); }
  96%, 100% { transform: scaleX(0); }
}
.ta-pressure { animation: ta-pressure-kf 4.5s linear infinite; }

@keyframes ta-shot-flash-kf {
  0%, 78% { opacity: 0; transform: scale(0.8); }
  84% { opacity: 1; transform: scale(1.15); }
  92%, 100% { opacity: 0; transform: scale(1.3); }
}
.ta-shot-flash { animation: ta-shot-flash-kf 4.5s ease-out infinite; }

@keyframes ta-timer-kf {
  0%, 12% { stroke-dashoffset: 100; }
  40%, 90% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 100; }
}
.ta-timer { animation: ta-timer-kf 4.5s linear infinite; }

@keyframes ta-appear-kf {
  0%, 10% { opacity: 0; }
  18%, 92% { opacity: 1; }
  100% { opacity: 0; }
}
.ta-appear { animation: ta-appear-kf 4.5s ease infinite; }

@keyframes ta-micro-hold-kf {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(0.8px, -0.6px); }
  50% { transform: translate(-0.7px, 0.5px); }
  75% { transform: translate(0.5px, 0.7px); }
}
.ta-micro-hold { animation: ta-micro-hold-kf 3s ease-in-out infinite; }

@keyframes ta-cheek-lower-kf {
  0%, 10% { transform: translateY(-26px); }
  40%, 90% { transform: translateY(0); }
  100% { transform: translateY(-26px); }
}
.ta-cheek-lower { animation: ta-cheek-lower-kf 5s ease-in-out infinite; }

@keyframes ta-seat-kf {
  0%, 10% { transform: translate(34px, -8px); }
  45%, 90% { transform: translate(0, 0); }
  100% { transform: translate(34px, -8px); }
}
.ta-seat { animation: ta-seat-kf 5s ease-in-out infinite; }

@keyframes ta-settle-damp-kf {
  0% { transform: rotate(2.4deg); }
  18% { transform: rotate(-1.8deg); }
  34% { transform: rotate(1.2deg); }
  48% { transform: rotate(-0.6deg); }
  60%, 100% { transform: rotate(0deg); }
}
.ta-settle-damp { animation: ta-settle-damp-kf 6s ease-out infinite; }

@keyframes ta-tension-fade-kf {
  0%, 15% { opacity: 1; }
  55%, 100% { opacity: 0; }
}
.ta-tension-fade { animation: ta-tension-fade-kf 6s ease infinite; }

@keyframes ta-exhale-kf {
  0%, 10% { transform: scale(1.35); opacity: 0.9; }
  55%, 100% { transform: scale(0.75); opacity: 0.25; }
}
.ta-exhale { animation: ta-exhale-kf 6s ease-out infinite; }

@media (prefers-reduced-motion: reduce) {
  [class^="ta-"], [class*=" ta-"] { animation: none !important; }
}
`

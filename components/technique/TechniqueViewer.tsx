"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { StepNavigator } from "./StepNavigator"
import { Technique, Step } from "@/data/techniques"
import { TechniqueAnimation } from "./animations/TechniqueAnimation"

interface TechniqueViewerProps {
    technique: Technique
}

export function TechniqueViewer({ technique }: TechniqueViewerProps) {
    const [activeStepId, setActiveStepId] = useState<string>(technique.steps[0].id)
    const stepsRef = useRef<(HTMLElement | null)[]>([])
    const isAutoScrolling = useRef(false)

    // Scroll Detection
    useEffect(() => {
        const handleScroll = () => {
            if (isAutoScrolling.current) return

            const scrollPosition = window.scrollY + window.innerHeight / 3
            let currentActive = technique.steps[0].id

            for (let i = technique.steps.length - 1; i >= 0; i--) {
                const step = technique.steps[i]
                const element = document.getElementById(step.id)
                if (element && element.offsetTop <= scrollPosition) {
                    currentActive = step.id
                    break
                }
            }

            if (currentActive !== activeStepId) {
                setActiveStepId(currentActive)
            }
        }

        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [technique.steps, activeStepId])

    const scrollToStep = (id: string) => {
        isAutoScrolling.current = true
        setActiveStepId(id)

        const element = document.getElementById(id)
        if (element) {
            const offset = 120 // Header + padding
            const top = element.getBoundingClientRect().top + window.scrollY - offset
            window.scrollTo({ top, behavior: "smooth" })

            // Reset auto-scroll flag after animation
            setTimeout(() => {
                isAutoScrolling.current = false
            }, 1000)
        }
    }

    const activeStepData = technique.steps.find(s => s.id === activeStepId) || technique.steps[0]

    return (
        <div className="flex flex-col lg:flex-row gap-12 relative">
            {/* Left: Navigation */}
            <StepNavigator
                steps={technique.steps}
                activeStep={activeStepId}
                onStepClick={scrollToStep}
            />

            {/* Center: Content */}
            <div className="flex-1 space-y-24 py-12">
                {technique.steps.map((step) => (
                    <section
                        id={step.id}
                        key={step.id}
                        className="scroll-mt-32 min-h-[60vh] flex flex-col justify-center"
                    >
                        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-4">
                            <span className="text-primary text-xl font-mono">0{technique.steps.indexOf(step) + 1}</span>
                            {step.title.replace(/^\d+\.\s*/, '')}
                        </h2>
                        <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
                            {step.description}
                        </p>

                        {/* Mobile-only animation display since sticky panel is hidden */}
                        <div className="lg:hidden mt-8 aspect-[4/5] max-h-[420px] bg-neutral-900 rounded-lg overflow-hidden border border-white/10 relative">
                            <div className="absolute inset-0 p-4">
                                <TechniqueAnimation slug={technique.slug} stepId={step.id} />
                            </div>
                        </div>
                    </section>
                ))}
            </div>

            {/* Right: Sticky Animation Panel */}
            <div className="hidden lg:block w-[400px] xl:w-[500px] h-[calc(100vh-8rem)] sticky top-32">
                <div className="bg-neutral-900 rounded-2xl border border-white/10 h-full overflow-hidden relative shadow-2xl">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeStepData.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="absolute inset-0 flex flex-col p-6"
                        >
                            <div className="flex-1 min-h-0">
                                <TechniqueAnimation slug={technique.slug} stepId={activeStepData.id} />
                            </div>
                            <div className="pt-4 text-center">
                                <span className="text-primary text-xs font-mono tracking-widest uppercase">
                                    {activeStepData.title.replace(/^\d+\.\s*/, '')}
                                </span>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/50 to-transparent" />
                </div>
            </div>
        </div>
    )
}

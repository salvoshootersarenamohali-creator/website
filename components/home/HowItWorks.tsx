import { Crosshair, UserCheck, Award } from "lucide-react"

const steps = [
    {
        icon: UserCheck,
        title: "1. Assessment",
        description: "Meet with our head coach for a skill evaluation and goal setting session.",
        color: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/40",
    },
    {
        icon: Crosshair,
        title: "2. Training",
        description: "Follow a distinctive training plan with regular feedback and drills.",
        color: "bg-primary/15 text-primary ring-primary/50",
    },
    {
        icon: Award,
        title: "3. Excellence",
        description: "Competitions, detailed analytics, and continuous improvement.",
        color: "bg-rose-500/15 text-rose-300 ring-rose-400/40",
    }
]

export function HowItWorks() {
    return (
        <section className="py-24 bg-[radial-gradient(circle_at_15%_20%,rgba(14,165,133,0.16),transparent_30%),radial-gradient(circle_at_85%_40%,rgba(212,175,55,0.16),transparent_30%),#08090d] text-white border-t border-white/5">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">HOW IT WORKS</h2>
                    <p className="text-muted-foreground">Your path to the podium starts here.</p>
                </div>

                <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Connector Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-[2px] bg-gradient-to-r from-primary/20 via-primary to-primary/20" />

                    {steps.map((step, index) => (
                        <div key={index} className="relative flex flex-col items-center text-center">
                            <div className={`w-24 h-24 rounded-full border-4 border-black ring-1 ${step.color} flex items-center justify-center mb-6 z-10 shadow-[0_0_20px_rgba(212,175,55,0.18)]`}>
                                <step.icon className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                            <p className="text-muted-foreground max-w-xs">{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

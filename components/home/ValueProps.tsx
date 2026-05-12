"use client"

import { Target, Trophy, Users, Shield } from "lucide-react"

const features = [
    {
        icon: Target,
        title: "Precision Training",
        description: "Scientific approach to shooting technique using electronic targets and biomechanical analysis.",
        accent: "from-emerald-500/20 to-primary/10",
        iconBg: "bg-emerald-500/15 group-hover:bg-emerald-500/25",
        iconColor: "text-emerald-300",
    },
    {
        icon: Trophy,
        title: "Proven Results",
        description: "Home to state and national champions. Our track record speaks for itself.",
        accent: "from-primary/25 to-amber-500/10",
        iconBg: "bg-primary/15 group-hover:bg-primary/25",
        iconColor: "text-primary",
    },
    {
        icon: Users,
        title: "Expert Coaching",
        description: "Learn from certified coaches with years of competitive and instructional experience.",
        accent: "from-sky-500/20 to-primary/10",
        iconBg: "bg-sky-500/15 group-hover:bg-sky-500/25",
        iconColor: "text-sky-300",
    },
    {
        icon: Shield,
        title: "Safe Environment",
        description: "Safety is our priority. Controlled environment suitable for all ages.",
        accent: "from-rose-500/20 to-primary/10",
        iconBg: "bg-rose-500/15 group-hover:bg-rose-500/25",
        iconColor: "text-rose-300",
    },
]

export function ValueProps() {
    return (
        <section className="py-24 bg-[linear-gradient(135deg,#07130f,#16110a_45%,#12070a)] border-t border-white/5">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className={`p-6 rounded-lg bg-gradient-to-br ${feature.accent} border border-white/10 hover:border-primary/35 transition-colors group shadow-lg shadow-black/20`}>
                            <div className={`w-12 h-12 rounded-lg ${feature.iconBg} flex items-center justify-center mb-4 transition-colors`}>
                                <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

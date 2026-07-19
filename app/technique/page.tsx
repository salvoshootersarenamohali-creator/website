import Link from "next/link"
import { techniques } from "@/data/techniques"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TechniqueAnimation } from "@/components/technique/animations/TechniqueAnimation"
import { ArrowRight } from "lucide-react"

export default function TechniquePage() {
    return (
        <div className="min-h-screen bg-black py-16">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">RESOURCE LIBRARY</Badge>
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">MASTER YOUR TECHNIQUE</h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Deep dive into the mechanics of 10m Air Pistol and Rifle shooting.
                        Our step-by-step guides break down every movement for perfection.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {techniques.map((tech) => (
                        <Link key={tech.id} href={`/technique/${tech.slug}`} className="group">
                            <Card className="bg-neutral-900 border-white/10 h-full hover:border-primary/50 transition-all duration-300">
                                <div className="aspect-[4/3] bg-neutral-950 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(212,175,55,0.12),transparent_58%)]" />
                                    <div
                                        className="absolute inset-x-4 -top-6 bottom-10 opacity-75 transition-all duration-500 group-hover:scale-[1.04] group-hover:opacity-100 sm:inset-x-8"
                                        aria-hidden="true"
                                    >
                                        <TechniqueAnimation
                                            slug={tech.slug}
                                            stepId={tech.discipline === "Pistol" ? "grip" : "stance"}
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent z-10" />

                                    <div className="absolute bottom-6 left-6 z-20">
                                        <Badge className="bg-primary text-black hover:bg-primary mb-2">{tech.discipline}</Badge>
                                        <h2 className="text-3xl font-bold text-white group-hover:text-primary transition-colors">{tech.title}</h2>
                                    </div>
                                </div>
                                <CardContent className="pt-6">
                                    <p className="text-muted-foreground mb-6">
                                        {tech.description}
                                    </p>
                                    <div className="flex items-center text-primary font-medium group-hover:translate-x-2 transition-transform">
                                        Start Learning <ArrowRight className="ml-2 w-4 h-4" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}

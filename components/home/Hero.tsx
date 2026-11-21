import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

export function Hero() {
    return (
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-black px-4">
            {/* Background with Gradient Overlay */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black z-10" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_24%,rgba(18,115,93,0.35),transparent_30%),radial-gradient(circle_at_78%_30%,rgba(158,61,76,0.28),transparent_32%),radial-gradient(circle_at_50%_74%,rgba(212,175,55,0.18),transparent_30%)] z-10" />
                <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800 via-black to-black opacity-70" />
                <Image src="/hero-range-bg.jpg" alt="" fill sizes="100vw" preload className="object-cover opacity-50" />
            </div>

            <div className="relative z-10 container mx-auto text-center">
                <h1 className="relative text-5xl md:text-7xl lg:text-9xl font-bold tracking-tighter text-white mb-6">
                    <span className="absolute inset-x-0 top-1/2 -z-10 mx-auto h-24 max-w-3xl -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
                    FORGE YOUR <br />
                    <span
                        className="inline-block text-transparent bg-clip-text bg-[linear-gradient(90deg,#D4AF37,#F7D886,#22C59D,#F7D886,#D4AF37)] bg-[length:220%_100%] drop-shadow-[0_0_22px_rgba(212,175,55,0.22)]"


                    >
                        LEGACY
                    </span>
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                    Master the art of precision at India’s premium shooting arena.
                    World-class coaching, state-of-the-art ranges, and a community of champions.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button asChild size="lg" className="h-14 px-8 text-lg rounded-full bg-[#F7D886] text-black font-bold shadow-[0_0_28px_rgba(247,216,134,0.45)] hover:bg-primary hover:text-white hover:shadow-[0_0_36px_rgba(247,216,134,0.65)]">
                        <Link href="/contact">Start Your Journey</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-white/20 text-white hover:bg-white/10">
                        <Link href="/facilities">Explore Facilities</Link>
                    </Button>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                <span className="text-[10px] tracking-[0.2em] text-white/40 uppercase">Scroll</span>
                <div className="w-[1px] h-12 bg-gradient-to-b from-primary/0 via-primary to-primary/0" />
            </div>
        </section>
    )
}

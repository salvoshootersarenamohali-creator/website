"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Facebook, Instagram } from "lucide-react"

const socialLinks = [
    {
        name: "Instagram",
        href: "https://www.instagram.com/salvo_shooters_arena",
        icon: Instagram,
    },
    {
        name: "Facebook",
        href: "https://www.facebook.com/salvoshooting/",
        icon: Facebook,
    },
]

export function Hero() {
    return (
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-black px-4">
            {/* Background with Gradient Overlay */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black z-10" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_24%,rgba(18,115,93,0.35),transparent_30%),radial-gradient(circle_at_78%_30%,rgba(158,61,76,0.28),transparent_32%),radial-gradient(circle_at_50%_74%,rgba(212,175,55,0.18),transparent_30%)] z-10" />
                <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800 via-black to-black opacity-70" />
                {/* Placeholder for Hero Image/Video */}
                <div className="absolute inset-0 opacity-50 bg-[url('/hero-range-bg.jpg')] bg-cover bg-center" />
            </div>

            <div className="relative z-10 container mx-auto text-center">
                <motion.h1
                    initial={{ opacity: 0, y: -14 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -8 }}
                    transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="relative text-5xl md:text-7xl lg:text-9xl font-bold tracking-tighter text-white mb-6"
                >
                    <span className="absolute inset-x-0 top-1/2 -z-10 mx-auto h-24 max-w-3xl -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
                    FORGE YOUR <br />
                    <motion.span
                        className="inline-block text-transparent bg-clip-text bg-[linear-gradient(90deg,#D4AF37,#F7D886,#22C59D,#F7D886,#D4AF37)] bg-[length:220%_100%] drop-shadow-[0_0_22px_rgba(212,175,55,0.22)]"
                        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    >
                        LEGACY
                    </motion.span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
                >
                    Master the art of precision at India’s premium shooting arena.
                    World-class coaching, state-of-the-art ranges, and a community of champions.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-[#F7D886] text-black font-bold shadow-[0_0_28px_rgba(247,216,134,0.45)] hover:bg-primary hover:text-white hover:shadow-[0_0_36px_rgba(247,216,134,0.65)]">
                        Start Your Journey
                    </Button>
                    <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-white/20 text-white hover:bg-white/10">
                        Explore Facilities
                    </Button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="mt-8 flex flex-wrap items-center justify-center gap-3"
                >
                    {socialLinks.map((social) => (
                        <a
                            key={social.name}
                            href={social.href}
                            target="_blank"
                            rel="noreferrer"
                            className="group inline-flex h-12 items-center gap-3 rounded-full border border-primary/25 bg-black/35 px-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur transition hover:border-primary/70 hover:bg-primary/10 hover:text-primary"
                            aria-label={`Open Salvo Shooters Arena on ${social.name}`}
                        >
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary transition group-hover:bg-primary group-hover:text-black">
                                <social.icon className="h-4 w-4" />
                            </span>
                            {social.name}
                        </a>
                    ))}
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            >
                <span className="text-[10px] tracking-[0.2em] text-white/40 uppercase">Scroll</span>
                <div className="w-[1px] h-12 bg-gradient-to-b from-primary/0 via-primary to-primary/0" />
            </motion.div>
        </section>
    )
}

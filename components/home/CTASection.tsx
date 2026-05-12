import { Button } from "@/components/ui/button"
import Link from "next/link"

export function CTASection() {
    return (
        <section className="py-24 bg-[linear-gradient(135deg,#d4af37,#f2d57a_38%,#1f8f76)] text-black relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-multiply" />
            <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-rose-600/25 blur-3xl" />

            <div className="container mx-auto px-4 relative z-10 text-center">
                <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">READY TO AIM HIGHER?</h2>
                <p className="text-xl md:text-2xl font-medium mb-10 max-w-2xl mx-auto text-black/80">
                    Book your first session today and experience world-class shooting training.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-black text-white hover:bg-black/80">
                        Book Intro Session
                    </Button>
                    <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-black text-black hover:bg-black/10">
                        Contact Us
                    </Button>
                </div>
            </div>
        </section>
    )
}

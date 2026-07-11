import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function CoachingPage() {
    return (
        <div className="min-h-screen bg-black text-white pt-20 flex items-center justify-center">
            <div className="text-center px-4">
                <h1 className="text-4xl font-bold mb-4">COACHING PROGRAMS</h1>
                <p className="text-muted-foreground">Coming Soon</p>
                <Button asChild className="mt-8 h-12 rounded-full bg-[#D4AF37] px-7 text-sm font-black uppercase tracking-[0.12em] text-black shadow-[0_0_28px_rgba(212,175,55,0.28)] hover:bg-[#E5C558] hover:shadow-[0_0_36px_rgba(212,175,55,0.42)]">
                    <Link href="/contact">Book Your Free Session</Link>
                </Button>
            </div>
        </div>
    )
}

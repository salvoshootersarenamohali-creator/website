import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function CoachingPage() {
    return (
        <div className="min-h-screen bg-black text-white pt-20 flex items-center justify-center">
            <div className="text-center px-4">
                <h1 className="text-4xl font-bold mb-4">COACHING PROGRAMS</h1>
                <p className="text-muted-foreground">Coming Soon</p>
                <Button asChild className="mt-8 bg-primary text-black hover:bg-primary/90">
                    <Link href="/contact">Book Your Free Session</Link>
                </Button>
            </div>
        </div>
    )
}

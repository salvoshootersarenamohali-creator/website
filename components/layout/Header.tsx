"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const navigation = [
    { name: "Courses", href: "/courses" },
    { name: "Technique", href: "/technique" },
    { name: "Coaching", href: "/coaching" },
    { name: "Competitions", href: "/competitions" },
    { name: "Results", href: "/results" },
    { name: "Corporate", href: "/corporate" },
    { name: "Shop", href: "/shop" },
    { name: "Facilities", href: "/facilities" },
    { name: "Gallery", href: "/gallery" },
]

export function Header() {
    const [isScrolled, setIsScrolled] = React.useState(false)
    const pathname = usePathname()

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    if (pathname === "/results/tv" || /^\/competitions\/[^/]+\/results\/tv\/?$/.test(pathname)) return null

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                isScrolled
                    ? "bg-[#060806]/95 backdrop-blur-md py-3 shadow-lg shadow-emerald-950/20"
                    : "bg-black/95 py-3"
            )}
        >
            <div className="container mx-auto px-4 flex min-h-20 items-center justify-between">
                <Link href="/" className="flex items-center">
                    <Image
                        src="/salvo-logo.png"
                        alt="Salvo Shooters Arena"
                        width={320}
                        height={128}
                        priority
                        className="h-14 w-auto md:h-16"
                    />
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="text-sm font-medium text-white/80 hover:text-primary transition-colors uppercase tracking-wider text-[11px]"
                        >
                            {item.name}
                        </Link>
                    ))}
                    <Button asChild className="rounded-md border border-[#D4AF37] bg-[#D4AF37] px-5 font-black text-black shadow-[0_0_18px_rgba(212,175,55,0.22)] transition-all hover:border-[#E5C558] hover:bg-[#E5C558] hover:text-black hover:shadow-[0_0_28px_rgba(212,175,55,0.4)] focus-visible:ring-[#D4AF37] focus-visible:ring-offset-black">
                        <Link href="/contact">Book Your Free Session</Link>
                    </Button>
                </nav>

                {/* Mobile Navigation */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="lg:hidden text-white hover:text-primary">
                            <Menu className="h-6 w-6" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="bg-black/95 border-l border-white/10">
                        <SheetTitle className="sr-only">Menu</SheetTitle> {/* Accessibility Fix */}
                        <div className="flex flex-col h-full mt-10">
                            <nav className="flex flex-col gap-6">
                                {navigation.map((item) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className="text-2xl font-bold text-white hover:text-primary transition-colors"
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                                <div className="h-px bg-white/10 my-4" />
                                <Link href="/about" className="text-lg text-white/60 hover:text-white">About Us</Link>
                                <Link href="/contact" className="text-lg text-white/60 hover:text-white">Contact</Link>
                                <Link href="/faq" className="text-lg text-white/60 hover:text-white">FAQ</Link>
                            </nav>

                            <div className="mt-auto">
                                <Button asChild className="w-full bg-[#D4AF37] text-black hover:bg-[#E5C558] hover:text-black text-lg py-6 shadow-[0_0_24px_rgba(212,175,55,0.24)]">
                                    <Link href="/contact">Book Your Free Session</Link>
                                </Button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </header>
    )
}

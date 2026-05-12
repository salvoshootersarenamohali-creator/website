"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const navigation = [
    { name: "Courses", href: "/courses" },
    { name: "Technique", href: "/technique" },
    { name: "Coaching", href: "/coaching" },
    { name: "Corporate", href: "/corporate" },
    { name: "Shop", href: "/shop" },
    { name: "Facilities", href: "/facilities" },
    { name: "Gallery", href: "/gallery" },
]

export function Header() {
    const [isScrolled, setIsScrolled] = React.useState(false)

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

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
                <nav className="hidden md:flex items-center gap-8">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="text-sm font-medium text-white/80 hover:text-primary transition-colors uppercase tracking-wider text-[11px]"
                        >
                            {item.name}
                        </Link>
                    ))}
                    <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-black transition-all">
                        Book a Session
                    </Button>
                </nav>

                {/* Mobile Navigation */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden text-white hover:text-primary">
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
                                <Button className="w-full bg-primary text-black hover:bg-primary/90 text-lg py-6">
                                    Book a Session
                                </Button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </header>
    )
}

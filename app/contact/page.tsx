"use client"

import type * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Phone, Mail } from "lucide-react"
import { toProperCase } from "@/lib/registration-validation"

function properCaseField(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    event.currentTarget.value = toProperCase(event.currentTarget.value)
}

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-black text-white pt-10">
            <div className="container mx-auto px-4 py-16">
                <h1 className="text-4xl md:text-6xl font-bold mb-12 text-center">GET IN TOUCH</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-5xl mx-auto">
                    {/* Contact Info */}
                    <div className="space-y-8">
                        <h2 className="text-2xl font-bold text-primary">Visit Us</h2>
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <MapPin className="w-6 h-6 text-primary mt-1" />
                                <div>
                                    <p className="font-medium text-white">Salvo Shooters Arena</p>
                                    <p className="text-neutral-400">SCO 15, Preet City, opp. water tank, Sector 86, Sahibzada Ajit Singh Nagar, Punjab 140308</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Phone className="w-6 h-6 text-primary" />
                                <p className="text-neutral-400">+91 97003 30076</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <Mail className="w-6 h-6 text-primary" />
                                <p className="text-neutral-400">info@salvoarena.com</p>
                            </div>
                        </div>

                        <div className="h-64 bg-neutral-900 rounded-xl border border-white/10 flex items-center justify-center text-neutral-600">
                            Map Placeholder
                        </div>
                    </div>

                    {/* Form */}
                    <div className="bg-neutral-900 p-8 rounded-xl border border-white/10">
                        <h2 className="text-2xl font-bold text-white mb-6">Send a Message</h2>
                        <form className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-white">Name</Label>
                                <Input id="name" placeholder="Your Name" onChange={properCaseField} className="bg-black border-white/10 text-white" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-white">Email</Label>
                                <Input id="email" type="email" placeholder="john@example.com" className="bg-black border-white/10 text-white" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="message" className="text-white">Message</Label>
                                <textarea
                                    id="message"
                                    rows={4}
                                    onChange={properCaseField}
                                    className="flex w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="How can we help you?"
                                />
                            </div>
                            <Button className="w-full bg-primary text-black hover:bg-primary/90">
                                Send Message
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

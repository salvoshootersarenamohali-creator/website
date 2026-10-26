"use client"
import { rangeApi, ActionForm, Field, Panel } from "@/components/range/shared"
export default function RangeLogin() {
    return <div className="mx-auto max-w-md px-4 py-12"><Panel title="Staff sign in"><p className="mb-6 text-white/60">Use the phone number and password provided by the range owner.</p><ActionForm submit="Sign in" onSubmit={async form => { const data = new FormData(form); await rangeApi("login", { phone: data.get("phone"), password: data.get("password") }); window.location.assign("/range") }}><Field label="Phone number"><input className="field" name="phone" type="tel" autoComplete="username" required /></Field><Field label="Password"><input className="field" name="password" type="password" autoComplete="current-password" required maxLength={128} /></Field></ActionForm><p className="mt-6 text-sm text-white/50">Forgot your password? Ask the owner to reset your account.</p></Panel></div>
}

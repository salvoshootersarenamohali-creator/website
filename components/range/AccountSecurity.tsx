"use client"
import { ActionForm, Field, rangeApi } from "./shared"

export function PasswordForm({ onDone }: { onDone: () => Promise<void> }) {
    return <ActionForm onSubmit={async form => {
        const data = new FormData(form)
        if (data.get("password") !== data.get("confirm")) throw new Error("New passwords do not match.")
        await rangeApi("password", { currentPassword: data.get("currentPassword"), password: data.get("password") })
        form.reset(); await onDone()
    }} submit="Change password"><Field label="Current password"><input className="field" name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></Field><Field label="New password (at least 12 characters)"><input className="field" name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></Field><Field label="Confirm new password"><input className="field" name="confirm" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></Field></ActionForm>
}

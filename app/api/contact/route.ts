import nodemailer from "nodemailer"

export const runtime = "nodejs"

type ContactPayload = {
    name?: unknown
    email?: unknown
    phone?: unknown
    interest?: unknown
    preferredTime?: unknown
    message?: unknown
}

const defaultRecipient = "salvoshootersarenamohali@gmail.com"

function readString(value: unknown) {
    return typeof value === "string" ? value.trim() : ""
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

function getSmtpConfig() {
    const host = process.env.SMTP_HOST?.trim()
    const port = Number(process.env.SMTP_PORT ?? "587")
    const user = process.env.SMTP_USER?.trim()
    const pass = process.env.SMTP_PASS
    const from = process.env.SMTP_FROM_EMAIL?.trim() || user

    if (!host || !user || !pass || !from) {
        throw new Error("SMTP is not configured. Please set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL.")
    }
    if (!Number.isInteger(port) || port <= 0) {
        throw new Error("SMTP_PORT must be a valid port number.")
    }

    return { host, port, user, pass, from }
}

export async function POST(request: Request) {
    try {
        const payload = await request.json() as ContactPayload
        const name = readString(payload.name)
        const email = readString(payload.email).toLowerCase()
        const phone = readString(payload.phone)
        const interest = readString(payload.interest)
        const preferredTime = readString(payload.preferredTime)
        const message = readString(payload.message)

        if (!name || !email || !phone || !interest || !preferredTime || !message) {
            return Response.json({ error: "Please complete all required fields." }, { status: 400 })
        }
        if (!isValidEmail(email)) {
            return Response.json({ error: "Please enter a valid email address." }, { status: 400 })
        }
        if (message.length > 3000) {
            return Response.json({ error: "Please keep the message under 3000 characters." }, { status: 400 })
        }

        const smtp = getSmtpConfig()
        const recipient = process.env.CONTACT_TO_EMAIL?.trim() || defaultRecipient
        const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.port === 465,
            auth: {
                user: smtp.user,
                pass: smtp.pass,
            },
        })

        const safeRows = [
            ["Name", name],
            ["Email", email],
            ["Phone", phone],
            ["Session Interest", interest],
            ["Preferred Time", preferredTime],
            ["Message", message],
        ].map(([label, value]) => `
            <tr>
                <td style="padding:12px;border-bottom:1px solid #ececec;font-weight:700;color:#111111;width:180px;">${escapeHtml(label)}</td>
                <td style="padding:12px;border-bottom:1px solid #ececec;color:#333333;white-space:pre-wrap;">${escapeHtml(value)}</td>
            </tr>
        `).join("")

        await transporter.sendMail({
            from: smtp.from,
            to: recipient,
            replyTo: email,
            subject: `New free session request from ${name}`,
            text: [
                "New contact form submission",
                "",
                `Name: ${name}`,
                `Email: ${email}`,
                `Phone: ${phone}`,
                `Session Interest: ${interest}`,
                `Preferred Time: ${preferredTime}`,
                "",
                "Message:",
                message,
            ].join("\n"),
            html: `
                <div style="font-family:Arial,sans-serif;background:#f6f4ec;padding:24px;">
                    <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e7dfc2;border-radius:8px;overflow:hidden;">
                        <div style="background:#050505;color:#ffffff;padding:24px;">
                            <p style="margin:0;color:#d4af37;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Salvo Shooters Arena</p>
                            <h1 style="margin:8px 0 0;font-size:26px;">New Free Session Request</h1>
                        </div>
                        <table style="width:100%;border-collapse:collapse;">${safeRows}</table>
                    </div>
                </div>
            `,
        })

        return Response.json({ ok: true })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to send your message."
        const status = message.includes("SMTP") ? 500 : 400
        return Response.json({ error: message }, { status })
    }
}

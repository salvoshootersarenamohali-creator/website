import type { ParticipantEntry } from "@/lib/participants"

const DEFAULT_TEMPLATE_NAME = "competition_result_certificate"
const DEFAULT_TEMPLATE_LANGUAGE = "en"

export type WhatsAppResultsConfig = {
    accessToken: string
    phoneNumberId: string
    graphApiVersion: string
    templateName: string
    templateLanguage: string
}

export type WhatsAppTemplateInput = {
    phone: string
    participantName: string
    competitionTitle: string
    resultsText: string
    certificateUrl: string
}

export function normalizeWhatsAppPhone(phone: string) {
    let digits = phone.replace(/\D/g, "")
    if (digits.startsWith("00")) digits = digits.slice(2)
    if (digits.length === 11 && digits.startsWith("0")) digits = `91${digits.slice(1)}`
    if (digits.length === 10) digits = `91${digits}`
    return digits.length >= 11 && digits.length <= 15 ? digits : ""
}

export function maskWhatsAppPhone(phone: string) {
    const normalized = normalizeWhatsAppPhone(phone)
    if (!normalized) return "Invalid number"
    return `${"•".repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`
}

export function formatWhatsAppResults(entries: ParticipantEntry[]) {
    return entries
        .map((entry) => `${entry.categoryCode} - ${entry.categoryLabel}: Score ${entry.displayScore}, Rank ${entry.positionLabel}`)
        .join("\n")
}

export function buildWhatsAppResultsPreview(input: Omit<WhatsAppTemplateInput, "phone">) {
    return [
        `Hi ${input.participantName},`,
        "",
        `Your results for ${input.competitionTitle} are ready:`,
        input.resultsText,
        "",
        `Download your certificate: ${input.certificateUrl}`,
        "",
        "Regards,",
        "Salvo Shooters Arena",
    ].join("\n")
}

export function getWhatsAppResultsConfig() {
    const values = {
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? "",
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "",
        graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION?.trim() ?? "",
        templateName: process.env.WHATSAPP_RESULTS_TEMPLATE_NAME?.trim() || DEFAULT_TEMPLATE_NAME,
        templateLanguage: process.env.WHATSAPP_RESULTS_TEMPLATE_LANGUAGE?.trim() || DEFAULT_TEMPLATE_LANGUAGE,
    }
    const missing = [
        !values.accessToken && "WHATSAPP_ACCESS_TOKEN",
        !values.phoneNumberId && "WHATSAPP_PHONE_NUMBER_ID",
        !/^v\d+\.\d+$/.test(values.graphApiVersion) && "WHATSAPP_GRAPH_API_VERSION",
    ].filter((value): value is string => Boolean(value))

    return {
        configured: missing.length === 0,
        missing,
        values: values as WhatsAppResultsConfig,
    }
}

export function buildWhatsAppTemplatePayload(input: WhatsAppTemplateInput, config: WhatsAppResultsConfig) {
    return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizeWhatsAppPhone(input.phone),
        type: "template",
        template: {
            name: config.templateName,
            language: { code: config.templateLanguage },
            components: [{
                type: "body",
                parameters: [
                    { type: "text", text: input.participantName },
                    { type: "text", text: input.competitionTitle },
                    { type: "text", text: input.resultsText },
                    { type: "text", text: input.certificateUrl },
                ],
            }],
        },
    }
}

export async function sendWhatsAppResultsTemplate(input: WhatsAppTemplateInput) {
    const normalizedPhone = normalizeWhatsAppPhone(input.phone)
    if (!normalizedPhone) throw new Error("The participant does not have a valid WhatsApp phone number.")

    const config = getWhatsAppResultsConfig()
    if (!config.configured) throw new Error(`WhatsApp is not configured. Missing: ${config.missing.join(", ")}.`)

    const response = await fetch(
        `https://graph.facebook.com/${config.values.graphApiVersion}/${encodeURIComponent(config.values.phoneNumberId)}/messages`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.values.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(buildWhatsAppTemplatePayload({ ...input, phone: normalizedPhone }, config.values)),
            signal: AbortSignal.timeout(20_000),
        },
    )

    const data = await response.json().catch(() => ({})) as {
        messages?: { id?: string }[]
        error?: { message?: string; error_user_msg?: string }
    }
    if (!response.ok) {
        throw new Error(data.error?.error_user_msg || data.error?.message || `WhatsApp rejected the message (${response.status}).`)
    }

    const messageId = data.messages?.[0]?.id
    if (!messageId) throw new Error("WhatsApp accepted the request without returning a message ID.")
    return messageId
}

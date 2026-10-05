import type { RequiredDocumentDefinition } from "@/lib/competition"
import { uploadDocumentToCloudinary, validateDocumentFile } from "@/lib/cloudinary-upload"
import { RegistrationValidationError } from "@/lib/registration-validation"

export const REQUIRED_DOCUMENT_FORM_PREFIX = "requiredDocument:"

export type RegistrationDocumentUpload = {
    documentKey: string
    label: string
    path: string
    mimeType: string
    position: number
}

export function readRequiredDocumentFiles(formData: FormData, requiredDocuments: RequiredDocumentDefinition[]) {
    const configuredIds = new Set(requiredDocuments.map((document) => document.id))
    for (const key of formData.keys()) {
        if (!key.startsWith(REQUIRED_DOCUMENT_FORM_PREFIX)) continue
        const documentKey = key.slice(REQUIRED_DOCUMENT_FORM_PREFIX.length)
        if (!configuredIds.has(documentKey)) {
            throw new RegistrationValidationError("One or more uploaded documents are not required for this competition.")
        }
        if (formData.getAll(key).length !== 1) {
            throw new RegistrationValidationError("Each required document can only be uploaded once.")
        }
    }

    return requiredDocuments.map((document) => {
        const value = formData.get(`${REQUIRED_DOCUMENT_FORM_PREFIX}${document.id}`)
        if (!(value instanceof File) || value.size <= 0) {
            throw new RegistrationValidationError(`Please upload ${document.label}.`)
        }
        validateDocumentFile(value, document.label)
        return { definition: document, file: value }
    })
}

export async function uploadRequiredDocuments(
    files: ReturnType<typeof readRequiredDocumentFiles>,
    competitionSlug: string,
): Promise<RegistrationDocumentUpload[]> {
    return Promise.all(files.map(async ({ definition, file }, position) => ({
        documentKey: definition.id,
        label: definition.label,
        path: await uploadDocumentToCloudinary(file, {
            folder: `salvo/${competitionSlug}/documents/${definition.id}`,
            label: definition.label,
        }),
        mimeType: file.type,
        position,
    })))
}

import { describe, expect, it } from "vitest"
import { ImageUploadError } from "@/lib/cloudinary-upload"
import { readRequiredDocumentFiles } from "@/lib/registration-documents"
import { RegistrationValidationError } from "@/lib/registration-validation"

const requiredDocuments = [
    { id: "medical-certificate", label: "Medical Certificate" },
    { id: "association-card", label: "Association Card" },
]

describe("registration document submission", () => {
    it("accepts one image or PDF for every configured document", () => {
        const formData = new FormData()
        formData.append("requiredDocument:medical-certificate", new File(["image"], "medical.jpg", { type: "image/jpeg" }))
        formData.append("requiredDocument:association-card", new File(["pdf"], "card.pdf", { type: "application/pdf" }))

        const result = readRequiredDocumentFiles(formData, requiredDocuments)
        expect(result.map(({ definition, file }) => [definition.id, file.type])).toEqual([
            ["medical-certificate", "image/jpeg"],
            ["association-card", "application/pdf"],
        ])
    })

    it("rejects missing, duplicate, unknown, and invalid document files", () => {
        const missing = new FormData()
        missing.append("requiredDocument:medical-certificate", new File(["image"], "medical.jpg", { type: "image/jpeg" }))
        expect(() => readRequiredDocumentFiles(missing, requiredDocuments)).toThrow(RegistrationValidationError)

        const duplicate = new FormData()
        duplicate.append("requiredDocument:medical-certificate", new File(["one"], "one.jpg", { type: "image/jpeg" }))
        duplicate.append("requiredDocument:medical-certificate", new File(["two"], "two.jpg", { type: "image/jpeg" }))
        duplicate.append("requiredDocument:association-card", new File(["pdf"], "card.pdf", { type: "application/pdf" }))
        expect(() => readRequiredDocumentFiles(duplicate, requiredDocuments)).toThrow("Each required document can only be uploaded once.")

        const unknown = new FormData()
        unknown.append("requiredDocument:medical-certificate", new File(["image"], "medical.jpg", { type: "image/jpeg" }))
        unknown.append("requiredDocument:association-card", new File(["pdf"], "card.pdf", { type: "application/pdf" }))
        unknown.append("requiredDocument:extra", new File(["pdf"], "extra.pdf", { type: "application/pdf" }))
        expect(() => readRequiredDocumentFiles(unknown, requiredDocuments)).toThrow("One or more uploaded documents are not required for this competition.")

        const invalid = new FormData()
        invalid.append("requiredDocument:medical-certificate", new File(["text"], "medical.txt", { type: "text/plain" }))
        invalid.append("requiredDocument:association-card", new File(["pdf"], "card.pdf", { type: "application/pdf" }))
        expect(() => readRequiredDocumentFiles(invalid, requiredDocuments)).toThrow(ImageUploadError)

        const oversized = new FormData()
        oversized.append("requiredDocument:medical-certificate", new File([new Uint8Array(5 * 1024 * 1024 + 1)], "medical.pdf", { type: "application/pdf" }))
        oversized.append("requiredDocument:association-card", new File(["pdf"], "card.pdf", { type: "application/pdf" }))
        expect(() => readRequiredDocumentFiles(oversized, requiredDocuments)).toThrow("Medical Certificate must be smaller than 5MB.")
    })
})

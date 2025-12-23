import { extractTextFromImage } from "./mistral"
import { compareWithFormData } from "./llm"
import type {
  LabelFormData,
  FieldResult,
  VerifyLabelResponse,
  VerifyLabelError,
} from "./types"

export async function verifyLabel(
  imageBase64: string,
  imageType: string,
  formData: LabelFormData
): Promise<VerifyLabelResponse | VerifyLabelError> {
  const startTime = Date.now()

  const ocrResult = await extractTextFromImage(imageBase64, imageType)
  if (!ocrResult.success) {
    return { success: false, error: ocrResult.error || "OCR extraction failed", code: "OCR_FAILED" }
  }

  const comparisonResult = await compareWithFormData(ocrResult.text, formData)
  if (!comparisonResult.success || !comparisonResult.result) {
    return { success: false, error: comparisonResult.error || "LLM comparison failed", code: "LLM_FAILED" }
  }

  const r = comparisonResult.result
  const fields: FieldResult[] = [
    {
      field: "Brand Name",
      submitted: formData.brandName,
      detected: r.brandName.detected,
      match: r.brandName.match,
      confidence: r.brandName.confidence,
    },
    {
      field: "Class/Type",
      submitted: formData.classType,
      detected: r.classType.detected,
      match: r.classType.match,
      confidence: r.classType.confidence,
    },
    {
      field: "Alcohol Content",
      submitted: formData.alcoholContent,
      detected: r.alcoholContent.detected,
      match: r.alcoholContent.match,
      confidence: r.alcoholContent.confidence,
    },
    {
      field: "Net Contents",
      submitted: formData.netContents,
      detected: r.netContents.detected,
      match: r.netContents.match,
      confidence: r.netContents.confidence,
    },
    {
      field: "Government Warning",
      submitted: formData.governmentWarning.substring(0, 50) + "...",
      detected: r.governmentWarning.detected.length > 50
        ? r.governmentWarning.detected.substring(0, 50) + "..."
        : r.governmentWarning.detected,
      match: r.governmentWarning.match,
      confidence: r.governmentWarning.confidence,
    },
  ]

  return {
    success: true,
    overall: fields.every((f) => f.match) ? "pass" : "fail",
    fields,
    ocrText: ocrResult.text,
    processingTimeMs: Date.now() - startTime,
  }
}

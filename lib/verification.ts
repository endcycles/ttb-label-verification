import { extractTextFromImage } from "./ocr"
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

  const extracted = comparisonResult.result
  const fields: FieldResult[] = [
    {
      field: "Brand Name",
      submitted: formData.brandName,
      detected: extracted.brandName.detected,
      match: extracted.brandName.match,
      confidence: extracted.brandName.confidence,
    },
    {
      field: "Class/Type",
      submitted: formData.classType,
      detected: extracted.classType.detected,
      match: extracted.classType.match,
      confidence: extracted.classType.confidence,
    },
    {
      field: "Alcohol Content",
      submitted: formData.alcoholContent,
      detected: extracted.alcoholContent.detected,
      match: extracted.alcoholContent.match,
      confidence: extracted.alcoholContent.confidence,
    },
    {
      field: "Net Contents",
      submitted: formData.netContents,
      detected: extracted.netContents.detected,
      match: extracted.netContents.match,
      confidence: extracted.netContents.confidence,
    },
    {
      field: "Government Warning",
      submitted: formData.governmentWarning.substring(0, 50) + "...",
      detected: extracted.governmentWarning.detected.length > 50
        ? extracted.governmentWarning.detected.substring(0, 50) + "..."
        : extracted.governmentWarning.detected,
      match: extracted.governmentWarning.match,
      confidence: extracted.governmentWarning.confidence,
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

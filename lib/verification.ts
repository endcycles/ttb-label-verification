import { verifyWithVision } from "./groq"
// import { extractTextFromImage } from "./mistral"
// import { compareWithFormData } from "./groq"
import type {
  LabelFormData,
  FieldResult,
  VerifyLabelResponse,
  VerifyLabelError,
} from "./types"

/**
 * Main verification function
 *
 * CURRENT: Single-call Groq Llama 4 Scout (~1-2s)
 * DISABLED: Mistral OCR + Groq LLM (~8s) - see commented code below
 */
export async function verifyLabel(
  imageBase64: string,
  imageType: string,
  formData: LabelFormData
): Promise<VerifyLabelResponse | VerifyLabelError> {
  const startTime = Date.now()

  // ============================================
  // FAST PATH: Groq Llama 4 Scout (Vision)
  // Single API call for OCR + comparison (~1-2s)
  // ============================================
  const visionResult = await verifyWithVision(imageBase64, imageType, formData)

  if (!visionResult.success || !visionResult.result) {
    return {
      success: false,
      error: visionResult.error || "Vision verification failed",
      code: "LLM_FAILED",
    }
  }

  const r = visionResult.result

  // ============================================
  // SLOW PATH: Mistral OCR + Groq LLM (~8s)
  // Uncomment below and comment above to use
  // ============================================
  /*
  const ocrResult = await extractTextFromImage(imageBase64, imageType)
  if (!ocrResult.success) {
    return {
      success: false,
      error: ocrResult.error || "OCR extraction failed",
      code: "OCR_FAILED",
    }
  }

  const comparisonResult = await compareWithFormData(ocrResult.text, formData)
  if (!comparisonResult.success || !comparisonResult.result) {
    return {
      success: false,
      error: comparisonResult.error || "LLM comparison failed",
      code: "LLM_FAILED",
    }
  }

  const r = comparisonResult.result
  */

  // Transform to API response format
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
      detected:
        r.governmentWarning.detected.length > 50
          ? r.governmentWarning.detected.substring(0, 50) + "..."
          : r.governmentWarning.detected,
      match: r.governmentWarning.match,
      confidence: r.governmentWarning.confidence,
    },
  ]

  const allFieldsMatch = fields.every((f) => f.match)
  const processingTimeMs = Date.now() - startTime

  return {
    success: true,
    overall: allFieldsMatch ? "pass" : "fail",
    fields,
    ocrText: "Groq Vision (single-call)",
    processingTimeMs,
  }
}

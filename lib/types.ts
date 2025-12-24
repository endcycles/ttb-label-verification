// ============================================
// Form Data Types
// ============================================

export interface LabelFormData {
  brandName: string
  classType: string
  alcoholContent: string
  netContents: string
  governmentWarning: string
}

// ============================================
// API Request/Response Types
// ============================================

export interface VerifyLabelRequest {
  imageBase64: string
  imageType: string
  formData: LabelFormData
}

export interface FieldResult {
  field: string
  submitted: string
  detected: string
  match: boolean
  confidence: number
}

export interface VerifyLabelResponse {
  success: true
  overall: "pass" | "fail"
  fields: FieldResult[]
  ocrText: string
  processingTimeMs: number
}

export interface VerifyLabelError {
  success: false
  error: string
  code: "OCR_FAILED" | "LLM_FAILED" | "INVALID_INPUT" | "TIMEOUT" | "UNKNOWN"
}

export type VerifyLabelResult = VerifyLabelResponse | VerifyLabelError

// ============================================
// LLM Response Types
// ============================================

export interface LLMFieldResult {
  detected: string
  match: boolean
  confidence: number
  notes: string
}

export interface LLMComparisonResult {
  brandName: LLMFieldResult
  classType: LLMFieldResult
  alcoholContent: LLMFieldResult
  netContents: LLMFieldResult
  governmentWarning: LLMFieldResult
}

// ============================================
// Bulk Verification Types
// ============================================

export interface BulkItem {
  id: string
  imageFile: File | null
  imagePreview: string | null
  formData: {
    brandName: string
    classType: string
    alcoholContent: string
    netContents: string
  }
  status: 'pending' | 'processing' | 'complete' | 'error'
  result?: {
    overall: 'pass' | 'fail'
    fields: FieldResult[]
    processingTimeMs: number
  }
  error?: string
}

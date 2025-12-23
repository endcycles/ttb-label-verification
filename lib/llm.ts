import type { LabelFormData, LLMComparisonResult } from "./types"
import {
  isFuzzyMatch,
  isClassTypeMatch,
  isAlcoholMatch,
  isNetContentsMatch,
  isGovernmentWarningMatch,
} from "./matching"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const GROQ_MODEL = "openai/gpt-oss-20b"

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
const OPENROUTER_MODEL = "google/gemini-3-flash-preview"

const EXTRACTION_PROMPT = `You are an OCR text extraction specialist. Extract specific fields from the OCR text.

Find and return the EXACT text for each field. Do not interpret or normalize - return exactly what you see.
IMPORTANT: Do not include markdown formatting (like # or *) in your extracted values - return only the plain text.

Return ONLY this JSON:
{
  "brandName": "<exact text found or empty string>",
  "classType": "<exact text found or empty string>",
  "alcoholContent": "<exact text found or empty string>",
  "netContents": "<exact text found or empty string>",
  "governmentWarning": "<exact text found or empty string>"
}`

interface ExtractionResult {
  brandName: string
  classType: string
  alcoholContent: string
  netContents: string
  governmentWarning: string
}

// Strip markdown artifacts from extracted values
function cleanExtraction(result: ExtractionResult): ExtractionResult {
  const clean = (s: string) => s.replace(/^[#*]+\s*/, '').trim()
  return {
    brandName: clean(result.brandName),
    classType: clean(result.classType),
    alcoholContent: clean(result.alcoholContent),
    netContents: clean(result.netContents),
    governmentWarning: clean(result.governmentWarning),
  }
}

interface LLMResponse {
  success: boolean
  extracted?: ExtractionResult
  error?: string
}

function buildUserPrompt(ocrText: string): string {
  return `OCR TEXT:
${ocrText}

Extract the brand name, class/type, alcohol content, net contents, and government warning from this text.`
}

async function extractWithGroq(ocrText: string): Promise<LLMResponse> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return { success: false, error: "GROQ_API_KEY not configured" }
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          { role: "user", content: buildUserPrompt(ocrText) },
        ],
        temperature: 0,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `Groq API error: ${response.status} - ${errorText}` }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return { success: false, error: "Empty response from Groq" }
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { success: false, error: "No JSON found in Groq response" }
    }

    return { success: true, extracted: cleanExtraction(JSON.parse(jsonMatch[0]) as ExtractionResult) }
  } catch (error) {
    return {
      success: false,
      error: `Groq extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

async function extractWithOpenRouter(ocrText: string): Promise<LLMResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return { success: false, error: "OPENROUTER_API_KEY not configured" }
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          { role: "user", content: buildUserPrompt(ocrText) },
        ],
        temperature: 0,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `OpenRouter API error: ${response.status} - ${errorText}` }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return { success: false, error: "Empty response from OpenRouter" }
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { success: false, error: "No JSON found in OpenRouter response" }
    }

    return { success: true, extracted: cleanExtraction(JSON.parse(jsonMatch[0]) as ExtractionResult) }
  } catch (error) {
    return {
      success: false,
      error: `OpenRouter extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export interface ComparisonResult {
  success: boolean
  result?: LLMComparisonResult
  error?: string
}

export async function compareWithFormData(
  ocrText: string,
  formData: LabelFormData
): Promise<ComparisonResult> {
  const provider = process.env.LLM_PROVIDER?.toLowerCase() || "groq"

  const llmResponse = provider === "openrouter"
    ? await extractWithOpenRouter(ocrText)
    : await extractWithGroq(ocrText)

  if (!llmResponse.success || !llmResponse.extracted) {
    return { success: false, error: llmResponse.error }
  }

  const extracted = llmResponse.extracted

  const brandMatch = isFuzzyMatch(formData.brandName, extracted.brandName)
  const classMatch = isClassTypeMatch(formData.classType, extracted.classType)
  const alcoholMatch = isAlcoholMatch(formData.alcoholContent, extracted.alcoholContent)
  const contentsMatch = isNetContentsMatch(formData.netContents, extracted.netContents)
  const warningMatch = isGovernmentWarningMatch(formData.governmentWarning, extracted.governmentWarning)

  const result: LLMComparisonResult = {
    brandName: {
      detected: extracted.brandName || "NOT FOUND",
      match: brandMatch,
      confidence: brandMatch ? 1.0 : 0.0,
      notes: "",
    },
    classType: {
      detected: extracted.classType || "NOT FOUND",
      match: classMatch,
      confidence: classMatch ? 1.0 : 0.0,
      notes: "",
    },
    alcoholContent: {
      detected: extracted.alcoholContent || "NOT FOUND",
      match: alcoholMatch,
      confidence: alcoholMatch ? 1.0 : 0.0,
      notes: "",
    },
    netContents: {
      detected: extracted.netContents || "NOT FOUND",
      match: contentsMatch,
      confidence: contentsMatch ? 1.0 : 0.0,
      notes: "",
    },
    governmentWarning: {
      detected: extracted.governmentWarning || "NOT FOUND",
      match: warningMatch,
      confidence: warningMatch ? 1.0 : 0.0,
      notes: "",
    },
  }

  return { success: true, result }
}

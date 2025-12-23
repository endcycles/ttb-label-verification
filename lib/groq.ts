import type { LabelFormData, GroqComparisonResult } from "./types"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

/**
 * Vision prompt for single-call OCR + comparison using Llama 4 Scout
 */
const VISION_SYSTEM_PROMPT = `You are an expert TTB (Alcohol and Tobacco Tax and Trade Bureau) label verification specialist.
Look at this alcohol label image and compare what you see against the submitted application data.

## MATCHING RULES

### FUZZY MATCHING (Brand Name, Class/Type, Alcohol Content, Net Contents):
- Case-insensitive comparison
- Ignore punctuation differences (hyphens, apostrophes, periods)
- Normalize spacing
- Accept abbreviations: "Vol." = "Volume", "Alc." = "Alcohol"
- "45%" = "45% Alc./Vol." = "45% ALC/VOL"
- "750ml" = "750 mL" = "750 ML"

### STRICT MATCHING (Government Warning ONLY):
- Must be exact match after normalizing whitespace
- Complete text required, any missing/altered words = FAIL
- "GOVERNMENT WARNING:" prefix must be in ALL CAPS

## OUTPUT FORMAT
Return ONLY this JSON:
{
  "brandName": { "detected": "<text from label>", "match": true/false, "confidence": 0.0-1.0, "notes": "<reason>" },
  "classType": { "detected": "<text from label>", "match": true/false, "confidence": 0.0-1.0, "notes": "<reason>" },
  "alcoholContent": { "detected": "<text from label>", "match": true/false, "confidence": 0.0-1.0, "notes": "<reason>" },
  "netContents": { "detected": "<text from label>", "match": true/false, "confidence": 0.0-1.0, "notes": "<reason>" },
  "governmentWarning": { "detected": "<text from label or NOT FOUND>", "match": true/false, "confidence": 0.0-1.0, "notes": "<STRICT matching>" }
}`

export interface VisionResult {
  success: boolean
  result?: GroqComparisonResult
  error?: string
}

/**
 * Single-call vision: OCR + comparison in one request using Llama 4 Scout
 * ~1-2 seconds vs Mistral OCR (~7s) + Groq LLM (~1s)
 */
export async function verifyWithVision(
  imageBase64: string,
  imageType: string,
  formData: LabelFormData
): Promise<VisionResult> {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    return { success: false, error: "GROQ_API_KEY not configured" }
  }

  const userPrompt = `## SUBMITTED APPLICATION DATA:
- Brand Name: ${formData.brandName}
- Class/Type: ${formData.classType}
- Alcohol Content: ${formData.alcoholContent}
- Net Contents: ${formData.netContents}
- Government Warning: ${formData.governmentWarning}

Look at the label image and compare each field. Return JSON only.`

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          { role: "system", content: VISION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: { url: `data:${imageType};base64,${imageBase64}` },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Groq Vision API error: ${response.status} - ${errorText}`,
      }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return { success: false, error: "Empty response from Groq Vision" }
    }

    const result = JSON.parse(content) as GroqComparisonResult
    return { success: true, result }
  } catch (error) {
    return {
      success: false,
      error: `Vision verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

/**
 * Critical prompt that instructs Groq on matching rules:
 * - FUZZY matching for brand names, class/type, alcohol, net contents
 * - STRICT exact matching for government warning
 */
const COMPARISON_SYSTEM_PROMPT = `You are an expert TTB (Alcohol and Tobacco Tax and Trade Bureau) label verification specialist. Compare extracted OCR text from alcohol labels against submitted application data.

## MATCHING RULES

### FUZZY MATCHING (Brand Name, Class/Type, Alcohol Content, Net Contents):
- Case-insensitive comparison
- Ignore punctuation differences (hyphens, apostrophes, periods)
- Normalize spacing (multiple spaces = single space)
- Accept common abbreviations: "Vol." = "Volume", "Alc." = "Alcohol"
- For alcohol: "45%" = "45% Alc./Vol." = "45% ALC/VOL"
- For contents: "750ml" = "750 mL" = "750 ML"
- Consider OCR errors: "0" for "O", "1" for "l"

### STRICT MATCHING (Government Warning ONLY):
- Must be exact match after normalizing whitespace
- Complete text required, any missing/altered words = FAIL
- "GOVERNMENT WARNING:" prefix required

## OUTPUT FORMAT
Return ONLY this JSON (no markdown, no explanation):
{
  "brandName": {
    "detected": "<text found or NOT FOUND>",
    "match": true/false,
    "confidence": 0.0-1.0,
    "notes": "<brief reason>"
  },
  "classType": {
    "detected": "<text found or NOT FOUND>",
    "match": true/false,
    "confidence": 0.0-1.0,
    "notes": "<brief reason>"
  },
  "alcoholContent": {
    "detected": "<text found or NOT FOUND>",
    "match": true/false,
    "confidence": 0.0-1.0,
    "notes": "<brief reason>"
  },
  "netContents": {
    "detected": "<text found or NOT FOUND>",
    "match": true/false,
    "confidence": 0.0-1.0,
    "notes": "<brief reason>"
  },
  "governmentWarning": {
    "detected": "<text found or NOT FOUND>",
    "match": true/false,
    "confidence": 0.0-1.0,
    "notes": "<STRICT matching applied>"
  }
}

## CONFIDENCE SCORING
- 1.0: Exact or equivalent match
- 0.8-0.9: Minor variations, high confidence
- 0.5-0.7: Some uncertainty
- Below 0.5: Likely mismatch or not found`

export interface ComparisonResult {
  success: boolean
  result?: GroqComparisonResult
  error?: string
}

/**
 * Compare OCR-extracted text against submitted form data using Groq LLM
 */
export async function compareWithFormData(
  ocrText: string,
  formData: LabelFormData
): Promise<ComparisonResult> {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    return { success: false, error: "GROQ_API_KEY not configured" }
  }

  const userPrompt = `## OCR EXTRACTED TEXT FROM LABEL:
${ocrText}

## SUBMITTED APPLICATION DATA:
- Brand Name: ${formData.brandName}
- Class/Type: ${formData.classType}
- Alcohol Content: ${formData.alcoholContent}
- Net Contents: ${formData.netContents}
- Government Warning: ${formData.governmentWarning}

Compare each field. Return JSON only.`

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: COMPARISON_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Groq API error: ${response.status} - ${errorText}`,
      }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return { success: false, error: "Empty response from Groq" }
    }

    const result = JSON.parse(content) as GroqComparisonResult
    return { success: true, result }
  } catch (error) {
    return {
      success: false,
      error: `LLM comparison failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

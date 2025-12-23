const MISTRAL_API_URL = "https://api.mistral.ai/v1/ocr"

export interface OCRResult {
  success: boolean
  text: string
  error?: string
}

/**
 * Extract text from an image using Mistral OCR
 */
export async function extractTextFromImage(
  imageBase64: string,
  imageType: string
): Promise<OCRResult> {
  const apiKey = process.env.MISTRAL_API_KEY

  if (!apiKey) {
    return { success: false, text: "", error: "MISTRAL_API_KEY not configured" }
  }

  // Construct data URI for Mistral
  const dataUri = `data:${imageType};base64,${imageBase64}`

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: {
          type: "image_url",
          image_url: dataUri,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        text: "",
        error: `Mistral API error: ${response.status} - ${errorText}`,
      }
    }

    const data = await response.json()

    // Combine all pages into single text
    const combinedText = data.pages
      ?.map((page: { markdown: string }) => page.markdown)
      .join("\n\n") || ""

    return { success: true, text: combinedText }
  } catch (error) {
    return {
      success: false,
      text: "",
      error: `OCR request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

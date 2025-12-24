const MISTRAL_API_URL = "https://api.mistral.ai/v1/ocr"

export interface OCRResult {
  success: boolean
  text: string
  error?: string
}

export async function extractTextFromImage(
  imageBase64: string,
  imageType: string
): Promise<OCRResult> {
  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) {
    return { success: false, text: "", error: "MISTRAL_API_KEY not configured" }
  }

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
          image_url: `data:${imageType};base64,${imageBase64}`,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, text: "", error: `Mistral API error: ${response.status} - ${errorText}` }
    }

    const data = await response.json()
    const combinedText = data.pages?.map((page: { markdown: string }) => page.markdown).join("\n\n") || ""

    return { success: true, text: combinedText }
  } catch (error) {
    return {
      success: false,
      text: "",
      error: `OCR request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

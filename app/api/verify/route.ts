import { NextRequest, NextResponse } from "next/server"
import { verifyLabel } from "@/lib/verification"
import type { VerifyLabelRequest, VerifyLabelError } from "@/lib/types"

// Allow up to 30 seconds for Vercel
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VerifyLabelRequest

    // Validate required fields
    if (!body.imageBase64) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing imageBase64",
          code: "INVALID_INPUT",
        } as VerifyLabelError,
        { status: 400 }
      )
    }

    if (!body.formData?.brandName) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing brand name",
          code: "INVALID_INPUT",
        } as VerifyLabelError,
        { status: 400 }
      )
    }

    // Vercel limit is 4.5MB body, base64 adds ~33%, so ~20MB original is safe
    if (body.imageBase64.length > 25_000_000) {
      return NextResponse.json(
        {
          success: false,
          error: "Image too large. Maximum size is 20MB.",
          code: "INVALID_INPUT",
        } as VerifyLabelError,
        { status: 400 }
      )
    }

    // Perform verification
    const result = await verifyLabel(
      body.imageBase64,
      body.imageType || "image/jpeg",
      body.formData
    )

    // Return appropriate status code
    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        code: "UNKNOWN",
      } as VerifyLabelError,
      { status: 500 }
    )
  }
}

"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileImage, Loader2 } from "lucide-react"
import { VerificationResults } from "@/components/verification-results"
import { ImagePreview } from "@/components/image-preview"

const GOVERNMENT_WARNING = `GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.`

type VerificationState = "idle" | "processing" | "complete" | "error"

export function SingleVerification() {
  const [state, setState] = useState<VerificationState>("idle")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    brandName: "",
    classType: "",
    alcoholContent: "",
    netContents: "",
    governmentWarning: GOVERNMENT_WARNING,
  })
  const [results, setResults] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Ctrl+V paste support - works anywhere on page
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) {
            handleFileSelect(file)
            break
          }
        }
      }
    }

    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [])

  const handleFileSelect = (file: File) => {
    if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setState("idle")
      setResults(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleVerify = async () => {
    if (!imageFile) return

    setState("processing")

    try {
      // Convert image to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Remove data URI prefix (e.g., "data:image/jpeg;base64,")
          const base64Data = result.split(",")[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(imageFile)
      })

      // Call verification API
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          imageType: imageFile.type,
          formData: {
            brandName: formData.brandName,
            classType: formData.classType,
            alcoholContent: formData.alcoholContent,
            netContents: formData.netContents,
            governmentWarning: formData.governmentWarning,
          },
        }),
      })

      const result = await response.json()

      if (!result.success) {
        console.error("Verification failed:", result.error)
        setState("error")
        return
      }

      setResults({
        overall: result.overall,
        fields: result.fields,
        processingTimeMs: result.processingTimeMs,
      })
      setState("complete")
    } catch (error) {
      console.error("Verification error:", error)
      setState("error")
    }
  }

  const handleReset = () => {
    setImageFile(null)
    setImagePreview(null)
    setState("idle")
    setResults(null)
    setFormData({
      brandName: "",
      classType: "",
      alcoholContent: "",
      netContents: "",
      governmentWarning: GOVERNMENT_WARNING,
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left Column: Input */}
      <div className="space-y-6">
        {/* Image Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Label Image</CardTitle>
            <CardDescription className="text-base">Upload the label photo for verification</CardDescription>
          </CardHeader>
          <CardContent>
            {!imagePreview ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:border-primary hover:bg-muted/50"
              >
                <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 text-base font-medium text-foreground">Click, drag and drop, or Ctrl+V to paste</p>
                <p className="text-sm text-muted-foreground">JPG, PNG, or PDF (Max 10MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            ) : (
              <ImagePreview
                src={imagePreview || "/placeholder.svg"}
                filename={imageFile?.name || ""}
                onRemove={handleReset}
              />
            )}
          </CardContent>
        </Card>

        {/* Application Data Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Application Data</CardTitle>
            <CardDescription className="text-base">
              Enter the information from the submitted application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="brandName" className="text-base font-medium">
                Brand Name
              </Label>
              <Input
                id="brandName"
                value={formData.brandName}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                placeholder="e.g., Stone's Throw Whiskey"
                className="text-base h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="classType" className="text-base font-medium">
                Class/Type
              </Label>
              <Input
                id="classType"
                value={formData.classType}
                onChange={(e) => setFormData({ ...formData, classType: e.target.value })}
                placeholder="e.g., Kentucky Straight Bourbon Whiskey"
                className="text-base h-11"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="alcoholContent" className="text-base font-medium">
                  Alcohol Content
                </Label>
                <Input
                  id="alcoholContent"
                  value={formData.alcoholContent}
                  onChange={(e) => setFormData({ ...formData, alcoholContent: e.target.value })}
                  placeholder="e.g., 45% Alc./Vol."
                  className="text-base h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="netContents" className="text-base font-medium">
                  Net Contents
                </Label>
                <Input
                  id="netContents"
                  value={formData.netContents}
                  onChange={(e) => setFormData({ ...formData, netContents: e.target.value })}
                  placeholder="e.g., 750 mL"
                  className="text-base h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="governmentWarning" className="text-base font-medium">
                Government Warning
              </Label>
              <Textarea
                id="governmentWarning"
                value={formData.governmentWarning}
                onChange={(e) => setFormData({ ...formData, governmentWarning: e.target.value })}
                className="min-h-[120px] text-sm font-mono leading-relaxed"
              />
            </div>

            <Button
              onClick={handleVerify}
              disabled={!imageFile || !formData.brandName || state === "processing"}
              size="lg"
              className="w-full text-base h-12 font-semibold"
            >
              {state === "processing" ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing Label...
                </>
              ) : (
                "Verify Label"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Results */}
      <div>
        {state === "complete" && results ? (
          <VerificationResults results={results} onReset={handleReset} />
        ) : state === "idle" && !results ? (
          <Card className="border-dashed">
            <CardContent className="flex min-h-[400px] items-center justify-center p-12">
              <div className="text-center">
                <FileImage className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
                <p className="text-lg text-muted-foreground">
                  Upload a label and fill in the application data to begin verification
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

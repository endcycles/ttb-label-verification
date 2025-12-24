"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Loader2, X, CheckCircle2, XCircle, RotateCcw, FileDown, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FieldResult } from "@/lib/types"

const GOVERNMENT_WARNING = `GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.`

type VerificationState = "idle" | "processing" | "complete" | "error" | "timeout"

export function SingleVerification() {
  const [state, setState] = useState<VerificationState>("idle")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    brandName: "",
    classType: "",
    alcoholContent: "",
    netContents: "",
  })
  const [results, setResults] = useState<{ overall: "pass" | "fail"; fields: FieldResult[]; processingTimeMs?: number } | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) handleFileSelect(file)
          break
        }
      }
    }
    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [])

  useEffect(() => {
    if (state === "processing") {
      setElapsedTime(0)
      timerRef.current = setInterval(() => setElapsedTime((p) => p + 100), 100)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [state])

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target?.result as string)
      reader.readAsDataURL(file)
      setState("idle")
      setResults(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0])
  }

  const handleVerify = async () => {
    if (!imageFile) return
    setState("processing")

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000) // 25s timeout

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(",")[1])
        reader.onerror = reject
        reader.readAsDataURL(imageFile)
      })
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          imageType: imageFile.type,
          formData: { ...formData, governmentWarning: GOVERNMENT_WARNING }
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const result = await response.json()
      if (!result.success) { setState("error"); return }
      setResults({ overall: result.overall, fields: result.fields, processingTimeMs: result.processingTimeMs })
      setState("complete")
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === "AbortError") {
        setState("timeout")
      } else {
        setState("error")
      }
    }
  }

  const handleReset = () => {
    setImageFile(null)
    setImagePreview(null)
    setState("idle")
    setResults(null)
    setElapsedTime(0)
    setFormData({ brandName: "", classType: "", alcoholContent: "", netContents: "" })
  }

  const handleDownload = () => {
    if (!results) return
    const blob = new Blob([JSON.stringify({ timestamp: new Date().toISOString(), ...results }, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `verification-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (state === "complete" && results) {
    const failed = results.fields.filter((f) => !f.match)
    const passed = results.fields.filter((f) => f.match)
    const isPass = results.overall === "pass"

    return (
      <div className="animate-fade-in space-y-4">
        <div className={cn(
          "rounded-lg px-4 py-3 border flex items-center gap-3",
          isPass
            ? "bg-success/5 border-success/30"
            : "bg-destructive/5 border-destructive/30"
        )}>
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full shrink-0",
            isPass ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
          )}>
            {isPass
              ? <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
              : <XCircle className="h-5 w-5" strokeWidth={2.5} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              "font-serif text-xl font-bold tracking-tight leading-tight",
              isPass ? "text-success" : "text-destructive"
            )}>
              {isPass ? "Verified" : "Mismatch"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPass
                ? "All fields match"
                : `${failed.length} field${failed.length > 1 ? "s" : ""} did not match`
              }
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button onClick={handleReset} variant="outline" size="sm" className="gap-1.5 h-8">
              <RotateCcw className="h-3.5 w-3.5" />
              New
            </Button>
            <Button onClick={handleDownload} variant="outline" size="sm" className="gap-1.5 h-8">
              <FileDown className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>

        {/* Failed Fields */}
        {failed.length > 0 && (
          <div className="animate-slide-up delay-1 rounded-lg border border-destructive/20 bg-card p-3">
            <div className="grid sm:grid-cols-2 gap-2">
              {failed.map((f, i) => (
                <div key={i} className="rounded-md bg-muted/50 p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-medium text-foreground text-sm">{f.field}</p>
                    <span className="text-xs font-semibold text-destructive uppercase tracking-wide">Mismatch</span>
                  </div>
                  <div className="grid gap-0.5 text-xs">
                    <div className="flex items-start gap-1.5">
                      <span className="text-muted-foreground w-14 shrink-0">Expected:</span>
                      <span className="text-foreground break-words">{f.field === "Government Warning" ? "(standard warning)" : (f.submitted || "(empty)")}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-muted-foreground w-14 shrink-0">Found:</span>
                      <span className="text-destructive font-medium break-words">{f.field === "Government Warning" ? "(missing or incorrect)" : (f.detected || "(not found)")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Passed Fields */}
        {passed.length > 0 && (
          <div className="animate-slide-up delay-2 rounded-lg border border-success/20 bg-card p-3">
            <div className="grid sm:grid-cols-2 gap-2">
              {passed.map((f, i) => (
                f.field === "Government Warning" ? (
                  <div key={i} className="rounded-md bg-success/5 p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-medium text-foreground text-sm">Government Warning</p>
                      <span className="text-xs font-semibold text-success uppercase tracking-wide">Match</span>
                    </div>
                    <div className="grid gap-0.5 text-xs">
                      <div className="flex items-start gap-1.5">
                        <span className="text-muted-foreground w-14 shrink-0">Expected:</span>
                        <span className="text-foreground line-clamp-1">{f.submitted || "(empty)"}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-muted-foreground w-14 shrink-0">Found:</span>
                        <span className="text-success font-medium line-clamp-1">{f.detected || "(not found)"}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="rounded-md bg-success/5 p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-medium text-foreground text-sm">{f.field}</p>
                      <span className="text-xs font-semibold text-success uppercase tracking-wide">Match</span>
                    </div>
                    <div className="grid gap-0.5 text-xs">
                      <div className="flex items-start gap-1.5">
                        <span className="text-muted-foreground w-14 shrink-0">Expected:</span>
                        <span className="text-foreground">{f.submitted || "(empty)"}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-muted-foreground w-14 shrink-0">Found:</span>
                        <span className="text-success font-medium">{f.detected || "(not found)"}</span>
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {results.processingTimeMs && (
          <p className="text-xs text-muted-foreground text-center">
            {(results.processingTimeMs / 1000).toFixed(1)}s
          </p>
        )}
      </div>
    )
  }

  if (state === "processing") {
    const isSlowRequest = elapsedTime > 10000
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        </div>
        <p className="font-medium text-foreground mt-5">
          {isSlowRequest ? "Still processing..." : "Analyzing label..."}
        </p>
        <p className="text-sm text-muted-foreground mt-1 font-mono">
          {(elapsedTime / 1000).toFixed(1)}s
        </p>
        {isSlowRequest && (
          <p className="text-xs text-muted-foreground mt-2 text-center max-w-xs">
            Taking longer than expected. Please wait.
          </p>
        )}
      </div>
    )
  }

  if (state === "timeout") {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Clock className="h-6 w-6" />
        </div>
        <p className="font-medium text-foreground mt-5">Request timed out</p>
        <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">
          The server took too long to respond. Please try again.
        </p>
        <Button onClick={() => setState("idle")} size="sm" className="mt-5">
          Try Again
        </Button>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <XCircle className="h-6 w-6" />
        </div>
        <p className="font-medium text-destructive mt-5">Verification failed</p>
        <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">
          Unable to process image. Try a clearer photo.
        </p>
        <Button onClick={() => setState("idle")} size="sm" className="mt-5">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="grid lg:grid-cols-[280px_1fr] gap-10">

        {/* LEFT: Image Upload */}
        <div className="space-y-2">
          {!imagePreview ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "group relative h-56 flex flex-col items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200",
                "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Upload className="h-5 w-5" />
              </div>
              <p className="font-medium text-foreground mt-3 text-sm">Drop image here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
            </div>
          ) : (
            <div className="relative h-56 rounded-lg border border-border bg-card overflow-hidden">
              <img src={imagePreview} alt="Label preview" className="w-full h-full object-contain p-2" />
              <button
                onClick={(e) => { e.stopPropagation(); handleReset() }}
                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-md bg-foreground/80 hover:bg-foreground text-background transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            3MB max any image format
          </p>
        </div>

        {/* RIGHT: Form Fields */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (imageFile && formData.brandName && formData.classType && formData.alcoholContent && formData.netContents) {
              handleVerify()
            }
          }}
          className="space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Brand Name
              </label>
              <Input
                value={formData.brandName}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                placeholder="e.g. Old Tom Distillery"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Class / Type
              </label>
              <Input
                value={formData.classType}
                onChange={(e) => setFormData({ ...formData, classType: e.target.value })}
                placeholder="e.g. Bourbon Whiskey"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Alcohol Content
              </label>
              <Input
                value={formData.alcoholContent}
                onChange={(e) => setFormData({ ...formData, alcoholContent: e.target.value })}
                placeholder="e.g. 45% ALC/VOL"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Net Contents
              </label>
              <Input
                value={formData.netContents}
                onChange={(e) => setFormData({ ...formData, netContents: e.target.value })}
                placeholder="e.g. 750 mL"
              />
            </div>
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              disabled={!imageFile || !formData.brandName || !formData.classType || !formData.alcoholContent || !formData.netContents}
              size="lg"
              className="w-full font-semibold h-11"
            >
              Verify Label
            </Button>
            {(!imageFile || !formData.brandName || !formData.classType || !formData.alcoholContent || !formData.netContents) && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                {!imageFile ? "Upload an image to continue" : "Fill in all fields to continue"}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

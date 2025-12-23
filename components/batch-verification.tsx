"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, CheckCircle2, XCircle, Clock, Loader2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface BatchItem {
  id: string
  filename: string
  file: File
  preview: string
  status: "pending" | "processing" | "pass" | "fail"
}

export function BatchVerification() {
  const [items, setItems] = useState<BatchItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Add files without duplicates (by filename)
  const addFiles = (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith("image/") || f.type === "application/pdf")

    setItems(prev => {
      const existingNames = new Set(prev.map(i => i.filename))
      const newItems: BatchItem[] = []

      for (const file of imageFiles) {
        if (!existingNames.has(file.name)) {
          existingNames.add(file.name)
          newItems.push({
            id: `${file.name}-${Date.now()}-${Math.random()}`,
            filename: file.name,
            file,
            preview: URL.createObjectURL(file),
            status: "pending",
          })
        }
      }

      return [...prev, ...newItems]
    })
  }

  // Ctrl+V paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const files: File[] = []
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }
      if (files.length > 0) addFiles(files)
    }

    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    addFiles(files)
    e.target.value = "" // Reset to allow re-selecting same files
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleProcess = async () => {
    setIsProcessing(true)

    // Simulate processing each item
    for (let i = 0; i < items.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, status: "processing" as const } : item)))

      await new Promise((resolve) => setTimeout(resolve, 1200))
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: Math.random() > 0.3 ? ("pass" as const) : ("fail" as const) } : item,
        ),
      )
    }

    setIsProcessing(false)
  }

  const summary = {
    total: items.length,
    pass: items.filter((i) => i.status === "pass").length,
    fail: items.filter((i) => i.status === "fail").length,
    pending: items.filter((i) => i.status === "pending").length,
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Batch Label Upload</CardTitle>
          <CardDescription className="text-base">
            Upload multiple label images for batch verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:border-primary hover:bg-muted/50"
            >
              <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-base font-medium text-foreground">Upload Label Images</p>
              <p className="text-sm text-muted-foreground mb-2">Click to select or Ctrl+V to paste</p>
              <p className="text-sm text-muted-foreground">JPG, PNG, PDF (up to 300 images)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid gap-4 sm:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-foreground">{summary.total}</p>
                      <p className="text-sm text-muted-foreground mt-1">Total</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-success/30 bg-success/5">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-success">{summary.pass}</p>
                      <p className="text-sm text-muted-foreground mt-1">Passed</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-destructive">{summary.fail}</p>
                      <p className="text-sm text-muted-foreground mt-1">Failed</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-muted-foreground">{summary.pending}</p>
                      <p className="text-sm text-muted-foreground mt-1">Pending</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Items List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Processing Queue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                      >
                        <div className="flex items-center gap-3">
                          {item.status === "pending" && <Clock className="h-5 w-5 text-muted-foreground" />}
                          {item.status === "processing" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                          {item.status === "pass" && <CheckCircle2 className="h-5 w-5 text-success" />}
                          {item.status === "fail" && <XCircle className="h-5 w-5 text-destructive" />}
                          <span className="text-sm font-medium">{item.filename}</span>
                        </div>
                        <Badge
                          variant={
                            item.status === "pass"
                              ? "default"
                              : item.status === "fail"
                                ? "destructive"
                                : item.status === "processing"
                                  ? "default"
                                  : "outline"
                          }
                        >
                          {item.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleProcess}
                  disabled={isProcessing || summary.pending === 0}
                  size="lg"
                  className="flex-1 text-base h-12"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing Batch...
                    </>
                  ) : (
                    "Start Verification"
                  )}
                </Button>
                <Button onClick={() => setItems([])} variant="outline" size="lg" className="text-base h-12">
                  Reset
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

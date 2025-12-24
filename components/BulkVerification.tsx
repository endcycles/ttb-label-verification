"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { BulkItemRow } from "@/components/BulkItemRow"
import { BulkResultsTable } from "@/components/BulkResultsTable"
import { Plus, Play, Loader2, RotateCcw } from "lucide-react"
import type { BulkItem } from "@/lib/types"

const GOVERNMENT_WARNING = `GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.`

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function createEmptyItem(): BulkItem {
  return {
    id: generateId(),
    imageFile: null,
    imagePreview: null,
    formData: {
      brandName: "",
      classType: "",
      alcoholContent: "",
      netContents: "",
    },
    status: "pending",
  }
}

export function BulkVerification() {
  const [items, setItems] = useState<BulkItem[]>([createEmptyItem()])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)
  const [showResults, setShowResults] = useState(false)

  const addItem = () => {
    setItems([...items, createEmptyItem()])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id: string, updates: Partial<BulkItem>) => {
    setItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const isReadyToVerify = items.every(
    (item) =>
      item.imageFile &&
      item.formData.brandName &&
      item.formData.classType &&
      item.formData.alcoholContent &&
      item.formData.netContents
  )

  const handleVerifyAll = async () => {
    setIsProcessing(true)
    setShowResults(false)

    for (let i = 0; i < items.length; i++) {
      setCurrentIndex(i)
      const item = items[i]

      // Update status to processing
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: "processing" as const } : it))
      )

      try {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(",")[1])
          reader.onerror = reject
          reader.readAsDataURL(item.imageFile!)
        })

        // Call existing API
        const response = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            imageType: item.imageFile!.type,
            formData: { ...item.formData, governmentWarning: GOVERNMENT_WARNING },
          }),
        })

        const result = await response.json()

        if (result.success) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: "complete" as const,
                    result: {
                      overall: result.overall,
                      fields: result.fields,
                      processingTimeMs: result.processingTimeMs,
                    },
                  }
                : it
            )
          )
        } else {
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? { ...it, status: "error" as const, error: result.error || "Verification failed" }
                : it
            )
          )
        }
      } catch {
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: "error" as const, error: "Network error" } : it
          )
        )
      }
    }

    setIsProcessing(false)
    setCurrentIndex(null)
    setShowResults(true)
  }

  const handleReset = () => {
    setItems([createEmptyItem()])
    setShowResults(false)
    setIsProcessing(false)
    setCurrentIndex(null)
  }

  // Processing state
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        </div>
        <p className="font-medium text-foreground mt-5">
          Processing {currentIndex !== null ? currentIndex + 1 : 1} of {items.length}...
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {items[currentIndex ?? 0]?.formData.brandName || "Loading..."}
        </p>
      </div>
    )
  }

  // Results state
  if (showResults) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Batch Results</h2>
            <p className="text-sm text-muted-foreground">
              {items.filter((i) => i.result?.overall === "pass").length} of {items.length} passed
            </p>
          </div>
          <Button onClick={handleReset} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            New Batch
          </Button>
        </div>
        <BulkResultsTable items={items} />
      </div>
    )
  }

  // Input state
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map((item, index) => (
          <BulkItemRow
            key={item.id}
            item={item}
            index={index}
            onUpdate={(updates) => updateItem(item.id, updates)}
            onRemove={() => removeItem(item.id)}
            canRemove={items.length > 1}
          />
        ))}
      </div>

      <div className="flex gap-3">
        <Button onClick={addItem} variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
        <Button onClick={handleVerifyAll} disabled={!isReadyToVerify} className="gap-2 flex-1">
          <Play className="h-4 w-4" />
          Verify All ({items.length})
        </Button>
      </div>

      {!isReadyToVerify && (
        <p className="text-xs text-muted-foreground text-center">
          Fill in all fields and upload images for each item to continue
        </p>
      )}
    </div>
  )
}

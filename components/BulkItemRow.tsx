"use client"

import { useRef } from "react"
import { Input } from "@/components/ui/input"
import { Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BulkItem } from "@/lib/types"

interface BulkItemRowProps {
  item: BulkItem
  index: number
  onUpdate: (updates: Partial<BulkItem>) => void
  onRemove: () => void
  canRemove: boolean
}

export function BulkItemRow({ item, index, onUpdate, onRemove, canRemove }: BulkItemRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        onUpdate({
          imageFile: file,
          imagePreview: e.target?.result as string,
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const updateFormData = (field: keyof BulkItem["formData"], value: string) => {
    onUpdate({
      formData: { ...item.formData, [field]: value },
    })
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium w-6 shrink-0">
        {index + 1}
      </div>

      {/* Image Upload */}
      {!item.imagePreview ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "w-16 h-16 shrink-0 flex flex-col items-center justify-center rounded-md border-2 border-dashed cursor-pointer transition-colors",
            "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
          )}
        >
          <Upload className="h-4 w-4 text-muted-foreground" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
        </div>
      ) : (
        <div className="w-16 h-16 shrink-0 rounded-md border border-border overflow-hidden relative group">
          <img src={item.imagePreview} alt="Preview" className="w-full h-full object-cover" />
          <button
            onClick={() => onUpdate({ imageFile: null, imagePreview: null })}
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      )}

      {/* Form Fields */}
      <div className="flex-1 grid grid-cols-4 gap-2">
        <Input
          placeholder="Brand Name"
          value={item.formData.brandName}
          onChange={(e) => updateFormData("brandName", e.target.value)}
          className="h-8 text-sm"
        />
        <Input
          placeholder="Class/Type"
          value={item.formData.classType}
          onChange={(e) => updateFormData("classType", e.target.value)}
          className="h-8 text-sm"
        />
        <Input
          placeholder="ABV"
          value={item.formData.alcoholContent}
          onChange={(e) => updateFormData("alcoholContent", e.target.value)}
          className="h-8 text-sm"
        />
        <Input
          placeholder="Net Contents"
          value={item.formData.netContents}
          onChange={(e) => updateFormData("netContents", e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        disabled={!canRemove}
        className={cn(
          "w-8 h-8 shrink-0 flex items-center justify-center rounded-md transition-colors self-center",
          canRemove
            ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            : "text-muted-foreground/30 cursor-not-allowed"
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

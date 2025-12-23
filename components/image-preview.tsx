"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImagePreviewProps {
  src: string
  filename: string
  onRemove: () => void
}

export function ImagePreview({ src, filename, onRemove }: ImagePreviewProps) {
  return (
    <div className="relative">
      <img
        src={src || "/placeholder.svg"}
        alt="Label preview"
        className="w-full rounded-lg border border-border bg-muted"
      />
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground truncate flex-1">{filename}</p>
        <Button variant="outline" size="sm" onClick={onRemove}>
          <X className="h-4 w-4 mr-1" />
          Remove
        </Button>
      </div>
    </div>
  )
}

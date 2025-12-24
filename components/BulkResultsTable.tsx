"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, FileDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BulkItem } from "@/lib/types"

interface BulkResultsTableProps {
  items: BulkItem[]
}

export function BulkResultsTable({ items }: BulkResultsTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const handleExport = () => {
    const exportData = items.map((item, index) => ({
      index: index + 1,
      brandName: item.formData.brandName,
      classType: item.formData.classType,
      alcoholContent: item.formData.alcoholContent,
      netContents: item.formData.netContents,
      status: item.status,
      overall: item.result?.overall || null,
      fields: item.result?.fields || [],
      processingTimeMs: item.result?.processingTimeMs || null,
      error: item.error || null,
    }))

    const blob = new Blob([JSON.stringify({ timestamp: new Date().toISOString(), results: exportData }, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bulk-verification-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border overflow-hidden">
        {items.map((item, index) => {
          const isExpanded = expandedIds.has(item.id)
          const isPass = item.result?.overall === "pass"
          const isError = item.status === "error"

          return (
            <div key={item.id} className={cn("border-b border-border last:border-b-0", isExpanded && "bg-muted/30")}>
              {/* Row Header */}
              <button
                onClick={() => {
                  setExpandedIds(prev => {
                    const next = new Set(prev)
                    if (next.has(item.id)) {
                      next.delete(item.id)
                    } else {
                      next.add(item.id)
                    }
                    return next
                  })
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
              >
                <span className="text-sm text-muted-foreground w-6">{index + 1}</span>

                {item.imagePreview && (
                  <div className="w-10 h-10 rounded border border-border overflow-hidden shrink-0">
                    <img src={item.imagePreview} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.formData.brandName}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.formData.classType}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isError ? (
                    <span className="flex items-center gap-1.5 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-semibold">ERROR</span>
                    </span>
                  ) : isPass ? (
                    <span className="flex items-center gap-1.5 text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-semibold">PASS</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-destructive">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm font-semibold">FAIL</span>
                    </span>
                  )}

                  {item.result?.processingTimeMs && (
                    <span className="text-xs text-muted-foreground">
                      {(item.result.processingTimeMs / 1000).toFixed(1)}s
                    </span>
                  )}

                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1">
                  {isError ? (
                    <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                      {item.error}
                    </div>
                  ) : item.result?.fields ? (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {item.result.fields.map((field, i) => (
                        <div
                          key={i}
                          className={cn(
                            "rounded-md p-2.5",
                            field.match ? "bg-success/5" : "bg-destructive/5"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-foreground text-sm">{field.field}</p>
                            <span
                              className={cn(
                                "text-xs font-semibold uppercase tracking-wide",
                                field.match ? "text-success" : "text-destructive"
                              )}
                            >
                              {field.match ? "Match" : "Mismatch"}
                            </span>
                          </div>
                          <div className="grid gap-0.5 text-xs">
                            <div className="flex items-start gap-1.5">
                              <span className="text-muted-foreground w-14 shrink-0">Expected:</span>
                              <span className="text-foreground break-words">{field.submitted || "(empty)"}</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="text-muted-foreground w-14 shrink-0">Found:</span>
                              <span
                                className={cn(
                                  "font-medium break-words",
                                  field.match ? "text-success" : "text-destructive"
                                )}
                              >
                                {field.detected || "(not found)"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
          <FileDown className="h-4 w-4" />
          Export All
        </Button>
      </div>
    </div>
  )
}

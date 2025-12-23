"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, FileDown, RotateCcw, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface FieldResult {
  field: string
  submitted: string
  detected: string
  match: boolean
  confidence: number
}

interface VerificationResultsProps {
  results: {
    overall: "pass" | "fail"
    fields: FieldResult[]
    processingTimeMs?: number
  }
  onReset: () => void
}

export function VerificationResults({ results, onReset }: VerificationResultsProps) {
  const failedFields = results.fields.filter((f) => !f.match)

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card
        className={cn(
          "border-2",
          results.overall === "pass" ? "border-success bg-success/5" : "border-destructive bg-destructive/5",
        )}
      >
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center justify-center gap-4">
            {results.overall === "pass" ? (
              <CheckCircle2 className="h-16 w-16 text-success" strokeWidth={2.5} />
            ) : (
              <XCircle className="h-16 w-16 text-destructive" strokeWidth={2.5} />
            )}
            <div>
              <p className="text-3xl font-bold text-foreground">{results.overall === "pass" ? "PASS" : "FAIL"}</p>
              <p className="text-base text-muted-foreground mt-1">
                {results.overall === "pass"
                  ? "All fields verified successfully"
                  : `${failedFields.length} ${failedFields.length === 1 ? "field" : "fields"} did not match`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Field-by-Field Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Field Verification Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.fields.map((field, index) => (
            <div
              key={index}
              className={cn(
                "rounded-lg border p-4",
                field.match ? "border-border bg-card" : "border-destructive/30 bg-destructive/5",
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {field.match ? (
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
                  )}
                  <div>
                    <p className="text-base font-semibold text-foreground">{field.field}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {Math.round(field.confidence * 100)}% confidence
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="ml-8 space-y-2 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Submitted:</span>
                  <p className="mt-1 text-foreground">{field.submitted}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Detected:</span>
                  <p className={cn("mt-1", field.match ? "text-foreground" : "text-destructive font-medium")}>
                    {field.detected}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Processing Time */}
      {results.processingTimeMs && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm">
            Verified in <span className={cn(
              "font-semibold",
              results.processingTimeMs <= 5000 ? "text-success" : "text-destructive"
            )}>{(results.processingTimeMs / 1000).toFixed(1)}s</span>
            {results.processingTimeMs <= 5000 && " ✓"}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={onReset} variant="outline" size="lg" className="flex-1 text-base h-11 bg-transparent">
          <RotateCcw className="mr-2 h-5 w-5" />
          Verify Another Label
        </Button>
        <Button variant="outline" size="lg" className="flex-1 text-base h-11 bg-transparent">
          <FileDown className="mr-2 h-5 w-5" />
          Download Report
        </Button>
      </div>
    </div>
  )
}

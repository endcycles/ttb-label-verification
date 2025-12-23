"use client"
import { SingleVerification } from "@/components/single-verification"

export function LabelVerificationApp() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <div className="flex items-center gap-4 select-none pointer-events-none">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-serif text-base font-bold tracking-tight">
              TTB
            </div>
            <div>
              <h1 className="font-serif text-lg font-semibold text-foreground tracking-tight leading-tight">
                Label Verification System
              </h1>
              <p className="text-sm text-muted-foreground leading-tight">
                Alcohol and Tobacco Tax and Trade Bureau
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-4">
        <SingleVerification />
      </main>
    </div>
  )
}

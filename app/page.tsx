"use client"

import { useState } from "react"
import { SingleVerification } from "@/components/SingleVerification"
import { BulkVerification } from "@/components/BulkVerification"
import { cn } from "@/lib/utils"

export default function Page() {
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single")

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <div className="flex items-center justify-between">
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

            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("single")}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  activeTab === "single"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Single
              </button>
              <button
                onClick={() => setActiveTab("bulk")}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  activeTab === "bulk"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Bulk
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-4">
        {activeTab === "single" ? <SingleVerification /> : <BulkVerification />}
      </main>
    </div>
  )
}

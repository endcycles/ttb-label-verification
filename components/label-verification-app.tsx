"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SingleVerification } from "@/components/single-verification"
import { BatchVerification } from "@/components/batch-verification"

export function LabelVerificationApp() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1400px] px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded bg-primary text-primary-foreground text-xl font-bold">
              DOT
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Label Verification System</h1>
              <p className="text-sm text-muted-foreground">Alcohol and Tobacco Tax and Trade Bureau</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="mb-8 grid w-full max-w-md grid-cols-2 h-12">
            <TabsTrigger value="single" className="text-base">
              Single Label
            </TabsTrigger>
            <TabsTrigger value="batch" className="text-base">
              Batch Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-0">
            <SingleVerification />
          </TabsContent>

          <TabsContent value="batch" className="mt-0">
            <BatchVerification />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

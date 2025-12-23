# TTB Label Verification System

AI-powered verification tool for TTB (Alcohol and Tobacco Tax and Trade Bureau) label compliance.

## The Problem

TTB reviews ~150,000 label applications annually with 47 agents. Half their time is spent on data entry verification: does the label match the application? A previous vendor pilot failed at 30-40 seconds per label. If results take longer than 5 seconds, agents bypass the tool entirely.

## What This Tool Does

Agent uploads label image + enters application data. Tool returns PASS or FAIL with field-by-field breakdown. Under 5 seconds.

## Architecture

```
Image → Mistral OCR → extracted text → LLM (Groq or OpenRouter) → field extraction → deterministic matching → results
```

**Why this approach:**

1. **Mistral OCR** extracts raw text from the image
2. **LLM** extracts specific fields (brand name, ABV, etc.) from that text
3. **Deterministic code** handles matching logic - not the LLM

The LLM extracts; code matches. This ensures consistent, explainable results that comply with regulatory requirements.

## Regulatory Framework

### Primary Laws

| Law | Citation | Purpose |
|-----|----------|---------|
| Federal Alcohol Administration Act | 27 U.S.C. Chapter 8, Section 205(e) | Requires COLAs, prevents consumer deception |
| Alcoholic Beverage Labeling Act (1988) | 27 U.S.C. 213-219 | Mandates health warning statement |

### Implementing Regulations

| Regulation | Beverage Type |
|------------|---------------|
| 27 CFR Part 4 | Wine labeling |
| 27 CFR Part 5 | Distilled spirits labeling |
| 27 CFR Part 7 | Malt beverages labeling |
| 27 CFR Part 16 | Health warning statements |

### Key Rulemakings

- **T.D. TTB-158** (April 2020): Class/type flexibility, updated tolerances
- **T.D. TTB-176** (February 2022): Reorganized regulations, specialty products class

## Matching Logic

Implements TTB regulatory tolerances per **T.D. TTB-158** and **27 CFR Parts 4, 5, 7**.

| Field | Logic | Example | Regulation |
|-------|-------|---------|------------|
| Brand Name | Fuzzy | "STONE'S THROW" = "Stone's Throw" | Case/punctuation insensitive |
| Class/Type | TTB Hierarchy | "Whisky" matches "Kentucky Straight Bourbon Whiskey" | T.D. TTB-158 (specific ≥ general) |
| Alcohol Content | ±0.3% tolerance | 40% matches 39.7%-40.3% | 27 CFR 5.37(b) |
| Net Contents | Unit normalization | "750ml" = "750 ML" | Must match standard of fill |
| **Government Warning** | **Exact match** | Must be verbatim, "GOVERNMENT WARNING:" in all caps | 27 CFR Part 16 |

### Class/Type Hierarchy (T.D. TTB-158)

The matching logic implements TTB's designation flexibility rules:

| Label Says | Application Says | Result | Rule |
|------------|------------------|--------|------|
| "Kentucky Straight Bourbon Whiskey" | "Whisky" | PASS | Specific ≥ General |
| "Bourbon Whiskey" | "Straight Bourbon Whiskey" | PASS | "Straight" is optional |
| "Tequila" | "Agave Spirits" | PASS | Equivalent designations |
| "Citrus Wine" | "Fruit Wine" | PASS | Subcategory valid |

### Alcohol Content Tolerances

| Beverage Type | Tolerance | Example |
|---------------|-----------|---------|
| Distilled Spirits | ±0.3% | Label: 40%, Actual: 39.7%-40.3% OK |
| Malt Beverages (≥0.5% ABV) | ±0.3% | Label: 5%, Actual: 4.7%-5.3% OK |
| Wine (>14% ABV) | ±1.0% | Label: 15%, Actual: 14%-16% OK |
| Wine (≤14% ABV) | ±1.5% | Label: 12%, Actual: 10.5%-13.5% OK |

### Government Warning (Strict)

The warning check is strict by regulation. A junior agent caught a label using "Government Warning" (title case) - rejected. This tool enforces that.

**Required format:**
- "GOVERNMENT WARNING:" must be ALL CAPS and bold
- Exact prescribed text following
- Must be separate from all other information

## Provider Selection

### OCR: Mistral OCR

- **Cost:** $2 per 1,000 pages
- **Performance:** SOTA accuracy, outperforms enterprise OCR solutions
- **Why:** Fast, accurate, cost-effective. Could run locally in future if needed.

Source: [mistral.ai/news/mistral-ocr-3](https://mistral.ai/news/mistral-ocr-3)

### LLM: Field Extraction

Two providers available. Set `LLM_PROVIDER` in `.env` to switch:

| Provider | Model | Speed | Cost | Status |
|----------|-------|-------|------|--------|
| **Groq** (default) | openai/gpt-oss-20b | ~1000 tok/s | $0.10/M in, $0.50/M out | Production |
| OpenRouter | google/gemini-3-flash-preview | ~200 tok/s | $0.10/M in, $0.40/M out | Alternative |

Both providers pass all E2E tests. Groq is ~5x faster with similar pricing.

## Performance

| Image Size | Average Response Time |
|------------|----------------------|
| Standard (~1MB) | **~2.9 seconds** |
| Large (5-6MB, 2K/4K) | ~8.9 seconds |

Meets the 5-second requirement for typical label images.

## Batch Upload (Ready to Implement)

Stakeholder mentioned batch processing for 200-300 labels during peak season. Architecture supports this; awaiting format specification.

**Why not built:** Unknown data format. CSV? Excel? COLA export? Building without specs would be guessing.

**Likely implementation:**
```
CSV columns: image_url, brand_name, class_type, abv, net_contents
↓
Process each row through existing verification pipeline
↓
Return results table with pass/fail per row
```

Would adapt to actual COLA export structure once specified. The single-label pipeline handles the hard part; batch is orchestration.

## Setup

```bash
# Clone and install
git clone <repo>
cd demo
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys:
# - MISTRAL_API_KEY (required) - https://console.mistral.ai/
# - LLM_PROVIDER (optional) - "groq" (default) or "openrouter"
# - GROQ_API_KEY (if using Groq) - https://console.groq.com/
# - OPENROUTER_API_KEY (if using OpenRouter) - https://openrouter.ai/

# Run
pnpm dev
```

## Testing

```bash
pnpm test        # Watch mode
pnpm test:unit   # 33 unit tests, no API keys needed
pnpm test:run    # All tests (43 total with E2E)
```

### Test Structure

```
lib/__tests__/
└── label-verification.test.ts  # Unit + E2E tests

public/
├── test-1-exact-match.jpg      # All fields match
├── test-2-fuzzy-match.jpg      # Case/punctuation variations
└── test-3-wrong-warning.jpg    # Government warning mismatch
```

### Test Summary (43 tests)

| Category | Tests | API Required |
|----------|-------|--------------|
| Unit: Matching Logic | 33 | No |
| E2E: Groq Provider | 5 | MISTRAL_API_KEY, GROQ_API_KEY |
| E2E: OpenRouter Provider | 5 | MISTRAL_API_KEY, OPENROUTER_API_KEY |

### Unit Tests (33 tests)

Tests deterministic matching functions without API calls:

| Category | Tests | Description |
|----------|-------|-------------|
| Alcohol Content | 11 | ±0.3% tolerance per 27 CFR 5.37(b) |
| Class/Type (TTB Hierarchy) | 14 | T.D. TTB-158 designation rules |
| Brand Name Matching | 6 | Case, punctuation, diacritics, whitespace |
| Net Contents | 2 | Unit normalization (mL, L, etc.) |

### Edge Cases Covered

**Class/Type Matching:**
| Scenario | Expected | Rule |
|----------|----------|------|
| `"Whisky"` vs `"Kentucky Straight Bourbon Whiskey"` | PASS | Specific ≥ General |
| `"Bourbon Whiskey"` vs `"Straight Bourbon Whiskey"` | PASS | "Straight" is optional |
| `"Agave Spirits"` vs `"Tequila"` | PASS | Equivalent designations |
| `"Bourbon Whiskey"` vs `"Rye Whiskey"` | FAIL | Different subtypes |

**Brand Name Matching:**
| Scenario | Expected |
|----------|----------|
| `"STONE'S THROW"` vs `"Stone's Throw"` | PASS |
| `"Jack Daniel's"` vs `"Jack Daniels"` | PASS |
| `"Château Margaux"` vs `"Chateau Margaux"` | PASS |
| `"Grey Goose"` vs `"Gray Goose"` | FAIL |

**Alcohol Content (±0.3%):**
| Scenario | Expected |
|----------|----------|
| `"40%"` vs `"40.3%"` | PASS (at boundary) |
| `"40%"` vs `"40.5%"` | FAIL (exceeds tolerance) |
| `"45%"` vs `"45% Alc./Vol. (90 Proof)"` | PASS |

**Government Warning (STRICTEST):**
| Scenario | Expected | Reason |
|----------|----------|--------|
| Correct text + formatting | PASS | Full compliance |
| `"Government Warning:"` (title case) | FAIL | Must be all caps |
| Paraphrased text | FAIL | Must be verbatim |

## Deployment

Deployed on Vercel via CLI. Rollback to any git commit as needed.

```bash
vercel --prod
```

Could configure custom CI/CD on VPS, but Vercel handles this demo well.

## Project Structure

```
lib/
├── ocr.ts          # OCR extraction (Mistral API)
├── llm.ts          # Field extraction (Groq or OpenRouter)
├── matching.ts     # Deterministic matching logic
├── verification.ts # Orchestration
└── types.ts        # TypeScript interfaces

components/
└── single-verification.tsx  # Main UI

app/
└── api/verify/route.ts      # POST endpoint
```

## Design Decisions

### Accessibility

Target users include agents over 50. Design choices:
- Explicit "MATCH" / "MISMATCH" labels (not just icons)
- Full text display, no truncation
- Large buttons, clear status indicators

### Government Warning Handling

The standard warning is constant across all labels. Instead of requiring agents to enter it every time, the system auto-includes it. Less friction, zero chance of typos.

### Timeout Handling

Client-side 25-second timeout with "Still processing..." feedback at 10 seconds. Server timeout is 30 seconds, but users need UI feedback if something hangs.

## Trade-offs

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Feature scope | Single-label only | Ship what's specified, document gaps |
| Text display | Full text, dynamic height | Compliance accuracy over aesthetic consistency |
| Error messages | Generic to users | No actionable debug info exposed |
| Batch upload | Not built | Unknown format, would be guessing |
| LLM provider | Dual (Groq + OpenRouter) | Swappable via env var for flexibility |
| OCR markdown | Post-process cleanup | Mistral OCR outputs markdown; we strip `#` prefixes |
| Matching logic | Deterministic code | LLM extracts, code matches - explainable results |

## Requirements Coverage

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Brand name verification | Implemented | Fuzzy (case, punctuation, diacritics) |
| Class/type verification | Implemented | TTB hierarchy per T.D. TTB-158 |
| Alcohol content verification | Implemented | ±0.3% tolerance per 27 CFR 5.37(b) |
| Net contents verification | Implemented | Unit normalization |
| Government warning verification | Implemented | Strict exact match per 27 CFR Part 16 |
| < 5 second response time | Met | ~2.9s average |
| Simple UI ("grandma-proof") | Implemented | Explicit labels, large buttons |
| Batch upload | Ready | Awaiting format specification |

## Regulatory References

### Primary Sources
- [TTB Labeling Resources](https://www.ttb.gov/regulated-commodities/labeling/labeling-resources)
- [Distilled Spirits Labeling](https://www.ttb.gov/regulated-commodities/beverage-alcohol/distilled-spirits/labeling)
- [Wine Labeling](https://www.ttb.gov/regulated-commodities/beverage-alcohol/wine/labeling-wine)
- [Malt Beverage Labeling](https://www.ttb.gov/regulated-commodities/beverage-alcohol/beer/labeling-and-formulation)

### Beverage Alcohol Manuals
- [Distilled Spirits BAM (PDF)](https://www.ttb.gov/system/files/images/pdfs/spirits_bam/complete-distilled-spirit-beverage-alcohol-manual.pdf)
- [Wine BAM (PDF)](https://www.ttb.gov/system/files/images/pdfs/wine_bam/complete-wine-beverage-alcohol-manual.pdf)
- [Malt Beverages BAM (PDF)](https://www.ttb.gov/system/files/images/pdfs/beer-bam/complete-malt-beverage-alcohol-manual.pdf)

### Interactive Tools
- [Anatomy of a Distilled Spirits Label](https://www.ttb.gov/ds-labeling-home/anatomy-of-a-distilled-spirits-label-tool)
- [Anatomy of a Wine Label](https://www.ttb.gov/wine/anatomy-of-a-label)
- [Anatomy of a Malt Beverage Label](https://www.ttb.gov/regulated-commodities/beverage-alcohol/beer/labeling/anatomy-of-a-malt-beverage-label-tool)

### Code of Federal Regulations
- 27 CFR Part 4: Wine
- 27 CFR Part 5: Distilled Spirits
- 27 CFR Part 7: Malt Beverages
- 27 CFR Part 16: Health Warning Statements

## Future Work

1. **Batch processing** - Once data format is known
2. **Wine-specific ABV tolerance** - ±1.0% (>14% ABV) or ±1.5% (≤14% ABV)
4. **Local OCR** - OCR model could run on-premise for security and cost effectiveness, trade-off of being slower and less accurate.

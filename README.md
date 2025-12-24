# TTB Label Verification

AI-powered label verification for TTB compliance. Upload a label image, enter application data, get PASS/FAIL in under 5 seconds.


<a href="https://github.com/user-attachments/assets/1c9ba64d-ebb6-412b-b14b-70d136abdc02"><img src="https://github.com/user-attachments/assets/1c9ba64d-ebb6-412b-b14b-70d136abdc02" width="800" alt="Single Verification" /></a><br/>
<a href="https://github.com/user-attachments/assets/e434773c-65d8-4fb7-96ed-3a556c198b85"><img src="https://github.com/user-attachments/assets/e434773c-65d8-4fb7-96ed-3a556c198b85" width="800" alt="Bulk Verification" /></a><br/>
<a href="https://github.com/user-attachments/assets/9779ada8-6670-46fe-ae2a-d23740f265a2"><img src="https://github.com/user-attachments/assets/9779ada8-6670-46fe-ae2a-d23740f265a2" width="800" alt="Single Results" /></a><br/>
<a href="https://github.com/user-attachments/assets/badf3e25-d68e-4896-8ecf-947c98270463"><img src="https://github.com/user-attachments/assets/badf3e25-d68e-4896-8ecf-947c98270463" width="800" alt="Bulk Results" /></a>

## Setup

```bash
pnpm install
cp .env.example .env  # Add MISTRAL_API_KEY and OPENROUTER_API_KEY
pnpm dev              # localhost:3000
```

## Architecture

```
Image → Mistral OCR → extracted text → Gemini → field extraction → deterministic matching → results
```

The LLM extracts fields from OCR text. Code handles matching logic—not the LLM. This ensures consistent, explainable results.

## Matching Rules

| Field | Logic | Reference |
|-------|-------|-----------|
| Brand Name | Fuzzy (case, punctuation, diacritics) | — |
| Class/Type | Specific ≥ General ("Bourbon Whiskey" matches "Whisky") | T.D. TTB-158 |
| Alcohol Content | ±0.3% tolerance | 27 CFR 5.37(b) |
| Net Contents | Unit normalization (750ml = 750 ML) | — |
| Government Warning | **Exact** word-for-word, "GOVERNMENT WARNING:" in caps | 27 CFR Part 16 |

## Testing

```bash
pnpm test:unit   # 33 unit tests, no API keys
pnpm test:run    # All 43 tests (includes E2E)
```

## Key Decisions

- **~2.9s average response time** - Meets the 5-second requirement
- **Government warning auto-included** - No agent input needed, eliminates typos
- **Deterministic matching** - LLM extracts, code matches. Explainable results for regulatory compliance.
- **Simple UI** - Explicit MATCH/MISMATCH labels, large buttons, designed for agents over 50

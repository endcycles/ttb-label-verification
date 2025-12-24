/**
 * TTB Label Verification - Test Suite
 *
 * Tests the full OCR → LLM → matching pipeline with real images.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { config } from 'dotenv'
import type { LabelFormData, VerifyLabelResponse, VerifyLabelError } from '../types'
import { isAlcoholMatch, extractAlcoholPercent, isClassTypeMatch, isFuzzyMatch, isNetContentsMatch, normalizeNetContents } from '../matching'

config({ path: path.join(process.cwd(), '.env') })

// ============================================
// UNIT TESTS - Matching Functions (no API calls)
// ============================================

describe('Alcohol Content Matching', () => {
  describe('extractAlcoholPercent', () => {
    it('extracts percentage from various formats', () => {
      expect(extractAlcoholPercent('45%')).toBe(45)
      expect(extractAlcoholPercent('45.0%')).toBe(45)
      expect(extractAlcoholPercent('45.5%')).toBe(45.5)
      expect(extractAlcoholPercent('45% ABV')).toBe(45)
      expect(extractAlcoholPercent('45% Alc./Vol.')).toBe(45)
      expect(extractAlcoholPercent('45% ALC./VOL. (90 PROOF)')).toBe(45)
    })

    it('extracts from bare number (user-friendly input)', () => {
      expect(extractAlcoholPercent('45')).toBe(45)
      expect(extractAlcoholPercent('40.5')).toBe(40.5)
    })

    it('returns null for invalid input', () => {
      expect(extractAlcoholPercent('')).toBe(null)
      expect(extractAlcoholPercent('no percentage here')).toBe(null)
    })
  })

  describe('isAlcoholMatch with ±0.3% tolerance', () => {
    // PASS cases - within tolerance
    it('passes exact match', () => {
      expect(isAlcoholMatch('40%', '40%')).toBe(true)
      expect(isAlcoholMatch('45% ABV', '45% Alc./Vol.')).toBe(true)
    })

    it('passes within 0.3% tolerance', () => {
      expect(isAlcoholMatch('40%', '40.2%')).toBe(true)
      expect(isAlcoholMatch('40%', '40.3%')).toBe(true)
      expect(isAlcoholMatch('40%', '39.8%')).toBe(true)
      expect(isAlcoholMatch('40%', '39.7%')).toBe(true)
    })

    // FAIL cases - exceeds tolerance
    it('fails when difference exceeds 0.3%', () => {
      expect(isAlcoholMatch('40%', '40.5%')).toBe(false)
      expect(isAlcoholMatch('40%', '39.5%')).toBe(false)
      expect(isAlcoholMatch('40%', '45%')).toBe(false)
    })

    it('fails for empty/invalid input', () => {
      expect(isAlcoholMatch('', '40%')).toBe(false)
      expect(isAlcoholMatch('40%', '')).toBe(false)
    })

    it('passes with bare number input (user-friendly)', () => {
      // User types "45", label shows "45% Alc./Vol."
      expect(isAlcoholMatch('45', '45% Alc./Vol.')).toBe(true)
      expect(isAlcoholMatch('45', '45% ALC./VOL. (90 PROOF)')).toBe(true)
      expect(isAlcoholMatch('40', '40.2%')).toBe(true) // within tolerance
    })
  })
})

// ============================================
// NET CONTENTS MATCHING
// ============================================

describe('Net Contents Matching', () => {
  describe('normalizeNetContents', () => {
    it('normalizes various unit formats', () => {
      expect(normalizeNetContents('750 mL')).toBe('750ml')
      expect(normalizeNetContents('750ml')).toBe('750ml')
      expect(normalizeNetContents('750 ML')).toBe('750ml')
      expect(normalizeNetContents('1 L')).toBe('1l')
      expect(normalizeNetContents('1 Liter')).toBe('1l')
    })

    it('handles bare number (assumes mL)', () => {
      expect(normalizeNetContents('750')).toBe('750ml')
      expect(normalizeNetContents('375')).toBe('375ml')
    })
  })

  describe('isNetContentsMatch', () => {
    it('passes with matching values', () => {
      expect(isNetContentsMatch('750 mL', '750 ML')).toBe(true)
      expect(isNetContentsMatch('750ml', '750 mL')).toBe(true)
      expect(isNetContentsMatch('1 L', '1 Liter')).toBe(true)
    })

    it('passes with bare number input (user-friendly)', () => {
      // User types "750", label shows "750 mL"
      expect(isNetContentsMatch('750', '750 mL')).toBe(true)
      expect(isNetContentsMatch('750', '750 ML')).toBe(true)
    })

    it('fails for different amounts', () => {
      expect(isNetContentsMatch('750 mL', '1 L')).toBe(false)
      expect(isNetContentsMatch('375', '750 mL')).toBe(false)
    })
  })
})

// ============================================
// CLASS/TYPE MATCHING - Per T.D. TTB-158
// ============================================

describe('Class/Type Matching (T.D. TTB-158)', () => {
  describe('Exact match (case-insensitive)', () => {
    it('passes exact match', () => {
      expect(isClassTypeMatch('Bourbon Whiskey', 'Bourbon Whiskey')).toBe(true)
    })

    it('passes case-insensitive match', () => {
      expect(isClassTypeMatch('BOURBON WHISKEY', 'bourbon whiskey')).toBe(true)
      expect(isClassTypeMatch('Kentucky Straight Bourbon Whiskey', 'KENTUCKY STRAIGHT BOURBON WHISKEY')).toBe(true)
    })
  })

  describe('Specific ≥ General (label more specific than application)', () => {
    it('passes when label is more specific than application - Whisky hierarchy', () => {
      // Application says "Whisky", label has more specific type
      expect(isClassTypeMatch('Whisky', 'Kentucky Straight Bourbon Whiskey')).toBe(true)
      expect(isClassTypeMatch('Whisky', 'Bourbon Whiskey')).toBe(true)
      expect(isClassTypeMatch('Whisky', 'Rye Whiskey')).toBe(true)
      expect(isClassTypeMatch('Whisky', 'Tennessee Whiskey')).toBe(true)
      expect(isClassTypeMatch('Whiskey', 'Bourbon Whiskey')).toBe(true)
    })

    it('passes when label is more specific - Bourbon hierarchy', () => {
      expect(isClassTypeMatch('Bourbon Whiskey', 'Kentucky Straight Bourbon Whiskey')).toBe(true)
      expect(isClassTypeMatch('Bourbon Whiskey', 'Straight Bourbon Whiskey')).toBe(true)
    })

    it('passes when label is more specific - Agave spirits hierarchy', () => {
      expect(isClassTypeMatch('Agave Spirits', 'Tequila')).toBe(true)
      expect(isClassTypeMatch('Agave Spirits', 'Mezcal')).toBe(true)
    })

    it('passes when label is more specific - Wine hierarchy', () => {
      expect(isClassTypeMatch('Fruit Wine', 'Citrus Wine')).toBe(true)
      expect(isClassTypeMatch('Fruit Wine', 'Citrus Fruit Wine')).toBe(true)
    })
  })

  describe('"Straight" is optional per T.D. TTB-158', () => {
    it('passes when "straight" differs between application and label', () => {
      // Label says "Bourbon Whiskey", application says "Straight Bourbon Whiskey"
      expect(isClassTypeMatch('Straight Bourbon Whiskey', 'Bourbon Whiskey')).toBe(true)
      expect(isClassTypeMatch('Bourbon Whiskey', 'Straight Bourbon Whiskey')).toBe(true)

      // Same for rye
      expect(isClassTypeMatch('Straight Rye Whiskey', 'Rye Whiskey')).toBe(true)
      expect(isClassTypeMatch('Rye Whiskey', 'Straight Rye Whiskey')).toBe(true)
    })

    it('passes Kentucky variations with optional straight', () => {
      expect(isClassTypeMatch('Kentucky Bourbon Whiskey', 'Kentucky Straight Bourbon Whiskey')).toBe(true)
      expect(isClassTypeMatch('Kentucky Straight Bourbon Whiskey', 'Kentucky Bourbon Whiskey')).toBe(true)
    })
  })

  describe('Equivalent designations', () => {
    it('passes Tequila ↔ Agave Spirits', () => {
      expect(isClassTypeMatch('Tequila', 'Agave Spirits')).toBe(true)
      expect(isClassTypeMatch('Agave Spirits', 'Tequila')).toBe(true)
    })

    it('passes Mezcal ↔ Agave Spirits', () => {
      expect(isClassTypeMatch('Mezcal', 'Agave Spirits')).toBe(true)
      expect(isClassTypeMatch('Agave Spirits', 'Mezcal')).toBe(true)
    })

    it('passes Citrus Wine ↔ Fruit Wine', () => {
      expect(isClassTypeMatch('Citrus Wine', 'Fruit Wine')).toBe(true)
      expect(isClassTypeMatch('Fruit Wine', 'Citrus Wine')).toBe(true)
    })
  })

  describe('FAIL cases - unrelated types', () => {
    it('fails for completely different types', () => {
      expect(isClassTypeMatch('Bourbon Whiskey', 'Vodka')).toBe(false)
      expect(isClassTypeMatch('Tequila', 'Rum')).toBe(false)
      expect(isClassTypeMatch('Gin', 'Whisky')).toBe(false)
    })

    it('fails for different whisky subtypes', () => {
      // Rye is not Bourbon
      expect(isClassTypeMatch('Bourbon Whiskey', 'Rye Whiskey')).toBe(false)
      expect(isClassTypeMatch('Rye Whiskey', 'Bourbon Whiskey')).toBe(false)
    })

    it('fails for empty/invalid input', () => {
      expect(isClassTypeMatch('', 'Bourbon Whiskey')).toBe(false)
      expect(isClassTypeMatch('Bourbon Whiskey', '')).toBe(false)
    })
  })
})

// ============================================
// BRAND NAME MATCHING
// ============================================

describe('Brand Name Matching', () => {
  it('passes exact match', () => {
    expect(isFuzzyMatch('OLD TOM DISTILLERY', 'OLD TOM DISTILLERY')).toBe(true)
  })

  it('passes case-insensitive match', () => {
    expect(isFuzzyMatch("STONE'S THROW", "Stone's Throw")).toBe(true)
    expect(isFuzzyMatch('Old Tom Distillery', 'OLD TOM DISTILLERY')).toBe(true)
  })

  it('passes with apostrophe variations', () => {
    expect(isFuzzyMatch("Jack Daniel's", "Jack Daniels")).toBe(true)
    expect(isFuzzyMatch("MAKER'S MARK", "Makers Mark")).toBe(true)
  })

  it('passes with diacritic normalization', () => {
    expect(isFuzzyMatch('Château Margaux', 'Chateau Margaux')).toBe(true)
  })

  it('passes with whitespace normalization', () => {
    expect(isFuzzyMatch('OLD  TOM', 'OLD TOM')).toBe(true)
  })

  it('fails for different names', () => {
    expect(isFuzzyMatch('Grey Goose', 'Gray Goose')).toBe(false)
    expect(isFuzzyMatch('OLD TOM', 'OLD BOB')).toBe(false)
  })
})

const hasGroq = process.env.MISTRAL_API_KEY && process.env.GROQ_API_KEY
const hasOpenRouter = process.env.MISTRAL_API_KEY && process.env.OPENROUTER_API_KEY

// ============================================
// CONSTANTS
// ============================================

const STANDARD_WARNING = `GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.`

const CORRECT_FORM_DATA: LabelFormData = {
  brandName: 'OLD TOM DISTILLERY',
  classType: 'Kentucky Straight Bourbon Whiskey',
  alcoholContent: '45% Alc./Vol.',
  netContents: '750 mL',
  governmentWarning: STANDARD_WARNING,
}

// ============================================
// TEST CASES
// ============================================

interface TestCase {
  image: string
  description: string
  formData: LabelFormData
  expected: 'pass' | 'fail'
  expectedFailures?: string[]
}

const TEST_CASES: TestCase[] = [
  // ========== PASS CASES ==========
  {
    image: 'test-1-exact-match.jpg',
    description: 'Exact match - all fields correct',
    formData: CORRECT_FORM_DATA,
    expected: 'pass',
  },
  {
    image: 'test-2-fuzzy-match.jpg',
    description: 'Fuzzy match - case/punctuation variations should pass',
    formData: CORRECT_FORM_DATA,
    expected: 'pass',
  },

  // ========== FAIL CASES ==========
  {
    image: 'test-3-wrong-warning.jpg',
    description: 'Wrong government warning format (title case instead of ALL CAPS)',
    formData: CORRECT_FORM_DATA,
    expected: 'fail',
    expectedFailures: ['Government Warning'],
  },
  {
    image: 'test-1-exact-match.jpg',
    description: 'Wrong brand name submitted (form says DISTILLING CO, image says DISTILLERY)',
    formData: {
      ...CORRECT_FORM_DATA,
      brandName: 'OLD TOM DISTILLING CO.',
    },
    expected: 'fail',
    expectedFailures: ['Brand Name'],
  },
  {
    image: 'test-1-exact-match.jpg',
    description: 'Wrong ABV submitted (form says 40%, image shows 45%)',
    formData: {
      ...CORRECT_FORM_DATA,
      alcoholContent: '40% Alc./Vol.',
    },
    expected: 'fail',
    expectedFailures: ['Alcohol Content'],
  },
]

// ============================================
// HELPER
// ============================================

function loadImage(filename: string): { base64: string; mimeType: string } | null {
  const imagePath = path.join(process.cwd(), 'public', filename)

  if (!fs.existsSync(imagePath)) {
    return null
  }

  const buffer = fs.readFileSync(imagePath)
  const ext = path.extname(filename).toLowerCase()
  return {
    base64: buffer.toString('base64'),
    mimeType: ext === '.png' ? 'image/png' : 'image/jpeg',
  }
}

// ============================================
// E2E TESTS - Provider Comparison
// ============================================

async function runTestCase(
  testCase: TestCase,
  index: number,
  provider: string
): Promise<{ success: boolean; overall?: string; timeMs?: number }> {
  const imageData = loadImage(testCase.image)
  if (!imageData) {
    console.warn(`⚠️  Skipping: ${testCase.image} not found`)
    return { success: false }
  }

  // Dynamically import to pick up env changes
  const { verifyLabel } = await import('../verification')
  const result = await verifyLabel(imageData.base64, imageData.mimeType, testCase.formData)

  console.log(`\n[${provider.toUpperCase()}] Test ${index + 1}: ${testCase.image}`)
  if (result.success) {
    console.log(`   Result: ${result.overall.toUpperCase()} (${result.processingTimeMs}ms)`)
    result.fields.forEach((f) => {
      const icon = f.match ? '✅' : '❌'
      console.log(`   ${icon} ${f.field}: "${f.detected}"`)
    })
  } else {
    console.log(`   ❌ Error: ${result.error}`)
  }

  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.overall).toBe(testCase.expected)
    if (testCase.expectedFailures) {
      testCase.expectedFailures.forEach((fieldName) => {
        const field = result.fields.find((f) => f.field === fieldName)
        expect(field?.match, `${fieldName} should fail`).toBe(false)
      })
    }
    expect(result.processingTimeMs).toBeLessThan(20000)
    return { success: true, overall: result.overall, timeMs: result.processingTimeMs }
  }
  return { success: false }
}

// E2E Tests - Groq (gpt-oss-20b)
const describeGroq = hasGroq ? describe : describe.skip
describeGroq('E2E: Groq (gpt-oss-20b)', () => {
  beforeAll(() => {
    process.env.LLM_PROVIDER = 'groq'
  })

  TEST_CASES.forEach((testCase, index) => {
    it(`Test ${index + 1}: ${testCase.expected.toUpperCase()} - ${testCase.description}`, async () => {
      await runTestCase(testCase, index, 'groq')
    }, 30000)
  })
})

// E2E Tests - OpenRouter (Gemini 3 Flash)
const describeOpenRouter = hasOpenRouter ? describe : describe.skip
describeOpenRouter('E2E: OpenRouter (Gemini 3 Flash)', () => {
  beforeAll(() => {
    process.env.LLM_PROVIDER = 'openrouter'
  })

  TEST_CASES.forEach((testCase, index) => {
    it(`Test ${index + 1}: ${testCase.expected.toUpperCase()} - ${testCase.description}`, async () => {
      await runTestCase(testCase, index, 'openrouter')
    }, 30000)
  })
})

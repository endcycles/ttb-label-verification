export function normalize(text: string): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`'"]/g, '')
    .replace(/[.,\-():;!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isFuzzyMatch(submitted: string, detected: string): boolean {
  if (!submitted || !detected) return false
  return normalize(submitted) === normalize(detected)
}

// TTB Class/Type Hierarchy per T.D. TTB-158 and 27 CFR 5.22
const WHISKY_TYPES = [
  'bourbon whisky', 'bourbon whiskey',
  'straight bourbon whisky', 'straight bourbon whiskey',
  'kentucky bourbon whisky', 'kentucky bourbon whiskey',
  'kentucky straight bourbon whisky', 'kentucky straight bourbon whiskey',
  'rye whisky', 'rye whiskey',
  'straight rye whisky', 'straight rye whiskey',
  'wheat whisky', 'wheat whiskey',
  'malt whisky', 'malt whiskey',
  'corn whisky', 'corn whiskey',
  'tennessee whisky', 'tennessee whiskey',
]

const BOURBON_TYPES = [
  'straight bourbon whisky', 'straight bourbon whiskey',
  'kentucky bourbon whisky', 'kentucky bourbon whiskey',
  'kentucky straight bourbon whisky', 'kentucky straight bourbon whiskey',
]

const CLASS_TYPE_HIERARCHY: Record<string, string[]> = {
  'whisky': WHISKY_TYPES,
  'whiskey': WHISKY_TYPES,
  'bourbon whisky': BOURBON_TYPES,
  'bourbon whiskey': BOURBON_TYPES,
  'agave spirits': ['tequila', 'mezcal'],
  'fruit wine': ['citrus wine', 'citrus fruit wine'],
}

const EQUIVALENT_DESIGNATIONS: [string, string][] = [
  ['tequila', 'agave spirits'],
  ['mezcal', 'agave spirits'],
  ['citrus wine', 'fruit wine'],
  ['citrus fruit wine', 'fruit wine'],
]

function matchesWithOptionalStraight(submitted: string, detected: string): boolean {
  const withoutStraight = (s: string) => normalize(s).replace(/\bstraight\s*/g, '').trim()
  return withoutStraight(submitted) === withoutStraight(detected)
}

function isSpecificOfGeneral(submitted: string, detected: string): boolean {
  const validSpecifics = CLASS_TYPE_HIERARCHY[normalize(submitted)]
  if (!validSpecifics) return false
  return validSpecifics.some(specific => normalize(specific) === normalize(detected))
}

function areEquivalentDesignations(submitted: string, detected: string): boolean {
  const submittedNorm = normalize(submitted)
  const detectedNorm = normalize(detected)
  for (const [a, b] of EQUIVALENT_DESIGNATIONS) {
    if ((normalize(a) === submittedNorm && normalize(b) === detectedNorm) ||
        (normalize(b) === submittedNorm && normalize(a) === detectedNorm)) {
      return true
    }
  }
  return false
}

export function isClassTypeMatch(submitted: string, detected: string): boolean {
  if (!submitted || !detected) return false
  const submittedNorm = normalize(submitted)
  const detectedNorm = normalize(detected)

  if (submittedNorm === detectedNorm) return true
  if (isSpecificOfGeneral(submittedNorm, detectedNorm)) return true
  if (matchesWithOptionalStraight(submitted, detected)) return true
  if (areEquivalentDesignations(submitted, detected)) return true

  return false
}

const ALCOHOL_TOLERANCE = 0.3 // ±0.3% per 27 CFR 5.37(b)

/**
 * Extract alcohol percentage from text
 * Accepts: "45%", "45.0%", "45% ABV", "45% Alc./Vol.", or bare "45"
 */
export function extractAlcoholPercent(text: string): number | null {
  if (!text) return null

  // First try to match with % sign
  const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/)
  if (percentMatch) return parseFloat(percentMatch[1])

  // Fall back to bare number (user typed "45" meaning 45%)
  const bareMatch = text.trim().match(/^(\d+(?:\.\d+)?)$/)
  if (bareMatch) return parseFloat(bareMatch[1])

  return null
}

export function isAlcoholMatch(submitted: string, detected: string): boolean {
  if (!submitted || !detected) return false
  const submittedPercent = extractAlcoholPercent(submitted)
  const detectedPercent = extractAlcoholPercent(detected)

  if (submittedPercent === null || detectedPercent === null) {
    return normalize(submitted) === normalize(detected)
  }

  return Math.abs(submittedPercent - detectedPercent) <= ALCOHOL_TOLERANCE
}

/**
 * Normalize net contents for comparison
 * Accepts: "750 mL", "750ml", "750 ML", "1L", or bare "750" (assumes mL)
 */
export function normalizeNetContents(text: string): string {
  if (!text) return ''

  const trimmed = text.toLowerCase().trim()

  // Try to match number with unit
  const match = trimmed.match(/(\d+(?:\.\d+)?)\s*(ml|l|liter|liters|oz|fl\.?\s*oz\.?|gallon|gal)/i)
  if (match) {
    const amount = parseFloat(match[1])
    let unit = match[2].toLowerCase()

    if (unit === 'l' || unit === 'liter' || unit === 'liters') unit = 'l'
    else if (unit.includes('oz')) unit = 'oz'
    else if (unit === 'gal' || unit === 'gallon') unit = 'gal'

    return `${amount}${unit}`
  }

  // Fall back to bare number - assume mL (most common for spirits)
  const bareMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/)
  if (bareMatch) {
    return `${parseFloat(bareMatch[1])}ml`
  }

  return normalize(text)
}

export function isNetContentsMatch(submitted: string, detected: string): boolean {
  if (!submitted || !detected) return false
  return normalizeNetContents(submitted) === normalizeNetContents(detected)
}

function normalizeGovernmentWarning(text: string): string {
  if (!text) return ''
  return text.replace(/\s+/g, ' ').trim()
}

export function isGovernmentWarningMatch(submitted: string, detected: string): boolean {
  if (!submitted || !detected) return false
  return normalizeGovernmentWarning(submitted) === normalizeGovernmentWarning(detected)
}

export const STANDARD_GOVERNMENT_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems."

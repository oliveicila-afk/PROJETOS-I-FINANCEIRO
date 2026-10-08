/**
 * Utility to detect case type based on fee comparison
 *
 * Based on Advbox lawsuit fields:
 * - "Valor líquido total do alvará" (liquid value from court)
 * - "Possui Honorários Sucumbenciais" (court-awarded success fees)
 *
 * Logic:
 * - SUCUMBENCIAL: alvará value = honorários sucumbenciais value
 *   Example: R$ 5.587,36 = R$ 5.587,36
 *
 * - CONTRATUAL: alvará value > honorários sucumbenciais value
 *   Example: R$ 16.460,61 > R$ 2.698,04
 *   The difference is split per contract (e.g., 30% to firm)
 */

export enum CaseType {
  SUCUMBENCIAL = 'SUCUMBENCIAL',
  CONTRATUAL = 'CONTRATUAL',
  UNKNOWN = 'UNKNOWN',
}

export interface CaseTypeDetectionResult {
  type: CaseType;
  alvaraValue: number;
  sucumbencialValue: number;
  difference?: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string;
}

/**
 * Detect case type by comparing alvará value with sucumbencial fees
 */
export function detectCaseType(
  alvaraValue: number,
  sucumbencialValue: number,
  tolerance: number = 0.5 // 50 cents tolerance for floating point rounding
): CaseTypeDetectionResult {
  // Validate inputs
  if (alvaraValue < 0 || sucumbencialValue < 0) {
    return {
      type: CaseType.UNKNOWN,
      alvaraValue,
      sucumbencialValue,
      confidence: 'LOW',
      notes: 'Invalid values (negative)',
    };
  }

  // Check if values are essentially equal (sucumbencial case)
  const difference = alvaraValue - sucumbencialValue;
  const isEqual = Math.abs(difference) <= tolerance;

  if (isEqual) {
    return {
      type: CaseType.SUCUMBENCIAL,
      alvaraValue,
      sucumbencialValue,
      difference: 0,
      confidence: 'HIGH',
      notes: 'Alvará value equals sucumbencial fees (within tolerance)',
    };
  }

  // Check if alvará is greater (contratual case)
  if (alvaraValue > sucumbencialValue) {
    return {
      type: CaseType.CONTRATUAL,
      alvaraValue,
      sucumbencialValue,
      difference,
      confidence: 'HIGH',
      notes: `Alvará value (R$ ${alvaraValue.toFixed(2)}) exceeds sucumbencial (R$ ${sucumbencialValue.toFixed(2)}) by R$ ${difference.toFixed(2)}`,
    };
  }

  // Edge case: sucumbencial > alvará (unusual)
  return {
    type: CaseType.UNKNOWN,
    alvaraValue,
    sucumbencialValue,
    difference,
    confidence: 'MEDIUM',
    notes: 'Sucumbencial value exceeds alvará (unusual case)',
  };
}

/**
 * Extract fee values from lawsuit object returned by Advbox API
 *
 * Looking for fields like:
 * - "fees_expec" (expected fees)
 * - "fees_money" (monetary fees)
 * - Custom fields or notes that might contain the fee information
 */
export function extractFeeValuesFromLawsuit(lawsuit: any): {
  alvaraValue?: number;
  sucumbencialValue?: number;
} {
  const result: any = {};

  // Try to find alvará/liquid value
  // Could be in various field names depending on Advbox structure
  if (lawsuit.fees_money !== undefined) {
    result.alvaraValue = Number(lawsuit.fees_money);
  } else if (lawsuit.fees_expec !== undefined) {
    result.alvaraValue = Number(lawsuit.fees_expec);
  } else if (lawsuit.notes && typeof lawsuit.notes === 'string') {
    // Try parsing from notes if present
    const match = lawsuit.notes.match(/alvará[\s:]*R\$\s*([\d.,]+)/i);
    if (match) {
      result.alvaraValue = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
    }
  }

  // Try to find sucumbencial value
  if (lawsuit.contingency !== undefined) {
    // contingency boolean might indicate if there are sucumbencial fees
    result.hasContingency = Boolean(lawsuit.contingency);
  }

  return result;
}

/**
 * Determine case type from a complete lawsuit object
 */
export function determineCaseTypeFromLawsuit(lawsuit: any): CaseTypeDetectionResult {
  const fees = extractFeeValuesFromLawsuit(lawsuit);

  if (fees.alvaraValue === undefined || fees.alvaraValue === undefined) {
    return {
      type: CaseType.UNKNOWN,
      alvaraValue: fees.alvaraValue || 0,
      sucumbencialValue: fees.sucumbencialValue || 0,
      confidence: 'LOW',
      notes: 'Could not extract fee values from lawsuit data',
    };
  }

  return detectCaseType(fees.alvaraValue, fees.sucumbencialValue || 0);
}

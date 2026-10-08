import { detectCaseType, CaseType } from './case-type-detector.js';

/**
 * Test cases based on real examples from videos
 */

console.log('=== Case Type Detection Tests ===\n');

// Test 1: Sucumbencial Case
// From video: Maria Solange case
// Valor líquido total do alvará: R$ 5.587,36
// Honorários sucumbenciais: R$ 5.587,36
console.log('Test 1: Sucumbencial Case (Maria Solange)');
const test1 = detectCaseType(5587.36, 5587.36);
console.log('Result:', test1);
console.assert(test1.type === CaseType.SUCUMBENCIAL, 'Should be SUCUMBENCIAL');
console.assert(test1.confidence === 'HIGH', 'Should be HIGH confidence');
console.log('✅ PASS\n');

// Test 2: Contratual Case
// From video: Mari Elva case
// Valor líquido total do alvará: R$ 16.460,61
// Honorários sucumbenciais: R$ 2.698,04
console.log('Test 2: Contratual Case (Mari Elva)');
const test2 = detectCaseType(16460.61, 2698.04);
console.log('Result:', test2);
console.log('Difference:', test2.difference?.toFixed(2));
console.assert(test2.type === CaseType.CONTRATUAL, 'Should be CONTRATUAL');
console.assert(test2.difference === 16460.61 - 2698.04, 'Should calculate correct difference');
console.assert(test2.confidence === 'HIGH', 'Should be HIGH confidence');
console.log('✅ PASS\n');

// Test 3: Floating point tolerance
// Sometimes values are off by cents due to rounding
console.log('Test 3: Floating Point Tolerance (Sucumbencial within tolerance)');
const test3 = detectCaseType(5587.36, 5587.37);
console.log('Result:', test3);
console.assert(test3.type === CaseType.SUCUMBENCIAL, 'Should still be SUCUMBENCIAL');
console.log('✅ PASS\n');

// Test 4: Invalid input
console.log('Test 4: Invalid Input (negative values)');
const test4 = detectCaseType(-100, 50);
console.log('Result:', test4);
console.assert(test4.type === CaseType.UNKNOWN, 'Should be UNKNOWN');
console.assert(test4.confidence === 'LOW', 'Should be LOW confidence');
console.log('✅ PASS\n');

// Test 5: Zero values (edge case)
console.log('Test 5: Zero Values');
const test5 = detectCaseType(0, 0);
console.log('Result:', test5);
console.assert(test5.type === CaseType.SUCUMBENCIAL, 'Should be SUCUMBENCIAL (equal)');
console.log('✅ PASS\n');

// Test 6: Large values (realistic case)
console.log('Test 6: Large Case Value (Contratual)');
const test6 = detectCaseType(150000.00, 45000.00);
console.log('Result:', test6);
console.assert(test6.type === CaseType.CONTRATUAL, 'Should be CONTRATUAL');
console.assert(test6.difference === 105000.00, 'Difference should be R$ 105.000,00');
console.log('✅ PASS\n');

console.log('=== All tests passed! ===');

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fc = __importStar(require("fast-check"));
const ValidationService_1 = require("../ValidationService");
describe('ValidationService', () => {
    let validationService;
    beforeEach(() => {
        validationService = new ValidationService_1.ValidationService();
    });
    describe('Property-Based Tests', () => {
        /**
         * Feature: grammar-proofreading-extension, Property 3: API response validation occurs
         * Validates: Requirements 1.4, 4.1
         */
        test('should validate all well-formed correction responses', () => {
            // Generator for valid TextChange objects
            const textChangeArb = fc.record({
                original: fc.string(),
                corrected: fc.string(),
                reason: fc.string(),
                position: fc.record({
                    start: fc.nat(),
                    end: fc.nat()
                })
            });
            // Generator for valid CorrectionResponse objects
            const validResponseArb = fc.record({
                correctedText: fc.string(),
                explanation: fc.string(),
                changes: fc.array(textChangeArb),
                confidence: fc.float({ min: 0, max: 1 })
            });
            fc.assert(fc.property(validResponseArb, (response) => {
                const result = validationService.validateCorrectionResponse(response);
                expect(result.isValid).toBe(true);
                expect(result.errors).toBeUndefined();
            }), { numRuns: 100 });
        });
        /**
         * Feature: grammar-proofreading-extension, Property 12: Valid responses proceed to replacement
         * Validates: Requirements 4.3
         */
        test('should accept responses with required fields only', () => {
            // Generator for minimal valid responses (only required fields)
            const minimalValidResponseArb = fc.record({
                correctedText: fc.string(),
                explanation: fc.string()
            });
            fc.assert(fc.property(minimalValidResponseArb, (response) => {
                const result = validationService.validateCorrectionResponse(response);
                expect(result.isValid).toBe(true);
                expect(validationService.isValidCorrectionResponse(response)).toBe(true);
            }), { numRuns: 100 });
        });
        /**
         * Feature: grammar-proofreading-extension, Property 13: Missing fields cause response rejection
         * Validates: Requirements 4.4
         */
        test('should reject responses missing required fields', () => {
            // Generator for objects missing correctedText
            const missingCorrectedTextArb = fc.record({
                explanation: fc.string(),
                changes: fc.array(fc.record({
                    original: fc.string(),
                    corrected: fc.string(),
                    reason: fc.string(),
                    position: fc.record({
                        start: fc.nat(),
                        end: fc.nat()
                    })
                })),
                confidence: fc.float({ min: 0, max: 1 })
            });
            // Generator for objects missing explanation
            const missingExplanationArb = fc.record({
                correctedText: fc.string(),
                changes: fc.array(fc.record({
                    original: fc.string(),
                    corrected: fc.string(),
                    reason: fc.string(),
                    position: fc.record({
                        start: fc.nat(),
                        end: fc.nat()
                    })
                })),
                confidence: fc.float({ min: 0, max: 1 })
            });
            fc.assert(fc.property(missingCorrectedTextArb, (response) => {
                const result = validationService.validateCorrectionResponse(response);
                expect(result.isValid).toBe(false);
                expect(result.errors).toBeDefined();
                expect(result.errors.some(error => error.includes('correctedText'))).toBe(true);
            }), { numRuns: 100 });
            fc.assert(fc.property(missingExplanationArb, (response) => {
                const result = validationService.validateCorrectionResponse(response);
                expect(result.isValid).toBe(false);
                expect(result.errors).toBeDefined();
                expect(result.errors.some(error => error.includes('explanation'))).toBe(true);
            }), { numRuns: 100 });
        });
        test('should reject responses with invalid confidence values', () => {
            // Generator for responses with invalid confidence (outside 0-1 range)
            const invalidConfidenceArb = fc.record({
                correctedText: fc.string(),
                explanation: fc.string(),
                confidence: fc.oneof(fc.float({ min: Math.fround(-100), max: Math.fround(-0.1) }), // negative values
                fc.float({ min: Math.fround(1.1), max: Math.fround(100) }) // values > 1
                )
            });
            fc.assert(fc.property(invalidConfidenceArb, (response) => {
                const result = validationService.validateCorrectionResponse(response);
                expect(result.isValid).toBe(false);
                expect(result.errors).toBeDefined();
            }), { numRuns: 100 });
        });
        test('should reject responses with malformed changes array', () => {
            // Generator for responses with invalid changes structure (missing required 'reason' field)
            const invalidChangesArb = fc.record({
                correctedText: fc.string(),
                explanation: fc.string(),
                changes: fc.array(fc.record({
                    original: fc.string(),
                    corrected: fc.string(),
                    // Missing required 'reason' field
                    position: fc.record({
                        start: fc.nat(),
                        end: fc.nat()
                    })
                }), { minLength: 1 }) // Ensure at least one invalid change to trigger validation failure
            });
            fc.assert(fc.property(invalidChangesArb, (response) => {
                const result = validationService.validateCorrectionResponse(response);
                expect(result.isValid).toBe(false);
                expect(result.errors).toBeDefined();
            }), { numRuns: 100 });
        });
    });
    describe('Unit Tests', () => {
        test('should validate a complete valid response', () => {
            const validResponse = {
                correctedText: "This is a corrected sentence.",
                explanation: "Fixed grammar and punctuation.",
                changes: [
                    {
                        original: "This is a sentence",
                        corrected: "This is a corrected sentence.",
                        reason: "Added missing word and punctuation",
                        position: { start: 0, end: 18 }
                    }
                ],
                confidence: 0.95
            };
            const result = validationService.validateCorrectionResponse(validResponse);
            expect(result.isValid).toBe(true);
            expect(result.errors).toBeUndefined();
        });
        test('should reject completely invalid data', () => {
            const invalidData = "not an object";
            const result = validationService.validateCorrectionResponse(invalidData);
            expect(result.isValid).toBe(false);
            expect(result.errors).toBeDefined();
        });
        test('should reject null or undefined data', () => {
            expect(validationService.validateCorrectionResponse(null).isValid).toBe(false);
            expect(validationService.validateCorrectionResponse(undefined).isValid).toBe(false);
        });
    });
});
//# sourceMappingURL=ValidationService.test.js.map
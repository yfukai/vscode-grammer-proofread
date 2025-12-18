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
const vscode = __importStar(require("vscode"));
const packageJson = __importStar(require("../../package.json"));
describe('Settings Schema Tests', () => {
    describe('Package.json Configuration', () => {
        test('should define all required default prompt settings', () => {
            const config = packageJson.contributes.configuration;
            const properties = config.properties;
            // Check that all default prompt settings exist
            expect(properties['grammarProofreading.defaultPrompts.grammar']).toBeDefined();
            expect(properties['grammarProofreading.defaultPrompts.style']).toBeDefined();
            expect(properties['grammarProofreading.defaultPrompts.clarity']).toBeDefined();
            expect(properties['grammarProofreading.defaultPrompts.tone']).toBeDefined();
        });
        test('should have correct types for default prompt settings', () => {
            const properties = packageJson.contributes.configuration.properties;
            expect(properties['grammarProofreading.defaultPrompts.grammar'].type).toBe('string');
            expect(properties['grammarProofreading.defaultPrompts.style'].type).toBe('string');
            expect(properties['grammarProofreading.defaultPrompts.clarity'].type).toBe('string');
            expect(properties['grammarProofreading.defaultPrompts.tone'].type).toBe('string');
        });
        test('should have non-empty default values for all prompt settings', () => {
            const properties = packageJson.contributes.configuration.properties;
            expect(properties['grammarProofreading.defaultPrompts.grammar'].default).toBeTruthy();
            expect(properties['grammarProofreading.defaultPrompts.style'].default).toBeTruthy();
            expect(properties['grammarProofreading.defaultPrompts.clarity'].default).toBeTruthy();
            expect(properties['grammarProofreading.defaultPrompts.tone'].default).toBeTruthy();
            // Check that defaults are strings with meaningful content
            expect(typeof properties['grammarProofreading.defaultPrompts.grammar'].default).toBe('string');
            expect(properties['grammarProofreading.defaultPrompts.grammar'].default.length).toBeGreaterThan(10);
        });
        test('should have descriptions for all prompt settings', () => {
            const properties = packageJson.contributes.configuration.properties;
            expect(properties['grammarProofreading.defaultPrompts.grammar'].description).toBeTruthy();
            expect(properties['grammarProofreading.defaultPrompts.style'].description).toBeTruthy();
            expect(properties['grammarProofreading.defaultPrompts.clarity'].description).toBeTruthy();
            expect(properties['grammarProofreading.defaultPrompts.tone'].description).toBeTruthy();
            // Check that descriptions are meaningful
            expect(properties['grammarProofreading.defaultPrompts.grammar'].description).toContain('grammar');
            expect(properties['grammarProofreading.defaultPrompts.style'].description).toContain('style');
            expect(properties['grammarProofreading.defaultPrompts.clarity'].description).toContain('clarity');
            expect(properties['grammarProofreading.defaultPrompts.tone'].description).toContain('tone');
        });
        test('should use multilineText edit presentation for prompt settings', () => {
            const properties = packageJson.contributes.configuration.properties;
            expect(properties['grammarProofreading.defaultPrompts.grammar'].editPresentation).toBe('multilineText');
            expect(properties['grammarProofreading.defaultPrompts.style'].editPresentation).toBe('multilineText');
            expect(properties['grammarProofreading.defaultPrompts.clarity'].editPresentation).toBe('multilineText');
            expect(properties['grammarProofreading.defaultPrompts.tone'].editPresentation).toBe('multilineText');
        });
    });
    describe('VSCode Configuration Integration', () => {
        test('should be able to read default prompt configurations', () => {
            const config = vscode.workspace.getConfiguration('grammarProofreading');
            // These should not throw errors when accessed
            expect(() => config.get('defaultPrompts.grammar')).not.toThrow();
            expect(() => config.get('defaultPrompts.style')).not.toThrow();
            expect(() => config.get('defaultPrompts.clarity')).not.toThrow();
            expect(() => config.get('defaultPrompts.tone')).not.toThrow();
        });
        test('should return default values when no custom configuration is set', () => {
            const config = vscode.workspace.getConfiguration('grammarProofreading');
            // Get the default values from package.json
            const properties = packageJson.contributes.configuration.properties;
            const expectedGrammarDefault = properties['grammarProofreading.defaultPrompts.grammar'].default;
            // The configuration should return the default value
            const grammarPrompt = config.get('defaultPrompts.grammar');
            expect(grammarPrompt).toBe(expectedGrammarDefault);
        });
        test('should validate configuration section exists', () => {
            const config = packageJson.contributes.configuration;
            expect(config).toBeDefined();
            expect(config.title).toBe('Grammar Proofreading');
            expect(config.properties).toBeDefined();
            expect(Object.keys(config.properties).length).toBeGreaterThan(0);
        });
    });
    describe('Default Prompt Content Validation', () => {
        test('should have meaningful content in default prompts', () => {
            const properties = packageJson.contributes.configuration.properties;
            // Grammar prompt should mention grammar-related terms
            const grammarPrompt = properties['grammarProofreading.defaultPrompts.grammar'].default;
            expect(grammarPrompt.toLowerCase()).toMatch(/grammar|subject|verb|tense|punctuation/);
            // Style prompt should mention style-related terms
            const stylePrompt = properties['grammarProofreading.defaultPrompts.style'].default;
            expect(stylePrompt.toLowerCase()).toMatch(/style|vocabulary|flow|tone|readability/);
            // Clarity prompt should mention clarity-related terms
            const clarityPrompt = properties['grammarProofreading.defaultPrompts.clarity'].default;
            expect(clarityPrompt.toLowerCase()).toMatch(/clarity|clear|simple|ambiguity|understandable/);
            // Tone prompt should mention tone-related terms
            const tonePrompt = properties['grammarProofreading.defaultPrompts.tone'].default;
            expect(tonePrompt.toLowerCase()).toMatch(/tone|formal|voice|audience|professional/);
        });
        test('should have structured format in default prompts', () => {
            const properties = packageJson.contributes.configuration.properties;
            // All prompts should have some structure (bullet points or instructions)
            const grammarPrompt = properties['grammarProofreading.defaultPrompts.grammar'].default;
            const stylePrompt = properties['grammarProofreading.defaultPrompts.style'].default;
            const clarityPrompt = properties['grammarProofreading.defaultPrompts.clarity'].default;
            const tonePrompt = properties['grammarProofreading.defaultPrompts.tone'].default;
            // Check for structured content (bullet points or line breaks)
            expect(grammarPrompt).toMatch(/[-•]\s|:\n/);
            expect(stylePrompt).toMatch(/[-•]\s|:\n/);
            expect(clarityPrompt).toMatch(/[-•]\s|:\n/);
            expect(tonePrompt).toMatch(/[-•]\s|:\n/);
        });
    });
});
//# sourceMappingURL=settingsSchema.test.js.map
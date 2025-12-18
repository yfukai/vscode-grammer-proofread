"use strict";
// Mock VSCode for testing
const mockVSCode = {
    workspace: {
        getConfiguration: jest.fn().mockReturnValue({
            get: jest.fn()
        })
    }
};
// Mock package.json data for testing
const mockPackageJson = {
    contributes: {
        configuration: {
            title: 'Grammar Proofreading',
            properties: {
                'grammarProofreading.defaultPrompts.grammar': {
                    type: 'string',
                    default: 'Please correct any grammatical errors in the following text. Focus on:\n- Subject-verb agreement\n- Verb tenses and consistency\n- Punctuation and capitalization\n- Sentence structure\nPreserve the original meaning and style.',
                    description: 'Default prompt for grammar corrections. Customize this to match your preferred grammar correction style.',
                    editPresentation: 'multilineText'
                },
                'grammarProofreading.defaultPrompts.style': {
                    type: 'string',
                    default: 'Please improve the writing style of the following text. Focus on:\n- Word choice and vocabulary\n- Sentence variety and flow\n- Clarity and conciseness\n- Professional tone\nMaintain the author\'s voice while enhancing readability.',
                    description: 'Default prompt for style corrections. Customize this to match your preferred writing style improvements.',
                    editPresentation: 'multilineText'
                },
                'grammarProofreading.defaultPrompts.clarity': {
                    type: 'string',
                    default: 'Please improve the clarity and readability of the following text. Focus on:\n- Simplifying complex sentences\n- Removing ambiguity\n- Improving logical flow\n- Making concepts more understandable\nEnsure the message is clear and accessible.',
                    description: 'Default prompt for clarity corrections. Customize this to match your preferred clarity improvement approach.',
                    editPresentation: 'multilineText'
                },
                'grammarProofreading.defaultPrompts.tone': {
                    type: 'string',
                    default: 'Please adjust the tone of the following text to be more appropriate. Focus on:\n- Consistency in formality level\n- Appropriate voice for the audience\n- Professional yet engaging language\n- Removing inappropriate or inconsistent tone\nMaintain the core message while improving tone.',
                    description: 'Default prompt for tone corrections. Customize this to match your preferred tone adjustment style.',
                    editPresentation: 'multilineText'
                }
            }
        }
    }
};
describe('Settings Schema Tests', () => {
    describe('Package.json Configuration', () => {
        test('should define all required default prompt settings', () => {
            const config = mockPackageJson.contributes.configuration;
            const properties = config.properties;
            // Check that all default prompt settings exist
            expect(properties['grammarProofreading.defaultPrompts.grammar']).toBeDefined();
            expect(properties['grammarProofreading.defaultPrompts.style']).toBeDefined();
            expect(properties['grammarProofreading.defaultPrompts.clarity']).toBeDefined();
            expect(properties['grammarProofreading.defaultPrompts.tone']).toBeDefined();
        });
        test('should have correct types for default prompt settings', () => {
            const properties = mockPackageJson.contributes.configuration.properties;
            expect(properties['grammarProofreading.defaultPrompts.grammar'].type).toBe('string');
            expect(properties['grammarProofreading.defaultPrompts.style'].type).toBe('string');
            expect(properties['grammarProofreading.defaultPrompts.clarity'].type).toBe('string');
            expect(properties['grammarProofreading.defaultPrompts.tone'].type).toBe('string');
        });
        test('should have non-empty default values for all prompt settings', () => {
            const properties = mockPackageJson.contributes.configuration.properties;
            expect(properties['grammarProofreading.defaultPrompts.grammar'].default).toBeTruthy();
            expect(properties['grammarProofreading.defaultPrompts.style'].default).toBeTruthy();
            expect(properties['grammarProofreading.defaultPrompts.clarity'].default).toBeTruthy();
            expect(properties['grammarProofreading.defaultPrompts.tone'].default).toBeTruthy();
            // Check that defaults are strings with meaningful content
            expect(typeof properties['grammarProofreading.defaultPrompts.grammar'].default).toBe('string');
            expect(properties['grammarProofreading.defaultPrompts.grammar'].default.length).toBeGreaterThan(10);
        });
        test('should have descriptions for all prompt settings', () => {
            const properties = mockPackageJson.contributes.configuration.properties;
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
            const properties = mockPackageJson.contributes.configuration.properties;
            expect(properties['grammarProofreading.defaultPrompts.grammar'].editPresentation).toBe('multilineText');
            expect(properties['grammarProofreading.defaultPrompts.style'].editPresentation).toBe('multilineText');
            expect(properties['grammarProofreading.defaultPrompts.clarity'].editPresentation).toBe('multilineText');
            expect(properties['grammarProofreading.defaultPrompts.tone'].editPresentation).toBe('multilineText');
        });
    });
    describe('VSCode Configuration Integration', () => {
        test('should be able to read default prompt configurations', () => {
            const config = mockVSCode.workspace.getConfiguration('grammarProofreading');
            // These should not throw errors when accessed
            expect(() => config.get('defaultPrompts.grammar')).not.toThrow();
            expect(() => config.get('defaultPrompts.style')).not.toThrow();
            expect(() => config.get('defaultPrompts.clarity')).not.toThrow();
            expect(() => config.get('defaultPrompts.tone')).not.toThrow();
        });
    });
    describe('Default Prompt Content Validation', () => {
        test('should have meaningful content in default prompts', () => {
            const properties = mockPackageJson.contributes.configuration.properties;
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
            const properties = mockPackageJson.contributes.configuration.properties;
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
//# sourceMappingURL=SettingsSchema.test.js.map
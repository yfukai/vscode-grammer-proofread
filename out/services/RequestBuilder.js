"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestBuilder = void 0;
class RequestBuilder {
    buildCorrectionRequest(correctionRequest, maxTokens, temperature) {
        const systemPrompt = this.buildSystemPrompt(correctionRequest.promptName);
        const userPrompt = this.buildUserPrompt(correctionRequest.prompt, correctionRequest.text);
        return {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: userPrompt
                }
            ],
            max_tokens: maxTokens,
            temperature: temperature
        };
    }
    buildSystemPrompt(correctionType) {
        const basePrompt = `You are a professional writing assistant. Your task is to improve the provided text and return a JSON response with the following structure:
{
  "correctedText": "The improved version of the text",
  "explanation": "A clear explanation of the changes made",
  "changes": [
    {
      "original": "original text segment",
      "corrected": "corrected text segment", 
      "reason": "reason for the change",
      "position": {"start": 0, "end": 10}
    }
  ],
  "confidence": 0.95
}`;
        switch (correctionType) {
            case 'grammar':
                return `${basePrompt}\n\nFocus specifically on grammar corrections: fix grammatical errors, verb tenses, subject-verb agreement, punctuation, and sentence structure.`;
            case 'style':
                return `${basePrompt}\n\nFocus specifically on style improvements: enhance clarity, flow, word choice, sentence variety, and overall readability while maintaining the author's voice.`;
            case 'clarity':
                return `${basePrompt}\n\nFocus specifically on clarity improvements: simplify complex sentences, remove ambiguity, improve logical flow, and make the text more understandable.`;
            case 'tone':
                return `${basePrompt}\n\nFocus specifically on tone adjustments: ensure appropriate formality level, consistency in voice, and proper tone for the intended audience.`;
            default:
                return basePrompt;
        }
    }
    buildUserPrompt(customPrompt, text) {
        if (customPrompt && customPrompt.trim() !== '') {
            return `${customPrompt}\n\nText to improve:\n${text}`;
        }
        return `Please improve the following text:\n\n${text}`;
    }
}
exports.RequestBuilder = RequestBuilder;
//# sourceMappingURL=RequestBuilder.js.map
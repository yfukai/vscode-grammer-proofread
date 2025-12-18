import { CorrectionRequest } from '../models/CorrectionRequest';

export interface APIRequest {
    model: string;
    messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
    }>;
    max_tokens: number;
    temperature: number;
}

export class RequestBuilder {
    buildCorrectionRequest(correctionRequest: CorrectionRequest, maxTokens: number, temperature: number): APIRequest {
        const systemPrompt = this.buildSystemPrompt(correctionRequest.correctionType);
        const userPrompt = this.buildUserPrompt(correctionRequest.prompt, correctionRequest.text);

        return {
            model: 'gpt-3.5-turbo', // This will be overridden by the actual model from config
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

    private buildSystemPrompt(correctionType: string): string {
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

    private buildUserPrompt(customPrompt: string, text: string): string {
        if (customPrompt && customPrompt.trim() !== '') {
            return `${customPrompt}\n\nText to improve:\n${text}`;
        }
        return `Please improve the following text:\n\n${text}`;
    }
}
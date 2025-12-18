import { CorrectionResponse } from '../models/CorrectionResponse';
import { ValidationService } from './ValidationService';

export interface APIResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

export class ResponseParser {
    private validationService: ValidationService;

    constructor() {
        this.validationService = new ValidationService();
    }

    parseResponse(apiResponse: APIResponse): { success: boolean; data?: CorrectionResponse; error?: string } {
        try {
            if (!apiResponse.choices || apiResponse.choices.length === 0) {
                return { success: false, error: 'No response choices available' };
            }

            const content = apiResponse.choices[0].message.content;
            if (!content) {
                return { success: false, error: 'Empty response content' };
            }

            // Try to parse JSON from the response
            let parsedContent: any;
            try {
                // Sometimes the response might have extra text around the JSON, so we try to extract it
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsedContent = JSON.parse(jsonMatch[0]);
                } else {
                    parsedContent = JSON.parse(content);
                }
            } catch (parseError) {
                return { success: false, error: 'Failed to parse JSON response' };
            }

            // Validate the parsed content against our schema
            const validation = this.validationService.validateCorrectionResponse(parsedContent);
            if (!validation.isValid) {
                return { 
                    success: false, 
                    error: `Invalid response format: ${validation.errors?.join(', ')}` 
                };
            }

            return { success: true, data: parsedContent as CorrectionResponse };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown parsing error' 
            };
        }
    }
}
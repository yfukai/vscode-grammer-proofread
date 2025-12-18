import fetch from 'node-fetch';
import { CorrectionRequest } from '../models/CorrectionRequest';
import { CorrectionResponse } from '../models/CorrectionResponse';
import { RequestBuilder, APIRequest } from './RequestBuilder';
import { ResponseParser, APIResponse } from './ResponseParser';
import { ExtensionConfiguration } from '../models/ExtensionConfiguration';

export class LLMApiClient {
    private requestBuilder: RequestBuilder;
    private responseParser: ResponseParser;

    constructor() {
        this.requestBuilder = new RequestBuilder();
        this.responseParser = new ResponseParser();
    }

    async sendCorrectionRequest(
        correctionRequest: CorrectionRequest, 
        config: ExtensionConfiguration
    ): Promise<{ success: boolean; data?: CorrectionResponse; error?: string }> {
        try {
            // Build the API request
            const apiRequest = this.requestBuilder.buildCorrectionRequest(
                correctionRequest,
                config.maxTokens,
                config.temperature
            );

            // Override model from config
            apiRequest.model = config.model;

            // Make the API call
            const response = await fetch(config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify(apiRequest)
            });

            if (!response.ok) {
                const errorText = await response.text();
                return { 
                    success: false, 
                    error: `API request failed with status ${response.status}: ${errorText}` 
                };
            }

            const apiResponse = await response.json() as APIResponse;
            
            // Parse and validate the response
            return this.responseParser.parseResponse(apiResponse);

        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Network error occurred' 
            };
        }
    }
}
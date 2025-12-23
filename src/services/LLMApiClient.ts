import { LLMApiConfiguration } from '../types';

// Type declaration for fetch in case it's not available globally
declare global {
    function fetch(input: string, init?: any): Promise<any>;
}

/**
 * Client for communicating with OpenAI-compatible LLM APIs
 * Handles request building, response parsing, and error handling
 */
export class LLMApiClient {
    private configuration: LLMApiConfiguration;

    constructor(configuration: LLMApiConfiguration) {
        this.configuration = configuration;
    }

    /**
     * Sends a correction request to the LLM API
     * @param prompt Combined prompt text (custom + shared)
     * @param text Text to be corrected
     * @returns Promise resolving to corrected text
     * @throws Error for API failures, network issues, or invalid responses
     */
    async sendRequest(prompt: string, text: string): Promise<string> {
        console.log('[LLMApiClient] Starting API request...');
        console.log('[LLMApiClient] Endpoint:', this.configuration.endpoint);
        console.log('[LLMApiClient] Model:', this.configuration.model);
        console.log('[LLMApiClient] API Key present:', !!this.configuration.apiKey);
        
        // Validate configuration before making request
        const validationErrors = this.validateConfiguration();
        if (validationErrors.length > 0) {
            console.error('[LLMApiClient] Configuration validation failed:', validationErrors);
            throw new Error(`Invalid API configuration: ${validationErrors.join(', ')}`);
        }

        // Build request payload
        const requestBody = this.buildRequestPayload(prompt, text);
        console.log('[LLMApiClient] Request payload:', {
            model: requestBody.model,
            messagesCount: requestBody.messages.length,
            maxTokens: requestBody.max_tokens,
            temperature: requestBody.temperature
        });

        try {
            // Check if fetch is available (browser/Node 18+) or use a polyfill
            if (typeof fetch === 'undefined') {
                console.error('[LLMApiClient] Fetch API not available');
                throw new Error('Fetch API not available. Please ensure you are running in a compatible environment.');
            }

            console.log('[LLMApiClient] Making fetch request...');
            const response = await fetch(this.configuration.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.configuration.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            console.log('[LLMApiClient] Response status:', response.status);
            console.log('[LLMApiClient] Response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[LLMApiClient] API error response:', errorText);
                throw new Error(`API request failed with status ${response.status}: ${errorText}`);
            }

            const responseData = await response.json();
            console.log('[LLMApiClient] Response data structure:', {
                hasChoices: !!responseData.choices,
                choicesLength: responseData.choices?.length || 0,
                firstChoiceHasMessage: !!responseData.choices?.[0]?.message,
                firstChoiceHasContent: !!responseData.choices?.[0]?.message?.content
            });
            
            const result = this.parseResponse(responseData);
            console.log('[LLMApiClient] Successfully parsed response, length:', result.length);
            return result;

        } catch (error) {
            console.error('[LLMApiClient] Request failed:', error);
            if (error instanceof Error) {
                // Add more specific error information
                if (error.message.includes('fetch')) {
                    throw new Error(`Network connection failed: ${error.message}. Check your internet connection and API endpoint.`);
                }
                throw error;
            }
            throw new Error(`Network error: ${String(error)}`);
        }
    }

    /**
     * Validates the current API configuration
     * @returns Array of validation error messages (empty if valid)
     */
    validateConfiguration(): string[] {
        const errors: string[] = [];

        // Validate endpoint URL
        if (!this.configuration.endpoint || this.configuration.endpoint.trim().length === 0) {
            errors.push('API endpoint is required');
        } else {
            try {
                const url = new URL(this.configuration.endpoint);
                if (!['http:', 'https:'].includes(url.protocol)) {
                    errors.push('API endpoint must use HTTP or HTTPS protocol');
                }
            } catch {
                errors.push('API endpoint must be a valid URL');
            }
        }

        // Validate API key
        if (!this.configuration.apiKey || this.configuration.apiKey.trim().length === 0) {
            errors.push('API key is required');
        }

        // Validate model
        if (!this.configuration.model || this.configuration.model.trim().length === 0) {
            errors.push('Model is required');
        }

        // Validate numeric values
        if (this.configuration.maxTokens <= 0) {
            errors.push('Max tokens must be greater than 0');
        }

        if (this.configuration.maxTokens > 100000) {
            errors.push('Max tokens must not exceed 100000');
        }

        if (this.configuration.temperature < 0 || this.configuration.temperature > 2) {
            errors.push('Temperature must be between 0 and 2');
        }

        return errors;
    }

    /**
     * Updates the API configuration
     * @param newConfiguration New configuration to use
     */
    updateConfiguration(newConfiguration: LLMApiConfiguration): void {
        this.configuration = { ...newConfiguration };
    }

    /**
     * Gets the current configuration
     * @returns Copy of current LLMApiConfiguration
     */
    getConfiguration(): LLMApiConfiguration {
        return { ...this.configuration };
    }

    /**
     * Builds the request payload for the API call
     * @param prompt Combined prompt text
     * @param text Text to be corrected
     * @returns Request payload object
     */
    private buildRequestPayload(prompt: string, text: string): any {
        return {
            model: this.configuration.model,
            messages: [
                {
                    role: 'system',
                    content: prompt
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            max_tokens: this.configuration.maxTokens,
            temperature: this.configuration.temperature
        };
    }

    /**
     * Parses the API response and extracts corrected text
     * @param responseData Raw API response data
     * @returns Corrected text content
     * @throws Error if response format is invalid
     */
    private parseResponse(responseData: any): string {
        try {
            // Handle OpenAI-compatible response format
            if (!responseData.choices || !Array.isArray(responseData.choices) || responseData.choices.length === 0) {
                throw new Error('Invalid response format: no choices found');
            }

            const firstChoice = responseData.choices[0];
            if (!firstChoice.message || !firstChoice.message.content) {
                throw new Error('Invalid response format: no message content found');
            }

            const correctedText = firstChoice.message.content.trim();
            if (correctedText.length === 0) {
                throw new Error('API returned empty response');
            }

            return correctedText;

        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`Failed to parse API response: ${String(error)}`);
        }
    }

    /**
     * Tests the API connection with a simple request
     * @returns Promise resolving to true if connection successful
     * @throws Error if connection fails
     */
    async testConnection(): Promise<boolean> {
        const testPrompt = 'Please respond with "Connection successful" if you receive this message.';
        const testText = 'Test message';
        
        try {
            const response = await this.sendRequest(testPrompt, testText);
            return response.length > 0;
        } catch (error) {
            throw new Error(`Connection test failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMApiClient = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const RequestBuilder_1 = require("./RequestBuilder");
const ResponseParser_1 = require("./ResponseParser");
class LLMApiClient {
    constructor() {
        this.requestBuilder = new RequestBuilder_1.RequestBuilder();
        this.responseParser = new ResponseParser_1.ResponseParser();
    }
    async sendCorrectionRequest(correctionRequest, config) {
        try {
            // Build the API request
            const apiRequest = this.requestBuilder.buildCorrectionRequest(correctionRequest, config.maxTokens, config.temperature);
            // Override model from config
            apiRequest.model = config.model;
            // Make the API call
            const response = await (0, node_fetch_1.default)(config.apiEndpoint, {
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
            const apiResponse = await response.json();
            // Parse and validate the response
            return this.responseParser.parseResponse(apiResponse);
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    }
}
exports.LLMApiClient = LLMApiClient;
//# sourceMappingURL=LLMApiClient.js.map
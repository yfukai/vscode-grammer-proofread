export interface CorrectionRequest {
    text: string;
    prompt: string;
    promptName: string;
    isSelection: boolean;
    selectionRange?: {
        start: number;
        end: number;
    };
    apiEndpoint: string;
    apiKey: string;
}
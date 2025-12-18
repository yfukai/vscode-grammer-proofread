export interface CustomPrompt {
    name: string;
    prompt: string;
    correctionType: string;
}

export interface ExtensionConfiguration {
    apiEndpoint: string;
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    customPrompts: CustomPrompt[];
}
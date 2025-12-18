export interface CustomPrompt {
    name: string;
    prompt: string;
    correctionType: string;
    description?: string;
}

export interface DefaultPromptConfiguration {
    grammar: string;
    style: string;
    clarity: string;
    tone: string;
    [key: string]: string; // Allow indexing with string keys
}

export interface ExtensionConfiguration {
    apiEndpoint: string;
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    customPrompts: CustomPrompt[];
    defaultPrompts: DefaultPromptConfiguration;
}
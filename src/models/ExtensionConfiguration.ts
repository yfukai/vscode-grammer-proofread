import { NamePromptPair } from './NamePromptPair';

export interface ExtensionConfiguration {
    apiEndpoint: string;
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    customPrompts: NamePromptPair[];
}